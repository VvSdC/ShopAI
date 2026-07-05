import { describe, it, expect } from 'vitest'
import request from 'supertest'
import app from '../../app/app.js'
import { config } from '../../config/env.js'
import { fetchCsrf, withCsrf } from '../helpers/csrf.js'

describe('validate-cart rate limiting', () => {
  it('returns 429 after max public validation requests per IP', async () => {
    const csrf = await fetchCsrf(app)
    const maxAttempts = config.rateLimit.validateCart.max
    const payload = { items: [{ _id: '507f1f77bcf86cd799439011', qty: 1, price: 10 }] }

    for (let i = 0; i < maxAttempts; i++) {
      const res = await withCsrf(
        request(app).post('/shopai/products/validate-cart').send(payload),
        csrf
      )
      expect(res.status).not.toBe(429)
    }

    const blocked = await withCsrf(
      request(app).post('/shopai/products/validate-cart').send(payload),
      csrf
    )

    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toMatch(/too many cart validation requests/i)
  })
})
