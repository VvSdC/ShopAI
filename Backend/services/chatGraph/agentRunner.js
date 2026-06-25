import { getMaxTokensForRoute } from '../../constants/chatLimits.js'
import {
  chatCompletion,
  sanitizeMessagesForLlmApi,
  streamChatCompletion,
} from '../llmService.js'
import { patchLlmUsageContext } from '../llmUsageContext.js'
import { executeTool } from '../chatTools.js'
import { getAgentSystemPrompt, shouldIncludePolicyKnowledge } from './agentPrompts.js'
import { getToolsForRoute } from './toolSets.js'
import { serializeToolResultForLlm } from './toolResultCompact.js'
import { emitChatStreamEvent, isChatStreamActive } from '../chatStreamContext.js'
import { mergeToolCallDeltas, toolStatusLabel } from '../chatStream.js'
import logger from '../../utils/logger.js'

const MAX_TOOL_ROUNDS = 7

const FALLBACK_REPLY =
  "I'm sorry, I wasn't able to find what you're looking for. Could you try rephrasing your question? For example, you can ask me to search for a specific product name, check your orders, or find active coupons."

async function completeAgentRound(messages, tools, maxTokens, round) {
  const useStream = isChatStreamActive()

  if (!useStream) {
    const response = await chatCompletion(messages, tools.length ? tools : undefined, { maxTokens })
    return { response }
  }

  try {
    const streamed = await consumeStreamedRound(messages, tools, maxTokens, round)
    return streamed
  } catch (err) {
    logger.warn(`[agentRunner] stream round ${round + 1} failed, using non-streaming:`, err.message)
    const response = await chatCompletion(messages, tools.length ? tools : undefined, { maxTokens })
    return { response, streamed: false }
  }
}

async function consumeStreamedRound(messages, tools, maxTokens, round) {
  const toolCallsByIndex = {}
  let content = ''
  let sawToolCalls = false

  for await (const chunk of streamChatCompletion(messages, tools.length ? tools : undefined, {
    maxTokens,
  })) {
    const delta = chunk.choices?.[0]?.delta
    if (!delta) continue

    if (delta.tool_calls?.length) {
      sawToolCalls = true
      mergeToolCallDeltas(toolCallsByIndex, delta.tool_calls)
    }

    if (delta.content && !sawToolCalls) {
      content += delta.content
      emitChatStreamEvent({ type: 'text_delta', delta: delta.content, round: round + 1 })
    } else if (delta.content) {
      content += delta.content
    }
  }

  if (sawToolCalls) {
    const tool_calls = Object.values(toolCallsByIndex).filter((tc) => tc?.function?.name)
    return {
      assistantMessage: {
        role: 'assistant',
        content: content || null,
        tool_calls,
      },
      streamed: true,
    }
  }

  return {
    reply: content || FALLBACK_REPLY,
    streamed: true,
  }
}

function extractAssistantMessage(result) {
  if (result.reply != null) {
    return { kind: 'text', reply: result.reply }
  }

  if (result.assistantMessage) {
    return { kind: 'assistant', message: result.assistantMessage }
  }

  const choice = result.response?.choices?.[0]
  if (!choice?.message) {
    throw new Error('No response from AI service')
  }

  const assistantMessage = choice.message
  if (assistantMessage.tool_calls?.length) {
    return { kind: 'assistant', message: assistantMessage }
  }

  const reply =
    assistantMessage.content || "I'm sorry, I couldn't generate a response. Please try again."

  if (isChatStreamActive() && assistantMessage.content && result.streamed === false) {
    emitChatStreamEvent({ type: 'text_delta', delta: reply })
  }

  return { kind: 'text', reply }
}

export async function runAgentWithTools(state, route) {
  const tools = getToolsForRoute(route)
  const promptOptions =
    route === 'policies'
      ? { includePolicyKnowledge: shouldIncludePolicyKnowledge(state.history) }
      : {}
  const systemPrompt = getAgentSystemPrompt(route, state.userName, promptOptions)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...state.history,
    { role: 'user', content: state.userText },
  ]

  const toolResults = []
  const toolsUsed = []
  const maxTokens = getMaxTokensForRoute(route)
  let response

  emitChatStreamEvent({ type: 'route', route })

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    patchLlmUsageContext({ span: `agent:${route}:round-${round + 1}` })
    const roundResult = await completeAgentRound(messages, tools, maxTokens, round)
    response = roundResult.response
    const parsed = extractAssistantMessage(roundResult)

    if (parsed.kind === 'text') {
      return { reply: parsed.reply, messages, toolResults, toolsUsed }
    }

    const assistantMessage = parsed.message
    messages.push(sanitizeMessagesForLlmApi([assistantMessage])[0])

    for (const toolCall of assistantMessage.tool_calls) {
      const fnName = toolCall.function.name
      if (!toolsUsed.includes(fnName)) toolsUsed.push(fnName)

      emitChatStreamEvent({
        type: 'tool_start',
        toolName: fnName,
        label: toolStatusLabel(fnName),
        round: round + 1,
      })

      let fnArgs = {}
      try {
        fnArgs = JSON.parse(toolCall.function.arguments || '{}')
      } catch {
        fnArgs = {}
      }

      const result = await executeTool(fnName, state.userId, fnArgs)
      toolResults.push({ ...result, toolName: fnName })

      emitChatStreamEvent({
        type: 'tool_end',
        toolName: fnName,
        round: round + 1,
        ok: !result?.error,
      })

      messages.push({
        role: 'tool',
        tool_call_id: toolCall.id,
        content: serializeToolResultForLlm(fnName, result),
      })
    }
  }

  const reply = response?.choices?.[0]?.message?.content || FALLBACK_REPLY
  if (isChatStreamActive() && reply) {
    emitChatStreamEvent({ type: 'text_delta', delta: reply })
  }
  return { reply, messages, toolResults, toolsUsed }
}
