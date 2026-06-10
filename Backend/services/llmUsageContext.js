import { AsyncLocalStorage } from 'async_hooks'

export const llmUsageStorage = new AsyncLocalStorage()

export function runWithLlmUsageContext(context, fn) {
  const parent = llmUsageStorage.getStore() || {}
  return llmUsageStorage.run({ ...parent, ...context }, fn)
}

export function getLlmUsageContext() {
  return llmUsageStorage.getStore() || {}
}

export function patchLlmUsageContext(patch) {
  const store = llmUsageStorage.getStore()
  if (store && patch && typeof patch === 'object') {
    Object.assign(store, patch)
  }
}
