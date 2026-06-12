import { patchLlmUsageContext } from '../llmUsageContext.js'
import { classifyIntent } from './intentClassifier.js'
import { ROUTE_NAMES, routeIntentHeuristic } from './routerHeuristic.js'

export { ROUTE_NAMES, routeIntentHeuristic, classifyIntentHeuristic, hasKnownProductInHistory, isCheckoutIntent, isDiscoveryIntent } from './routerHeuristic.js'
export { routeIntentHeuristic as routeIntent } from './routerHeuristic.js'

export async function routerNode(state) {
  const classified = await classifyIntent(state.userText, state.history)
  const route = classified.route
  const routeReason = classified.reason || ''
  patchLlmUsageContext({ route, routeReason })
  return { route, routeReason }
}

export function guardRoute(state) {
  return state.guardAllowed ? 'allow' : 'refuse'
}

export function agentRoute(state) {
  const route = state.route || 'general'
  return ROUTE_NAMES.includes(route) ? route : 'general'
}
