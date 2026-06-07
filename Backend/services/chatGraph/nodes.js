import { REFUSE_MESSAGES } from './guard.js'
import { runAgentWithTools } from './agentRunner.js'
import { formatAgentReply } from '../chatPostProcess.js'

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

export async function formatNode(state) {
  const reply = formatAgentReply(state.reply, state.messages || [])
  return { reply }
}
