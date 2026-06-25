import { ROUTE_NAMES } from './routerHeuristic.js'

export { ROUTE_NAMES, routeIntentHeuristic, classifyIntentHeuristic, hasKnownProductInHistory, isCheckoutIntent, isDiscoveryIntent } from './routerHeuristic.js'
export { routeIntentHeuristic as routeIntent } from './routerHeuristic.js'

export async function routerNode(_state) {
  // Route is decided in guardNode — kept for graph backward compatibility.
  return {}
}

export function guardRoute(state) {
  return state.guardAllowed ? 'allow' : 'refuse'
}

export function agentRoute(state) {
  const route = state.route || 'general'
  return ROUTE_NAMES.includes(route) ? route : 'general'
}
