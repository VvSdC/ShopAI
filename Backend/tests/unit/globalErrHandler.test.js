import { describe, it, expect } from 'vitest'
import {
  AppError,
  applyOperationalFlag,
  clientErrorMessage,
  isThirdPartyError,
} from '../../utils/appError.js'
import { globalErrhandler } from '../../middlewares/globalErrHandler.js'

describe('isThirdPartyError', () => {
  it('detects Mongoose and Stripe error types', () => {
    const cast = new Error('Cast to ObjectId failed')
    cast.name = 'CastError'
    expect(isThirdPartyError(cast)).toBe(true)

    const stripe = new Error('No such customer')
    stripe.type = 'StripeInvalidRequestError'
    expect(isThirdPartyError(stripe)).toBe(true)

    const app = new AppError('Order not found', 404)
    expect(isThirdPartyError(app)).toBe(false)
  })
})

describe('applyOperationalFlag', () => {
  it('marks explicit AppError as operational', () => {
    const err = new AppError('Not allowed', 403)
    applyOperationalFlag(err, { statusCode: 200 })
    expect(err.isOperational).toBe(true)
    expect(clientErrorMessage(err, 403)).toBe('Not allowed')
  })

  it('marks 4xx app errors with statusCode on err', () => {
    const err = new Error('Cancelled orders cannot be updated')
    err.statusCode = 400
    applyOperationalFlag(err, { statusCode: 200 })
    expect(err.isOperational).toBe(true)
  })

  it('does not mark third-party errors operational', () => {
    const err = new Error('E11000 duplicate key')
    err.name = 'MongoServerError'
    err.code = 11000
    applyOperationalFlag(err, { statusCode: 400 })
    expect(err.isOperational).toBeUndefined()
    expect(clientErrorMessage(err, 400)).toBe('Bad request')
  })
})

describe('globalErrhandler', () => {
  function mockRes(statusCode = 200) {
    return {
      statusCode,
      status(code) {
        this.statusCode = code
        return this
      },
      json(body) {
        this.body = body
        return this
      },
    }
  }

  it('returns operational messages verbatim', () => {
    const res = mockRes()
    globalErrhandler(new AppError('Invalid login credentials', 401), { method: 'POST', originalUrl: '/login' }, res, () => {})
    expect(res.statusCode).toBe(401)
    expect(res.body.message).toBe('Invalid login credentials')
  })

  it('returns operational 409 for duplicate registration', () => {
    const res = mockRes()
    globalErrhandler(new AppError('User already exists', 409), { method: 'POST', originalUrl: '/register' }, res, () => {})
    expect(res.statusCode).toBe(409)
    expect(res.body.message).toBe('User already exists')
  })

  it('sanitizes unexpected 500 errors', () => {
    const res = mockRes()
    const err = new Error('Connection refused: mongodb://127.0.0.1:27017/internal')
    err.name = 'MongoNetworkError'
    globalErrhandler(err, { method: 'GET', originalUrl: '/shopai/products' }, res, () => {})
    expect(res.statusCode).toBe(500)
    expect(res.body.message).toBe('Internal server error')
    expect(res.body.message).not.toMatch(/mongodb/i)
  })

  it('includes stack traces in non-production environments', () => {
    const res = mockRes()
    const err = new Error('secret path /var/app/services/stripe.js')
    globalErrhandler(err, { method: 'GET', originalUrl: '/x' }, res, () => {})
    expect(res.body.stack).toBeTruthy()
  })
})
