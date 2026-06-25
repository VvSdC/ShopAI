import { AsyncLocalStorage } from 'async_hooks'

export const purchaseIntentStorage = new AsyncLocalStorage()

export function runWithPurchaseIntentCache(fn) {
  return purchaseIntentStorage.run({ intents: new Map() }, fn)
}

function turnCacheKey(userText, history = []) {
  const tail = (history || [])
    .slice(-4)
    .map((m) => `${m.role}:${String(m.content || '').slice(0, 80)}`)
    .join('|')
  return `${String(userText || '').trim()}::${tail}`
}

export function getCachedPurchaseIntent(userText, history = []) {
  const store = purchaseIntentStorage.getStore()
  if (!store?.intents) return undefined
  return store.intents.get(turnCacheKey(userText, history))
}

export function setCachedPurchaseIntent(userText, history, intent) {
  const store = purchaseIntentStorage.getStore()
  if (!store?.intents) return
  store.intents.set(turnCacheKey(userText, history), intent)
}
