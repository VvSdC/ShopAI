import jwt from 'jsonwebtoken'
import config from '../config/env.js'

/** Synchronous JWT access-token verification (no callback — jsonwebtoken v9 returns undefined when async). */
export const verifyToken = (token) => {
  if (!token || typeof token !== 'string') {
    return false
  }

  try {
    return jwt.verify(token, config.auth.jwtKey)
  } catch {
    return false
  }
}
