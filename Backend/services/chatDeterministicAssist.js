import { config } from '../config/env.js'
import { runCartAssist } from './chatCartAssist.js'
import { runAddressAssist } from './chatAddressAssist.js'
import { runCheckoutAssist } from './chatCheckoutAssist.js'
import { runRetrievalAssist } from './chatRetrievalAssist.js'
import { ensureCheckoutOnConfirm } from './chatPostProcess.js'

/**
 * Chat has two phases — not two competing LLM pipelines:
 *
 * 1. **LangGraph** (`runChatGraph`) — routing, guardrails, and tool-calling agent.
 * 2. **Deterministic assist** (this module) — rule-based fallbacks when the agent
 *    skips tools or returns incomplete cart/checkout/address handling.
 *
 * Set ENABLE_CHAT_DETERMINISTIC_ASSIST=false to run LangGraph-only (no fallbacks).
 */

export function isDeterministicAssistEnabled() {
  return config.chat.deterministicAssist
}

/**
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.userText
 * @param {Array} params.history
 * @param {{ reply: string, toolResults?: object[], messages?: object[], route?: string }} params.graphResult
 * @param {object|null} [params.sessionCartQueue]
 * @returns {Promise<{ reply: string, toolResults: object[], cartQueue: object|null|undefined }>}
 */
export async function runDeterministicChatAssist({
  userId,
  userText,
  history,
  graphResult,
  sessionCartQueue = null,
}) {
  let reply = graphResult.reply
  let toolResults = graphResult.toolResults || []
  const messages = graphResult.messages || []
  let cartQueue

  if (!isDeterministicAssistEnabled()) {
    return { reply, toolResults, cartQueue: undefined }
  }

  const retrievalAssist = await runRetrievalAssist(
    userId,
    userText,
    history,
    toolResults,
    graphResult
  )
  toolResults = retrievalAssist.toolResults
  if (retrievalAssist.reply) {
    reply = retrievalAssist.reply
  }

  const cartAssist = await runCartAssist(userId, userText, history, toolResults, {
    route: graphResult.route,
    cartQueue: sessionCartQueue,
  })
  toolResults = cartAssist.toolResults
  if (cartAssist.reply) {
    reply = cartAssist.reply
  }
  if (cartAssist.cartQueue !== undefined) {
    cartQueue = cartAssist.cartQueue
  }

  const addressAssist = await runAddressAssist(userId, userText, toolResults)
  toolResults = addressAssist.toolResults
  if (addressAssist.reply) {
    reply = addressAssist.reply
  }

  const checkoutAssist = await runCheckoutAssist(userId, userText, history, toolResults)
  toolResults = checkoutAssist.toolResults
  if (checkoutAssist.reply) {
    reply = checkoutAssist.reply
  }

  toolResults = await ensureCheckoutOnConfirm(userId, userText, messages, toolResults)

  return { reply, toolResults, cartQueue }
}
