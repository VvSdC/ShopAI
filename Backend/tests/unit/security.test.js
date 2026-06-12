import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import { buildHelmetOptions, resolveSecurityOrigins } from '../../config/helmetConfig.js'
import { config } from '../../config/env.js'
import { fetchCsrf, withCsrf } from '../helpers/csrf.js'

describe('helmetConfig', () => {
  it('defines explicit CSP directives', () => {
    const options = buildHelmetOptions()
    const directives = options.contentSecurityPolicy.directives
    expect(directives.defaultSrc).toEqual(["'self'"])
    expect(directives.scriptSrc).toEqual(["'self'"])
    expect(directives.connectSrc).toContain("'self'")
    expect(directives.connectSrc).toContain(config.cors.origin)
    expect(directives.objectSrc).toEqual(["'none'"])
  })

  it('includes frontend origin in security origins', () => {
    const origins = resolveSecurityOrigins()
    expect(origins).toContain(config.cors.origin)
  })
})

describe('GET /shopai/users/csrf-token', () => {
  it('returns a CSRF token and sets cookie', async () => {
    const res = await request(app).get('/shopai/users/csrf-token')
    expect(res.status).toBe(200)
    expect(res.body.csrfToken).toMatch(/^[a-f0-9]{64}$/)
    expect(res.headers['set-cookie']?.join(';')).toMatch(/shopai_csrf=/)
  })
})

describe('csrfProtection', () => {
  it('rejects cookie-auth POST without CSRF header', async () => {
    const res = await request(app)
      .post('/shopai/users/refresh')
      .set('Cookie', ['shopai_refresh_token=fake-token'])
    expect(res.status).toBe(403)
    expect(res.body.message).toMatch(/csrf/i)
  })

  it('allows cookie-auth POST with matching CSRF token', async () => {
    const csrf = await fetchCsrf(app)
    const res = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      ['shopai_refresh_token=invalid-but-present']
    )
    expect(res.status).not.toBe(403)
  })

  it('skips CSRF for Bearer-only requests', async () => {
    const res = await request(app)
      .put('/shopai/orders/update/507f1f77bcf86cd799439011')
      .set('Authorization', 'Bearer invalid-token')
      .send({ status: 'processing' })
    expect(res.status).not.toBe(403)
  })

  it('skips CSRF for Stripe webhook', async () => {
    const res = await request(app)
      .post('/webhook')
      .set('Content-Type', 'application/json')
      .send('{}')
    expect(res.status).not.toBe(403)
  })
})

describe('GET /health CSP header', () => {
  it('includes Content-Security-Policy', async () => {
    const res = await request(app).get('/health')
    expect(res.headers['content-security-policy']).toBeTruthy()
    expect(res.headers['content-security-policy']).toContain("default-src 'self'")
  })
})
