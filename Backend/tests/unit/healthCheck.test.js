import { describe, it, expect } from 'vitest'
import { getHealthStatus } from '../../utils/healthCheck.js'

describe('getHealthStatus', () => {
  it('returns ok when MongoDB is connected', async () => {
    const health = await getHealthStatus()
    expect(health.mongo).toBe('ok')
    expect(health.status).toBe('ok')
    expect(health.env).toBeTruthy()
    expect(health.timestamp).toBeTruthy()
  })
})
