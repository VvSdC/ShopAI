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

/** Store only a SHA-256 digest — raw refresh JWT stays in the httpOnly cookie. */
export function hashRefreshToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex')
}

function signDeviceId(deviceId) {
  const signature = crypto
    .createHmac('sha256', config.auth.jwtRefreshKey)
    .update(deviceId)
    .digest('hex')
  return `${deviceId}.${signature}`
}

function verifySignedDeviceId(rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null
  const trimmed = rawValue.trim()
  const dotIndex = trimmed.lastIndexOf('.')
  if (dotIndex <= 0) return null

  const deviceId = trimmed.slice(0, dotIndex).slice(0, 128)
  const signature = trimmed.slice(dotIndex + 1)
  if (!deviceId || !/^[0-9a-f-]{36}$/i.test(deviceId) || !signature) return null

  const expected = crypto
    .createHmac('sha256', config.auth.jwtRefreshKey)
    .update(deviceId)
    .digest('hex')

  try {
    const sigBuf = Buffer.from(signature, 'hex')
    const expectedBuf = Buffer.from(expected, 'hex')
    if (sigBuf.length !== expectedBuf.length) return null
    if (!crypto.timingSafeEqual(sigBuf, expectedBuf)) return null
  } catch {
    return null
  }

  return deviceId
}

/** Issue the httpOnly device cookie value (UUID + HMAC). */
export function formatDeviceIdCookie(deviceId) {
  return signDeviceId(deviceId)
}

/** Resolve device id from signed server cookie only — never trust client headers. */
export function resolveDeviceId(req) {
  const fromCookie = verifySignedDeviceId(req?.cookies?.shopai_device_id)
  if (fromCookie) return fromCookie
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

function buildSessionEntry(rawRefreshToken, deviceId) {
  const now = new Date()
  return {
    token: hashRefreshToken(rawRefreshToken),
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
  const presentedHash = hashRefreshToken(presentedToken)

  const user = await User.findOneAndUpdate(
    { _id: userId, 'sessions.token': presentedHash },
    {
      $set: {
        'sessions.$.token': hashRefreshToken(newRefreshToken),
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
    $pull: { sessions: { token: hashRefreshToken(token) } },
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
