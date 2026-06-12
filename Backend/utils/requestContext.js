import { AsyncLocalStorage } from 'async_hooks'

export const REQUEST_ID_HEADER = 'x-request-id'

const requestStorage = new AsyncLocalStorage()

export function runWithRequestContext(context, fn) {
  const parent = requestStorage.getStore() || {}
  return requestStorage.run({ ...parent, ...context }, fn)
}

export function getRequestContext() {
  return requestStorage.getStore() || {}
}

export function getRequestId() {
  return getRequestContext().requestId || null
}
