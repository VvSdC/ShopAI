import { chatCompletion } from '../llmService.js'
import { patchLlmUsageContext } from '../llmUsageContext.js'
import { executeTool } from '../chatTools.js'
import { getAgentSystemPrompt } from './agentPrompts.js'
import { getToolsForRoute } from './toolSets.js'
import { serializeToolResultForLlm } from './toolResultCompact.js'

const MAX_TOOL_ROUNDS = 7

const FALLBACK_REPLY =
  "I'm sorry, I wasn't able to find what you're looking for. Could you try rephrasing your question? For example, you can ask me to search for a specific product name, check your orders, or find active coupons."

export async function runAgentWithTools(state, route) {
  const tools = getToolsForRoute(route)
  const systemPrompt = getAgentSystemPrompt(route, state.userName)
  const messages = [
    { role: 'system', content: systemPrompt },
    ...state.history,
    { role: 'user', content: state.userText },
  ]

  const toolResults = []
  const toolsUsed = []
  let response

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    patchLlmUsageContext({ span: `agent:${route}:round-${round + 1}` })
    response = await chatCompletion(messages, tools.length ? tools : undefined)
    const choice = response.choices?.[0]
    if (!choice) throw new Error('No response from AI service')

    const assistantMessage = choice.message

    if (assistantMessage.tool_calls?.length) {
      messages.push(assistantMessage)

      for (const toolCall of assistantMessage.tool_calls) {
        const fnName = toolCall.function.name
        if (!toolsUsed.includes(fnName)) toolsUsed.push(fnName)

        let fnArgs = {}
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || '{}')
        } catch {
          fnArgs = {}
        }

        const result = await executeTool(fnName, state.userId, fnArgs)
        toolResults.push({ ...result, toolName: fnName })

        messages.push({
          role: 'tool',
          tool_call_id: toolCall.id,
          content: serializeToolResultForLlm(fnName, result),
        })
      }
      continue
    }

    const reply =
      assistantMessage.content || "I'm sorry, I couldn't generate a response. Please try again."

    return { reply, messages, toolResults, toolsUsed }
  }

  const reply = response?.choices?.[0]?.message?.content || FALLBACK_REPLY
  return { reply, messages, toolResults, toolsUsed }
}
