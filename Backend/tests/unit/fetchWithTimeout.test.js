import { describe, it, expect, vi } from 'vitest'
import { fetchWithTimeout } from '../../utils/fetchWithTimeout.js'

describe('fetchWithTimeout', () => {
  it('passes AbortSignal.timeout when available', async () => {
    const fetchSpy = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchSpy)

    await fetchWithTimeout('https://example.com', {
      method: 'GET',
      timeoutMs: 1234,
    })

    expect(fetchSpy).toHaveBeenCalledOnce()
    const init = fetchSpy.mock.calls[0][1]
    expect(init.signal).toBeDefined()
    expect(init.method).toBe('GET')
  })

  it('rejects when the signal aborts', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(
        (_url, init) =>
          new Promise((_resolve, reject) => {
            init.signal.addEventListener('abort', () => {
              reject(new DOMException('Aborted', 'AbortError'))
            })
          })
      )
    )

    await expect(
      fetchWithTimeout('https://example.com/hang', { timeoutMs: 20 })
    ).rejects.toMatchObject({ name: 'AbortError' })
  })
})
