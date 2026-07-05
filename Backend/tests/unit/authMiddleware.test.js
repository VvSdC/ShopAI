import { describe, it, expect, vi, beforeEach } from 'vitest'
import User from '../../model/User.js'
import { isLoggedIn } from '../../middlewares/isLoggedin.js'
import isAdmin from '../../middlewares/isAdmin.js'

vi.mock('../../model/User.js', () => ({
  default: {
    findById: vi.fn(),
  },
}))

vi.mock('../../utils/getTokenFromHeader.js', () => ({
  getTokenFromHeader: vi.fn(() => 'token'),
}))

vi.mock('../../utils/verifyToken.js', () => ({
  verifyToken: vi.fn(() => ({ id: '507f1f77bcf86cd799439011' })),
}))

function mockRes() {
  return { statusCode: 200, status(code) { this.statusCode = code; return this } }
}

describe('auth middleware', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isLoggedIn loads isBlocked and isAdmin in one query', async () => {
    const lean = vi.fn().mockResolvedValue({ isBlocked: false, isAdmin: true })
    const select = vi.fn().mockReturnValue({ lean })
    User.findById.mockReturnValue({ select })

    const req = { headers: {} }
    const next = vi.fn()
    await isLoggedIn(req, mockRes(), next)

    expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    expect(select).toHaveBeenCalledWith('isBlocked isAdmin')
    expect(req.authUser).toEqual({ isBlocked: false, isAdmin: true })
    expect(next).toHaveBeenCalledWith()
  })

  it('isAdmin reuses req.authUser without a second query', async () => {
    const req = {
      userAuthId: '507f1f77bcf86cd799439011',
      authUser: { isBlocked: false, isAdmin: true },
    }
    const next = vi.fn()
    await isAdmin(req, mockRes(), next)

    expect(User.findById).not.toHaveBeenCalled()
    expect(next).toHaveBeenCalledWith()
  })

  it('isAdmin rejects non-admin users from cached authUser', async () => {
    const req = {
      userAuthId: '507f1f77bcf86cd799439011',
      authUser: { isBlocked: false, isAdmin: false },
    }
    const next = vi.fn()
    await isAdmin(req, mockRes(), next)

    expect(User.findById).not.toHaveBeenCalled()
    expect(next.mock.calls[0][0].statusCode).toBe(403)
  })

  it('isAdmin falls back to isAdmin-only lookup when authUser is missing', async () => {
    const select = vi.fn().mockResolvedValue({ isAdmin: true })
    User.findById.mockReturnValue({ select })

    const req = { userAuthId: '507f1f77bcf86cd799439011' }
    const next = vi.fn()
    await isAdmin(req, mockRes(), next)

    expect(User.findById).toHaveBeenCalledWith('507f1f77bcf86cd799439011')
    expect(select).toHaveBeenCalledWith('isAdmin')
    expect(next).toHaveBeenCalledWith()
  })
})
