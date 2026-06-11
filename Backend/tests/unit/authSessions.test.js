import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js'
import { invalidateUserRefreshToken } from '../../utils/authSessions.js'

describe('invalidateUserRefreshToken', () => {
  it('clears refreshToken on the user document', async () => {
    const user = await User.create({
      fullname: 'Session Revoke User',
      email: `revoke-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
      refreshToken: 'stale-refresh-token',
    })

    await invalidateUserRefreshToken(user)

    const reloaded = await User.findById(user._id)
    expect(reloaded.refreshToken).toBe('')
  })
})

describe('PUT /shopai/users/change-password', () => {
  it('revokes refresh tokens after password change', async () => {
    const password = 'oldpass123'
    const user = await User.create({
      fullname: 'Change Password User',
      email: `change-pw-${Date.now()}@test.com`,
      password: await bcrypt.hash(password, 10),
    })

    const refreshToken = generateRefreshToken(user._id)
    user.refreshToken = refreshToken
    await user.save()

    const accessToken = generateAccessToken(user)

    const changeRes = await request(app)
      .put('/shopai/users/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'newpass456' })

    expect(changeRes.status).toBe(200)

    const reloaded = await User.findById(user._id)
    expect(reloaded.refreshToken).toBe('')

    const refreshRes = await request(app)
      .post('/shopai/users/refresh')
      .set('Cookie', [`shopai_refresh_token=${refreshToken}`])

    expect(refreshRes.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /shopai/users/reset-password', () => {
  it('revokes refresh tokens after OTP reset', async () => {
    const user = await User.create({
      fullname: 'Reset Password User',
      email: `reset-pw-${Date.now()}@test.com`,
      password: await bcrypt.hash('oldpass123', 10),
    })

    const stolenRefreshToken = generateRefreshToken(user._id)
    user.refreshToken = stolenRefreshToken
    await user.save()

    const otp = user.createPasswordResetOTP()
    await user.save({ validateBeforeSave: false })

    const res = await request(app).post('/shopai/users/reset-password').send({
      email: user.email,
      otp,
      password: 'resetpass789',
    })

    expect(res.status).toBe(200)

    const reloaded = await User.findById(user._id)
    expect(reloaded.refreshToken).toBe('')

    const refreshRes = await request(app)
      .post('/shopai/users/refresh')
      .set('Cookie', [`shopai_refresh_token=${stolenRefreshToken}`])

    expect(refreshRes.status).toBeGreaterThanOrEqual(400)
  })
})
