import crypto from 'crypto'
import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import User from '../model/User.js'
import { generateRefreshToken } from './generateToken.js'

export const REFRESH_TTL_MS = 7 * 24 * 60 * 60 * 1000

export function getRefreshExpiresAt() {
  return new Date(Date.now() + REFRESH_TTL_MS)
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.auth.jwtRefreshKey)
}

export function resolveDeviceId(req) {
  const fromHeader = req?.headers?.['x-device-id']
  if (fromHeader && String(fromHeader).trim()) {
    return String(fromHeader).trim().slice(0, 128)
  }
  const fromCookie = req?.cookies?.shopai_device_id
  if (fromCookie && String(fromCookie).trim()) {
    return String(fromCookie).trim().slice(0, 128)
  }
  return crypto.randomUUID()
}

function pruneExpiredSessions(sessions = []) {
  const now = Date.now()
  return sessions.filter(
    (session) => session?.expiresAt && new Date(session.expiresAt).getTime() > now
  )
}

function capSessions(sessions, max) {
  const list = [...sessions].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  )
  while (list.length > max) {
    list.shift()
  }
  return list
}

function buildSessionEntry(token, deviceId) {
  const now = new Date()
  return {
    token,
    deviceId,
    createdAt: now,
    expiresAt: getRefreshExpiresAt(),
  }
}

/** Register a new refresh session (login). Replaces prior session for the same deviceId. */
export async function createAuthSession(userId, deviceId) {
  const refreshToken = generateRefreshToken(userId)
  const entry = buildSessionEntry(refreshToken, deviceId)

  const user = await User.findById(userId)
  if (!user) {
    throw new Error('User not found')
  }

  let sessions = pruneExpiredSessions(user.sessions || [])
  sessions = sessions.filter((session) => session.deviceId !== deviceId)
  sessions.push(entry)
  sessions = capSessions(sessions, config.auth.maxSessions)

  user.sessions = sessions
  await user.save()

  return { refreshToken, user }
}

/**
 * Atomically rotate refresh token for one session. On superseded-token reuse, revokes all sessions.
 * @returns {{ user: import('../model/User.js').default, newRefreshToken: string } | null}
 */
export async function rotateRefreshToken(presentedToken, userId, res) {
  const newRefreshToken = generateRefreshToken(userId)
  const newExpiry = getRefreshExpiresAt()

  const user = await User.findOneAndUpdate(
    { _id: userId, 'sessions.token': presentedToken },
    {
      $set: {
        'sessions.$.token': newRefreshToken,
        'sessions.$.expiresAt': newExpiry,
      },
    },
    { new: true }
  )

  if (user) {
    return { user, newRefreshToken }
  }

  const existing = await User.findById(userId)
  const activeSessions = pruneExpiredSessions(existing?.sessions || [])
  if (activeSessions.length > 0) {
    await invalidateUserRefreshToken(existing)
    clearAuthCookies(res)
  }

  return null
}

/** End a single device session (logout). */
export async function revokeAuthSession(userId, token) {
  if (!userId || !token) return
  await User.findByIdAndUpdate(userId, {
    $pull: { sessions: { token } },
  })
}

/** Revoke all refresh-token sessions for a user (log out all devices). */
export async function invalidateUserRefreshToken(userOrId) {
  if (!userOrId) return

  if (typeof userOrId === 'object' && userOrId._id) {
    userOrId.sessions = []
    await userOrId.save()
    return
  }

  await User.findByIdAndUpdate(userOrId, { sessions: [] })
}

export function clearAuthCookies(res) {
  res.clearCookie('shopai_token')
  res.clearCookie('shopai_refresh_token')
}
