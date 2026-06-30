import { getCompiledGraph } from './graph.js'
import { prepareChatHistoryForLlm } from '../../utils/chatHistoryTrim.js'

export { evaluateGuard, REFUSE_MESSAGES } from './guard.js'
export { routeIntent, ROUTE_NAMES } from './router.js'
export { ROUTE_TOOL_NAMES } from './toolSets.js'

export async function runChatGraph({
  userId,
  userName,
  userText,
  history = [],
  historyPrepared = false,
}) {
  const graph = getCompiledGraph()
  const trimmedHistory = historyPrepared ? history : prepareChatHistoryForLlm(history)

  const result = await graph.invoke({
    userId,
    userName,
    userText: String(userText || '').trim(),
    history: trimmedHistory,
    toolResults: [],
    toolsUsed: [],
  })

  return {
    reply: result.reply,
    toolResults: result.toolResults || [],
    toolsUsed: result.toolsUsed || [],
    messages: result.messages || [],
    route: result.route || 'general',
    routeReason: result.routeReason || null,
    guardAllowed: result.guardAllowed !== false,
    guardReason: result.guardReason || null,
    plan: result.plan || null,
    language: result.language || 'en',
    languageLabel: result.languageLabel || 'English',
    languageScript: result.languageScript || 'latin',
    replyKind: result.replyKind || null,
    replyLocked: Boolean(result.replyLocked),
  }
}
