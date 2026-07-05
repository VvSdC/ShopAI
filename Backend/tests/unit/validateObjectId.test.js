import { describe, it, expect, vi } from 'vitest'
import { isValidObjectId } from '../../utils/objectId.js'
import { validateObjectId } from '../../middlewares/validateObjectId.js'

describe('isValidObjectId', () => {
  it('accepts 24-char hex strings', () => {
    expect(isValidObjectId('507f1f77bcf86cd799439011')).toBe(true)
    expect(isValidObjectId('ABCDEF0123456789ABCDEF01')).toBe(true)
  })

  it('rejects malformed ids', () => {
    expect(isValidObjectId('abc')).toBe(false)
    expect(isValidObjectId('MRF')).toBe(false)
    expect(isValidObjectId('')).toBe(false)
    expect(isValidObjectId('507f1f77bcf86cd79943901')).toBe(false)
    expect(isValidObjectId('507f1f77bcf86cd799439011x')).toBe(false)
  })
})

describe('validateObjectId middleware', () => {
  function run(params, ...names) {
    const next = vi.fn()
    const req = { params }
    validateObjectId(...names)(req, {}, next)
    return next
  }

  it('calls next() for valid ids', () => {
    const next = run({ id: '507f1f77bcf86cd799439011' }, 'id')
    expect(next).toHaveBeenCalledWith()
  })

  it('passes AppError 400 for invalid ids', () => {
    const next = run({ id: 'abc' }, 'id')
    expect(next).toHaveBeenCalledOnce()
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(400)
    expect(err.isOperational).toBe(true)
    expect(err.message).toBe('Invalid id')
  })

  it('validates multiple param names', () => {
    const next = run(
      { id: '507f1f77bcf86cd799439011', productID: 'not-an-id' },
      'id',
      'productID'
    )
    const err = next.mock.calls[0][0]
    expect(err.statusCode).toBe(400)
    expect(err.message).toBe('Invalid productID')
  })
})
