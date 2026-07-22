import { describe, it, expect } from 'vitest'
import jwt from 'jsonwebtoken'
import config from '../../config/env.js'
import { verifyToken } from '../../utils/verifyToken.js'
import { generateAccessToken } from '../../utils/generateToken.js'

describe('verifyToken', () => {
  it('returns decoded payload for a valid access token', () => {
    const user = {
      _id: '507f1f77bcf86cd799439011',
      fullname: 'Test User',
      isAdmin: false,
      hasShippingAddress: false,
    }

    const token = generateAccessToken(user)
    const decoded = verifyToken(token)

    expect(decoded).toBeTruthy()
    expect(decoded.id).toBe(user._id)
    expect(decoded.fullname).toBe(user.fullname)
  })

  it('returns false for invalid or expired tokens', () => {
    expect(verifyToken('not-a-jwt')).toBe(false)
    expect(verifyToken('')).toBe(false)
    expect(verifyToken(null)).toBe(false)

    const expired = jwt.sign({ id: '507f1f77bcf86cd799439011' }, config.auth.jwtKey, {
      expiresIn: '-1s',
    })
    expect(verifyToken(expired)).toBe(false)
  })

  it('does not use async callback mode (sync return must be defined)', () => {
    const token = generateAccessToken({
      _id: '507f1f77bcf86cd799439012',
      fullname: 'Sync Check',
      isAdmin: true,
      hasShippingAddress: true,
    })

    const decoded = verifyToken(token)
    expect(decoded).not.toBeUndefined()
    expect(decoded.id).toBe('507f1f77bcf86cd799439012')
  })
})
