import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { config } from '../../config/env.js'
import { fetchCsrf, withCsrf } from '../helpers/csrf.js'

describe('OTP resend rate limiting', () => {
  it('locks out resend-verification after max requests per email', async () => {
    const email = `otp-resend-${Date.now()}@test.com`
    await User.create({
      fullname: 'Resend Limit User',
      email,
      password: await bcrypt.hash('secret123', 10),
      isEmailVerified: false,
    })

    const csrf = await fetchCsrf(app)
    const maxAttempts = config.rateLimit.otpResend.max

    for (let i = 0; i < maxAttempts; i++) {
      const res = await withCsrf(
        request(app).post('/shopai/users/resend-verification').send({ email }),
        csrf
      )
      expect(res.status).toBe(200)
    }

    const blocked = await withCsrf(
      request(app).post('/shopai/users/resend-verification').send({ email }),
      csrf
    )

    expect(blocked.status).toBe(429)
    expect(blocked.body.message).toMatch(/too many otp requests/i)
  })
})
