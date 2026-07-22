import { describe, it, expect } from 'vitest'
import {
  AUTH_REQUIRED_TOOLS,
  buildSignInRequiredReply,
  buildSignInRequiredToolResult,
  hasSignInRequiredResult,
  isAuthRequiredTool,
  isGuestBlockedRoute,
} from '../../services/guestChatRestrictions.js'
import { getToolsForRoute } from '../../services/chatGraph/toolSets.js'
import { buildChatBlocks } from '../../services/chatBlocks.js'

describe('guestChatRestrictions', () => {
  it('flags auth-required tools and blocked routes', () => {
    expect(isAuthRequiredTool('get_my_orders')).toBe(true)
    expect(isAuthRequiredTool('search_products')).toBe(false)
    expect(isGuestBlockedRoute('order_summary')).toBe(true)
    expect(isGuestBlockedRoute('checkout')).toBe(false)
  })

  it('builds structured sign-in-required tool results', () => {
    const result = buildSignInRequiredToolResult('show my orders', { route: 'order_summary' })
    expect(result.error).toBe('sign_in_required')
    expect(result.signInRequired).toBe(true)
    expect(result.pendingQuery).toBe('show my orders')
    expect(result.message).toMatch(/sign in/i)
  })

  it('detects sign-in-required tool results', () => {
    expect(hasSignInRequiredResult([{ error: 'sign_in_required' }])).toBe(true)
    expect(hasSignInRequiredResult([{ signInRequired: true }])).toBe(true)
    expect(hasSignInRequiredResult([{ error: 'not found' }])).toBe(false)
  })

  it('includes pending query preview in reply', () => {
    const reply = buildSignInRequiredReply('track order ORD123', { route: 'order_summary' })
    expect(reply).toMatch(/sign in/i)
    expect(reply).toMatch(/track order ORD123/)
  })
})

describe('guest tool sets', () => {
  it('removes auth-required tools for guests', () => {
    const guestCheckoutTools = getToolsForRoute('checkout', { isGuest: true }).map(
      (def) => def.function.name
    )
    expect(guestCheckoutTools).not.toContain('create_checkout_session')
    expect(guestCheckoutTools).not.toContain('get_my_addresses')
    expect(guestCheckoutTools).toContain('get_cart')
    expect(guestCheckoutTools).toContain('add_to_cart')
  })

  it('keeps checkout session tool for signed-in users', () => {
    const checkoutTools = getToolsForRoute('checkout', { isGuest: false }).map(
      (def) => def.function.name
    )
    expect(checkoutTools).toContain('create_checkout_session')
    expect(checkoutTools).toContain('get_my_addresses')
  })

  it('drops order lookup from guest general route', () => {
    const guestGeneral = getToolsForRoute('general', { isGuest: true }).map(
      (def) => def.function.name
    )
    expect(guestGeneral).not.toContain('get_my_orders')
    expect(guestGeneral).toContain('search_products')
  })
})

describe('sign_in_required chat blocks', () => {
  it('renders only the sign-in block when required', () => {
    const blocks = buildChatBlocks({
      messageKind: 'sign_in_required',
      pendingQuery: 'where is my order',
      toolResults: [{ error: 'sign_in_required', signInRequired: true }],
    })
    expect(blocks).toHaveLength(1)
    expect(blocks[0]).toEqual({
      type: 'sign_in_required',
      pendingQuery: 'where is my order',
    })
  })
})
