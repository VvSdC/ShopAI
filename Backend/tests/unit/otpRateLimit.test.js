import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { config } from '../../config/env.js'
import { fetchCsrf, withCsrf } from '../helpers/csrf.js'

describe('OTP consume rate limiting', () => {
  it('locks out verify-otp after max failed attempts per email', async () => {
    const email = `otp-limit-${Date.now()}@test.com`
    await User.create({
      fullname: 'OTP Limit User',
      email,
      password: await bcrypt.hash('secret123', 10),
    })

    const csrf = await fetchCsrf(app)
    const maxAttempts = config.rateLimit.otpConsume.max

    for (let i = 0; i < maxAttempts; i++) {
      const res = await withCsrf(
        request(app).post('/shopai/users/verify-otp').send({ email, otp: '000000' }),
        csrf
      )
      expect(res.status).toBe(400)
    }

    const blocked = await withCsrf(
      request(app).post('/shopai/users/verify-otp').send({ email, otp: '000000' }),
      csrf
    )

    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toMatch(/too many otp attempts/i)
  })
})
