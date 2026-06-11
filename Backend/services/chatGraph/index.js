import { getCompiledGraph } from './graph.js'
import { getLlmUsageContext, runWithLlmUsageContext } from '../llmUsageContext.js'

export { evaluateGuard, REFUSE_MESSAGES } from './guard.js'
export { routeIntent, ROUTE_NAMES } from './router.js'
export { ROUTE_TOOL_NAMES } from './toolSets.js'

function withAgentPromptCache(fn) {
  const store = getLlmUsageContext()
  if (store?.agentPromptCache) {
    return fn()
  }
  return runWithLlmUsageContext({ agentPromptCache: new Map() }, fn)
}

export async function runChatGraph({ userId, userName, userText, history = [] }) {
  return withAgentPromptCache(async () => {
    const graph = getCompiledGraph()
    const trimmedHistory = Array.isArray(history)
      ? history.map((m) => ({
          role: m.role === 'user' ? 'user' : 'assistant',
          content: String(m.content || ''),
        }))
      : []

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
      guardAllowed: result.guardAllowed !== false,
      guardReason: result.guardReason || null,
    }
  })
}
