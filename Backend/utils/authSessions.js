import jwt from 'jsonwebtoken'
import config from '../config/env.js'
import User from '../model/User.js'
import { generateRefreshToken } from './generateToken.js'

export function verifyRefreshToken(token) {
  return jwt.verify(token, config.auth.jwtRefreshKey)
}

/**
 * Atomically rotate refresh token. On superseded-token reuse, revokes all sessions.
 * @returns {{ user: import('../model/User.js').default, newRefreshToken: string } | null}
 */
export async function rotateRefreshToken(presentedToken, userId, res) {
  const newRefreshToken = generateRefreshToken(userId)

  const user = await User.findOneAndUpdate(
    { _id: userId, refreshToken: presentedToken },
    { refreshToken: newRefreshToken },
    { new: true }
  )

  if (user) {
    return { user, newRefreshToken }
  }

  const existing = await User.findById(userId)
  if (existing?.refreshToken) {
    await invalidateUserRefreshToken(existing)
    clearAuthCookies(res)
  }

  return null
}

/** Revoke all refresh-token sessions for a user (e.g. after password change). */
export async function invalidateUserRefreshToken(userOrId) {
  if (!userOrId) return

  if (typeof userOrId === 'object' && userOrId._id) {
    userOrId.refreshToken = ''
    await userOrId.save()
    return
  }

  await User.findByIdAndUpdate(userOrId, { refreshToken: '' })
}

export function clearAuthCookies(res) {
  res.clearCookie('shopai_token')
  res.clearCookie('shopai_refresh_token')
}
