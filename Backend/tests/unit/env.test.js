import { describe, it, expect } from 'vitest'
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
})
