import { AsyncLocalStorage } from 'async_hooks'

export const chatStreamStorage = new AsyncLocalStorage()

export function runWithChatStream(emit, fn) {
  if (typeof emit !== 'function') {
    return fn()
  }
  return chatStreamStorage.run({ emit }, fn)
}

export function isChatStreamActive() {
  return typeof chatStreamStorage.getStore()?.emit === 'function'
}

export function emitChatStreamEvent(event) {
  const emit = chatStreamStorage.getStore()?.emit
  if (emit && event?.type) {
    emit(event)
  }
}
