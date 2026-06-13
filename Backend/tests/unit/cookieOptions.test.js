import { describe, it, expect, vi, beforeEach } from 'vitest'

describe('cookieOptions', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.unstubAllEnvs()
  })

  it('uses sameSite lax in development', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const { getAccessCookieOptions, getCsrfCookieOptions } = await import(
      '../../utils/cookieOptions.js'
    )
    expect(getAccessCookieOptions().sameSite).toBe('lax')
    expect(getAccessCookieOptions().secure).toBe(false)
    expect(getCsrfCookieOptions().httpOnly).toBe(false)
  })

  it('uses sameSite none + secure in production for cross-origin deploy', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    const { getAccessCookieOptions, getRefreshCookieOptions, getCsrfCookieOptions } =
      await import('../../utils/cookieOptions.js')
    expect(getAccessCookieOptions().sameSite).toBe('none')
    expect(getAccessCookieOptions().secure).toBe(true)
    expect(getRefreshCookieOptions().sameSite).toBe('none')
    expect(getCsrfCookieOptions().sameSite).toBe('none')
  })
})
