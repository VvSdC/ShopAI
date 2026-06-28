import { describe, it, expect } from 'vitest'
import User from '../../model/User.js'

describe('User model serialization', () => {
  it('strips password, sessions, and reset-token fields from toJSON', () => {
    const user = new User({
      fullname: 'Test User',
      email: 'safe-user@test.com',
      password: 'hashed-password-should-not-leak',
      sessions: [
        {
          token: 'hashed-refresh-token',
          deviceId: 'device-1',
          expiresAt: new Date(Date.now() + 86400000),
        },
      ],
      passwordResetOTP: 'hashed-otp',
      passwordResetExpires: new Date(Date.now() + 600000),
      passwordResetVerifiedUntil: new Date(Date.now() + 600000),
    })

    const json = user.toJSON()

    expect(json.fullname).toBe('Test User')
    expect(json.email).toBe('safe-user@test.com')
    expect(json.password).toBeUndefined()
    expect(json.sessions).toBeUndefined()
    expect(json.passwordResetOTP).toBeUndefined()
    expect(json.passwordResetExpires).toBeUndefined()
    expect(json.passwordResetVerifiedUntil).toBeUndefined()
  })
})
