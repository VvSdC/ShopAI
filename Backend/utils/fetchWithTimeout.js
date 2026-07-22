/**
 * fetch() wrapper with AbortSignal timeout so hung free-tier APIs fail fast
 * instead of blocking request handlers / tests indefinitely.
 *
 * @param {string|URL} url
 * @param {RequestInit & { timeoutMs?: number }} [options]
 */
export async function fetchWithTimeout(url, options = {}) {
  const { timeoutMs = 10_000, signal: externalSignal, ...rest } = options

  if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' && !externalSignal) {
    return fetch(url, { ...rest, signal: AbortSignal.timeout(timeoutMs) })
  }

  if (!timeoutMs || timeoutMs <= 0) {
    return fetch(url, { ...rest, signal: externalSignal })
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), timeoutMs)

  if (externalSignal) {
    if (externalSignal.aborted) {
      clearTimeout(timer)
      controller.abort()
    } else {
      externalSignal.addEventListener('abort', () => controller.abort(), { once: true })
    }
  }

  try {
    return await fetch(url, { ...rest, signal: controller.signal })
  } finally {
    clearTimeout(timer)
  }
}
