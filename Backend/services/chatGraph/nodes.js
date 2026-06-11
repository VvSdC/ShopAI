import { REFUSE_MESSAGES } from './guard.js'
import { runAgentWithTools } from './agentRunner.js'
import { executeTool } from '../chatTools.js'
import { getAgentSystemPrompt } from './agentPrompts.js'
import { resolveProductIdFromContext } from './productContext.js'
import { buildProductDetailReply, formatAgentReply } from '../chatPostProcess.js'
import { serializeToolResultForLlm } from './toolResultCompact.js'

export async function refuseNode(state) {
  const reply =
    REFUSE_MESSAGES[state.guardReason] || REFUSE_MESSAGES.off_topic
  return { reply }
}

export function makeAgentNode(route) {
  return async function agentNode(state) {
    const result = await runAgentWithTools(state, route)
    return {
      reply: result.reply,
      messages: result.messages,
      toolResults: result.toolResults,
      toolsUsed: result.toolsUsed,
    }
  }
}

export async function productDetailNode(state) {
  const productId = resolveProductIdFromContext(state.history, state.userText)

  if (productId) {
    const result = await executeTool('get_product_details', state.userId, {
      product_id: productId,
    })

    if (!result.error) {
      const messages = [
        { role: 'system', content: getAgentSystemPrompt('product_detail', state.userName) },
        ...state.history,
        { role: 'user', content: state.userText },
        {
          role: 'tool',
          tool_call_id: 'product_detail_direct',
          content: serializeToolResultForLlm('get_product_details', result),
        },
      ]

      return {
        reply: buildProductDetailReply(result),
        messages,
        toolResults: [{ ...result, toolName: 'get_product_details' }],
        toolsUsed: ['get_product_details'],
      }
    }
  }

  const fallback = await runAgentWithTools(state, 'product_detail')
  return {
    reply: fallback.reply,
    messages: fallback.messages,
    toolResults: fallback.toolResults,
    toolsUsed: fallback.toolsUsed,
  }
}

export async function formatNode(state) {
  const reply = formatAgentReply(state.reply, state.messages || [], state.userText)
  return { reply }
}
