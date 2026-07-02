import { REFUSE_MESSAGES } from './guard.js'
import { runAgentWithTools } from './agentRunner.js'
import { executeTool } from '../chatTools.js'
import { buildAgentSystemPromptWithContext } from './agentPrompts.js'
import { resolveProductIdFromContext } from './productContext.js'
import { buildProductDetailReply, formatAgentReply } from '../chatPostProcess.js'
import { serializeToolResultForLlm } from './toolResultCompact.js'
import { emitChatStreamEvent } from '../chatStreamContext.js'
import { toolStatusLabel } from '../chatStream.js'
import { isGuestChatUser } from '../guestCartContext.js'
import {
  isGuestBlockedRoute,
  buildSignInRequiredReply,
  buildSignInRequiredToolResult,
} from '../guestChatRestrictions.js'

export async function refuseNode(state) {
  const reply =
    REFUSE_MESSAGES[state.guardReason] || REFUSE_MESSAGES.off_topic
  emitChatStreamEvent({ type: 'route', route: 'refuse' })
  emitChatStreamEvent({ type: 'text_delta', delta: reply })
  return { reply, replyKind: 'refuse', replyLocked: true }
}

export function makeAgentNode(route) {
  return async function agentNode(state) {
    if (isGuestChatUser(state.userId) && isGuestBlockedRoute(route)) {
      const reply = buildSignInRequiredReply(state.userText, { route })
      emitChatStreamEvent({ type: 'route', route: 'sign_in_required' })
      emitChatStreamEvent({ type: 'text_delta', delta: reply })
      return {
        reply,
        messages: [
          { role: 'system', content: buildAgentSystemPromptWithContext(route, state.userName, state.plan) },
          ...state.history,
          { role: 'user', content: state.userText },
        ],
        toolResults: [buildSignInRequiredToolResult(state.userText, { route })],
        toolsUsed: [],
        replyKind: 'sign_in_required',
        replyLocked: true,
      }
    }

    const result = await runAgentWithTools(state, route)
    return {
      reply: result.reply,
      messages: result.messages,
      toolResults: result.toolResults,
      toolsUsed: result.toolsUsed,
      replyKind: result.replyKind || null,
      replyLocked: Boolean(result.replyLocked),
    }
  }
}

function plannerProductId(plan) {
  return plan?.product_ref?.id || null
}

export async function productDetailNode(state) {
  const fromPlan = plannerProductId(state.plan)
  const productId =
    fromPlan ||
    (await resolveProductIdFromContext(state.history, state.userText))

  if (productId) {
    emitChatStreamEvent({ type: 'route', route: 'product_detail' })
    emitChatStreamEvent({
      type: 'tool_start',
      toolName: 'get_product_details',
      label: toolStatusLabel('get_product_details'),
      round: 1,
    })

    const result = await executeTool('get_product_details', state.userId, {
      product_id: productId,
    })

    emitChatStreamEvent({
      type: 'tool_end',
      toolName: 'get_product_details',
      round: 1,
      ok: !result.error,
    })

    if (!result.error) {
      const reply = buildProductDetailReply(result, { plan: state.plan })
      emitChatStreamEvent({ type: 'text_delta', delta: reply })
      const messages = [
        {
          role: 'system',
          content: buildAgentSystemPromptWithContext('product_detail', state.userName, state.plan),
        },
        ...state.history,
        { role: 'user', content: state.userText },
        {
          role: 'tool',
          tool_call_id: 'product_detail_direct',
          content: serializeToolResultForLlm('get_product_details', result),
        },
      ]

      return {
        reply,
        messages,
        toolResults: [{ ...result, toolName: 'get_product_details' }],
        toolsUsed: ['get_product_details'],
        replyKind: 'product_detail',
        replyLocked: true,
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
  const reply = formatAgentReply(
    state.reply,
    state.messages || [],
    state.userText,
    state.toolResults || [],
    state.history || [],
    { plan: state.plan, replyKind: state.replyKind, replyLocked: state.replyLocked }
  )
  return { reply }
}
