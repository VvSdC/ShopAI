import { AsyncLocalStorage } from 'node:async_hooks'

export const GUEST_USER_ID = '__guest__'

const guestCartStorage = new AsyncLocalStorage()

export function runWithGuestCart(state, fn) {
  return guestCartStorage.run(state, fn)
}

export function getGuestCartState() {
  return guestCartStorage.getStore() || null
}

export function isGuestChatUser(userId) {
  return userId === GUEST_USER_ID || Boolean(getGuestCartState())
}
