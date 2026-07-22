import { describe, it, expect, vi, beforeEach } from 'vitest'
import bcrypt from 'bcryptjs'
import User from '../../model/User.js'

const sendEmailVerificationOTPEmail = vi.fn()

vi.mock('../../services/emailService.js', () => ({
  sendPasswordResetOTPEmail: vi.fn(),
  sendEmailVerificationOTPEmail: (...args) => sendEmailVerificationOTPEmail(...args),
}))

vi.mock('../../services/emailQueue.js', () => ({
  scheduleWelcomeEmail: vi.fn(),
}))

import { registerUserCtrl } from '../../controllers/usersCtrl.js'

function mockRes() {
  const res = {}
  res.status = vi.fn(() => res)
  res.json = vi.fn(() => res)
  res.cookie = vi.fn(() => res)
  return res
}

describe('registerUserCtrl', () => {
  beforeEach(() => {
    sendEmailVerificationOTPEmail.mockReset()
  })

  it('rolls back the user when verification email fails to send', async () => {
    sendEmailVerificationOTPEmail.mockRejectedValue(new Error('Resend down'))

    const email = `rollback-${Date.now()}@test.com`
    const req = {
      body: {
        fullname: 'Rollback User',
        email,
        password: 'Secret123!',
        phone: '9999999999',
        country: 'IN',
      },
    }
    const res = mockRes()
    const next = vi.fn()

    await registerUserCtrl(req, res, next)

    expect(next).toHaveBeenCalled()
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(503)
    expect(await User.findOne({ email })).toBeNull()
  })

  it('creates the user when verification email sends', async () => {
    sendEmailVerificationOTPEmail.mockResolvedValue({ success: true })

    const email = `created-${Date.now()}@test.com`
    const req = {
      body: {
        fullname: 'Created User',
        email,
        password: 'Secret123!',
        phone: '8888888888',
        country: 'IN',
      },
    }
    const res = mockRes()
    const next = vi.fn()

    await registerUserCtrl(req, res, next)

    expect(next).not.toHaveBeenCalled()
    expect(res.status).toHaveBeenCalledWith(201)
    const saved = await User.findOne({ email })
    expect(saved).toBeTruthy()
    expect(saved.isEmailVerified).toBe(false)
    expect(await bcrypt.compare('Secret123!', saved.password)).toBe(true)
  })
})
