import { describe, it, expect } from 'vitest'
import { resolveOrderDisplayStatus } from '../../utils/orderDisplayStatus.js'

describe('resolveOrderDisplayStatus', () => {
  it('uses fulfillment status when no refund or return overlay', () => {
    expect(resolveOrderDisplayStatus({ status: 'delivered', refundStatus: 'none' })).toEqual({
      fulfillmentStatus: 'delivered',
      displayStatus: 'delivered',
      displayStatusLabel: 'Delivered',
      returnRequestStatus: null,
    })
  })

  it('surfaces refunded delivered orders distinctly from plain delivered', () => {
    const refunded = resolveOrderDisplayStatus({
      status: 'delivered',
      refundStatus: 'full',
    })
    const normal = resolveOrderDisplayStatus({
      status: 'delivered',
      refundStatus: 'none',
    })

    expect(refunded.displayStatus).toBe('refunded')
    expect(refunded.displayStatusLabel).toBe('Refunded')
    expect(refunded.fulfillmentStatus).toBe('delivered')
    expect(normal.displayStatus).toBe('delivered')
  })

  it('labels cancelled full refunds clearly', () => {
    expect(
      resolveOrderDisplayStatus({ status: 'cancelled', refundStatus: 'full' })
    ).toMatchObject({
      displayStatus: 'refunded',
      displayStatusLabel: 'Cancelled · Refunded',
      fulfillmentStatus: 'cancelled',
    })
  })

  it('shows partial refunds', () => {
    expect(
      resolveOrderDisplayStatus({ status: 'delivered', refundStatus: 'partial' })
    ).toMatchObject({
      displayStatus: 'partially_refunded',
      displayStatusLabel: 'Partially refunded',
    })
  })

  it('prioritises open return requests over fulfillment status', () => {
    expect(
      resolveOrderDisplayStatus(
        { status: 'delivered', refundStatus: 'none' },
        { returnRequestStatus: 'requested' }
      )
    ).toMatchObject({
      displayStatus: 'return_in_progress',
      displayStatusLabel: 'Return in progress',
      fulfillmentStatus: 'delivered',
      returnRequestStatus: 'requested',
    })
  })
})
