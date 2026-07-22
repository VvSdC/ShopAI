import { describe, it, expect } from 'vitest'
import { getReturnEligibility } from '../../services/returnService.js'
import { STORE_POLICY } from '../../config/storePolicy.js'

describe('returnService.getReturnEligibility', () => {
  const baseOrder = {
    status: 'delivered',
    deliveredAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
    orderItems: [
      {
        lineId: 'line-1',
        _id: '507f1f77bcf86cd799439011',
        name: 'Shirt',
        qty: 1,
        price: 100,
        color: 'Blue',
        size: 'M',
        lineStatus: 'active',
      },
    ],
  }

  it('allows returns within the policy window', () => {
    const result = getReturnEligibility(baseOrder)
    expect(result.eligible).toBe(true)
    expect(result.lines).toHaveLength(1)
  })

  it('rejects returns before delivery', () => {
    const result = getReturnEligibility({ ...baseOrder, status: 'shipped', deliveredAt: null })
    expect(result.eligible).toBe(false)
  })

  it('rejects returns after the window closes', () => {
    const oldDelivery = new Date()
    oldDelivery.setDate(oldDelivery.getDate() - (STORE_POLICY.returns.windowDays + 2))
    const result = getReturnEligibility({ ...baseOrder, deliveredAt: oldDelivery })
    expect(result.eligible).toBe(false)
  })
})
