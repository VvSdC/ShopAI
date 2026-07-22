export const SIGN_IN_REQUIRED_ERROR = 'sign_in_required'

/** Routes that guests cannot enter — short-circuit before the agent runs. */
export const GUEST_BLOCKED_ROUTES = new Set(['payment', 'order_summary', 'order_update'])

/** Tools that require an authenticated user account. */
export const AUTH_REQUIRED_TOOLS = new Set([
  'get_my_orders',
  'get_order_details',
  'get_my_addresses',
  'add_shipping_address',
  'update_shipping_address',
  'preview_checkout',
  'create_checkout_session',
  'get_order_cancel_return_status',
  'cancel_order',
  'submit_return_request',
])

export function isGuestBlockedRoute(route) {
  return GUEST_BLOCKED_ROUTES.has(route)
}

export function isAuthRequiredTool(toolName) {
  return AUTH_REQUIRED_TOOLS.has(toolName)
}

function routeTopicLabel(route) {
  switch (route) {
    case 'payment':
      return 'complete payment'
    case 'order_summary':
      return 'view your orders'
    case 'order_update':
      return 'manage cancellations or returns'
    case 'checkout':
      return 'complete checkout'
    default:
      return 'continue'
  }
}

export function buildSignInRequiredReply(pendingQuery, { route = null } = {}) {
  const topic = routeTopicLabel(route)
  const preview = pendingQuery ? ` I'll continue with: "${String(pendingQuery).trim().slice(0, 120)}".` : ''
  return `To ${topic}, please **sign in** first. Your cart stays saved on this device.${preview}`
}

export function buildSignInRequiredToolResult(pendingQuery, context = {}) {
  return {
    error: SIGN_IN_REQUIRED_ERROR,
    signInRequired: true,
    pendingQuery: pendingQuery || null,
    message: buildSignInRequiredReply(pendingQuery, context),
    missing: ['account'],
    toolName: context.toolName || null,
    route: context.route || null,
  }
}

export function hasSignInRequiredResult(toolResults = []) {
  return (toolResults || []).some(
    (r) => r?.error === SIGN_IN_REQUIRED_ERROR || r?.signInRequired === true
  )
}

export function applySignInRequiredToPayload(payload, pendingQuery, context = {}) {
  const next = { ...payload }
  next.signInRequired = true
  next.pendingQuery = pendingQuery
  if (!next.reply || hasSignInRequiredResult(next.toolResults)) {
    next.reply = buildSignInRequiredReply(pendingQuery, context)
  }
  next.blocks = [
    {
      type: 'sign_in_required',
      pendingQuery: pendingQuery || null,
    },
  ]
  return next
}
