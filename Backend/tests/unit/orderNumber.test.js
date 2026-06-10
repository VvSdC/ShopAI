import { describe, it, expect, beforeEach } from 'vitest'
import Counter from '../../model/Counter.js'
import { allocateOrderNumber } from '../../utils/orderNumber.js'

describe('allocateOrderNumber', () => {
  beforeEach(async () => {
    await Counter.deleteMany({ _id: 'orderNumber' })
  })

  it('returns zero-padded ORD prefix numbers', async () => {
    const first = await allocateOrderNumber()
    expect(first).toBe('ORD00000001')
  })

  it('increments atomically on successive calls', async () => {
    const a = await allocateOrderNumber()
    const b = await allocateOrderNumber()
    const c = await allocateOrderNumber()
    expect(a).toBe('ORD00000001')
    expect(b).toBe('ORD00000002')
    expect(c).toBe('ORD00000003')
  })
})
