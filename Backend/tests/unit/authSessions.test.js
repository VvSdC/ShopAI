import { describe, it, expect } from 'vitest'
import bcrypt from 'bcryptjs'
import request from 'supertest'
import app from '../../app/app.js'
import User from '../../model/User.js'
import { config } from '../../config/env.js'
import { generateAccessToken, generateRefreshToken } from '../../utils/generateToken.js'
import {
  createAuthSession,
  getRefreshExpiresAt,
  invalidateUserRefreshToken,
  verifyRefreshToken,
} from '../../utils/authSessions.js'
import { fetchCsrf, withCsrf, cookiePartsFromResponse } from '../helpers/csrf.js'

async function addSession(user, { token, deviceId = 'test-device' }) {
  user.sessions = user.sessions || []
  user.sessions.push({
    token,
    deviceId,
    createdAt: new Date(),
    expiresAt: getRefreshExpiresAt(),
  })
  await user.save()
  return token
}

describe('invalidateUserRefreshToken', () => {
  it('clears all auth sessions on the user document', async () => {
    const user = await User.create({
      fullname: 'Session Revoke User',
      email: `revoke-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
      sessions: [
        {
          token: 'stale-refresh-token',
          deviceId: 'device-a',
          createdAt: new Date(),
          expiresAt: getRefreshExpiresAt(),
        },
      ],
    })

    await invalidateUserRefreshToken(user)

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions).toEqual([])
  })
})

describe('multi-device auth sessions', () => {
  it('keeps independent sessions per device on login', async () => {
    const password = await bcrypt.hash('secret123', 10)
    const user = await User.create({
      fullname: 'Multi Device User',
      email: `multi-device-${Date.now()}@test.com`,
      password,
    })

    const { refreshToken: tokenA } = await createAuthSession(user._id, 'device-a')
    const { refreshToken: tokenB } = await createAuthSession(user._id, 'device-b')

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions).toHaveLength(2)
    expect(reloaded.sessions.map((s) => s.deviceId).sort()).toEqual(['device-a', 'device-b'])

    const csrf = await fetchCsrf(app)

    const refreshA = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      [`shopai_refresh_token=${tokenA}`]
    )

    expect(refreshA.status).toBe(200)

    const afterRefresh = await User.findById(user._id)
    expect(afterRefresh.sessions).toHaveLength(2)
    expect(afterRefresh.sessions.some((s) => s.token === tokenB)).toBe(true)
  })

  it('caps concurrent sessions at AUTH_MAX_SESSIONS', async () => {
    const user = await User.create({
      fullname: 'Cap Sessions User',
      email: `cap-sessions-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
    })

    const max = config.auth.maxSessions
    for (let i = 0; i < max + 2; i++) {
      await createAuthSession(user._id, `device-${i}`)
    }

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions.length).toBeLessThanOrEqual(max)
  })
})

describe('refresh token rotation', () => {
  it('rotates refresh token on each successful refresh', async () => {
    const user = await User.create({
      fullname: 'Rotate User',
      email: `rotate-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
    })

    const initialRefresh = generateRefreshToken(user._id)
    await addSession(user, { token: initialRefresh, deviceId: 'rotate-device' })

    const csrf = await fetchCsrf(app)

    const first = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      [`shopai_refresh_token=${initialRefresh}`]
    )

    expect(first.status).toBe(200)

    const afterFirst = await User.findById(user._id)
    const sessionAfterFirst = afterFirst.sessions.find((s) => s.deviceId === 'rotate-device')
    expect(sessionAfterFirst.token).not.toBe(initialRefresh)

    const rotateCookies = cookiePartsFromResponse(first)
    const second = await withCsrf(request(app).post('/shopai/users/refresh'), {
      csrfToken: csrf.csrfToken,
      cookieParts: [...csrf.cookieParts, ...rotateCookies],
    })

    expect(second.status).toBe(200)

    const afterSecond = await User.findById(user._id)
    const sessionAfterSecond = afterSecond.sessions.find((s) => s.deviceId === 'rotate-device')
    expect(sessionAfterSecond.token).not.toBe(sessionAfterFirst.token)
  })

  it('revokes all sessions when a superseded refresh token is reused', async () => {
    const user = await User.create({
      fullname: 'Theft Detect User',
      email: `theft-${Date.now()}@test.com`,
      password: await bcrypt.hash('secret123', 10),
    })

    const stolenToken = generateRefreshToken(user._id)
    const currentToken = generateRefreshToken(user._id)
    user.sessions = [
      {
        token: currentToken,
        deviceId: 'active-device',
        createdAt: new Date(),
        expiresAt: getRefreshExpiresAt(),
      },
    ]
    await user.save()

    const csrf = await fetchCsrf(app)

    const res = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      [`shopai_refresh_token=${stolenToken}`]
    )

    expect(res.status).toBeGreaterThanOrEqual(400)

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions).toEqual([])
  })

  it('verifyRefreshToken uses normalized config secret', () => {
    const userId = '507f1f77bcf86cd799439011'
    const token = generateRefreshToken(userId)
    const decoded = verifyRefreshToken(token)
    expect(decoded.id).toBe(userId)
  })
})

describe('PUT /shopai/users/change-password', () => {
  it('revokes all sessions after password change', async () => {
    const password = 'oldpass123'
    const user = await User.create({
      fullname: 'Change Password User',
      email: `change-pw-${Date.now()}@test.com`,
      password: await bcrypt.hash(password, 10),
    })

    const refreshToken = generateRefreshToken(user._id)
    await addSession(user, { token: refreshToken, deviceId: 'pw-device' })

    const accessToken = generateAccessToken(user)

    const changeRes = await request(app)
      .put('/shopai/users/change-password')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ currentPassword: password, newPassword: 'newpass456' })

    expect(changeRes.status).toBe(200)

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions).toEqual([])

    const csrf = await fetchCsrf(app)

    const refreshRes = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      [`shopai_refresh_token=${refreshToken}`]
    )

    expect(refreshRes.status).toBeGreaterThanOrEqual(400)
  })
})

describe('POST /shopai/users/reset-password', () => {
  it('revokes all sessions after OTP reset', async () => {
    const user = await User.create({
      fullname: 'Reset Password User',
      email: `reset-pw-${Date.now()}@test.com`,
      password: await bcrypt.hash('oldpass123', 10),
    })

    const stolenRefreshToken = generateRefreshToken(user._id)
    await addSession(user, { token: stolenRefreshToken, deviceId: 'reset-device' })

    const otp = user.createPasswordResetOTP()
    await user.save({ validateBeforeSave: false })

    const csrf = await fetchCsrf(app)

    const res = await withCsrf(
      request(app).post('/shopai/users/reset-password').send({
        email: user.email,
        otp,
        password: 'resetpass789',
      }),
      csrf
    )

    expect(res.status).toBe(200)

    const reloaded = await User.findById(user._id)
    expect(reloaded.sessions).toEqual([])

    const refreshRes = await withCsrf(
      request(app).post('/shopai/users/refresh'),
      csrf,
      [`shopai_refresh_token=${stolenRefreshToken}`]
    )

    expect(refreshRes.status).toBeGreaterThanOrEqual(400)
  })
})
