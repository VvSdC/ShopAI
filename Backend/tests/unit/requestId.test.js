import { describe, it, expect, vi } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import logger from '../../utils/logger.js'
import { runWithRequestContext } from '../../utils/requestContext.js'

describe('requestId middleware', () => {
  it('returns X-Request-Id on responses', async () => {
    const res = await request(app).get('/health')
    expect(res.status).toBe(200)
    expect(res.headers['x-request-id']).toMatch(
      /^[\da-f]{8}-[\da-f]{4}-[\da-f]{4}-[\da-f]{4}-[\da-f]{12}$/i
    )
  })

  it('echoes a valid client-supplied request id', async () => {
    const clientId = 'client-trace-abc12345'
    const res = await request(app).get('/health').set('X-Request-Id', clientId)
    expect(res.headers['x-request-id']).toBe(clientId)
  })
})

describe('logger request context', () => {
  it('prefixes logs with requestId inside request context', () => {
    const spy = vi.spyOn(console, 'log').mockImplementation(() => {})
    runWithRequestContext({ requestId: 'test-req-12345678' }, () => {
      logger.log('hello correlation')
    })
    expect(spy).toHaveBeenCalledWith('[requestId=test-req-12345678]', 'hello correlation')
    spy.mockRestore()
  })
})
