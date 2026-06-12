import { describe, it, expect, vi, beforeEach } from 'vitest'
import { validateConfig, config } from '../../config/env.js'

describe('env config', () => {
  it('loads test defaults from globalSetup', () => {
    expect(config.isTest).toBe(true)
    expect(config.db.mongoUrl).toBeTruthy()
    expect(config.server.port).toBe(2030)
  })

  it('does not throw validateConfig in non-production', () => {
    expect(() => validateConfig({ strict: false })).not.toThrow()
  })

  it('loads JWT secrets from config.auth', () => {
    expect(config.auth.jwtKey).toBeTruthy()
    expect(config.auth.jwtRefreshKey).toBeTruthy()
  })

  it('runs queue workers in API by default outside production', () => {
    expect(config.isTest).toBe(true)
    expect(config.redis.runQueueWorkersInApi).toBe(true)
  })
})

describe('env config production defaults', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('disables queue workers in API by default in production', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RUN_QUEUE_WORKERS_IN_API', '')

    const { config: prodConfig } = await import('../../config/env.js')

    expect(prodConfig.isProduction).toBe(true)
    expect(prodConfig.redis.runQueueWorkersInApi).toBe(false)

    vi.unstubAllEnvs()
    vi.resetModules()
  })
})
