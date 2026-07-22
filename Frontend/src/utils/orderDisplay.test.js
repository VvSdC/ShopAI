import {
  orderHasRefundInProgress,
  getPaymentStatusLabel,
  isAdminOrderStatusLocked,
  adminOrderStatusLockReason,
  resolveOrderDisplayStatus,
  getOrderDisplayStatus,
} from './orderDisplay'

describe('orderDisplay', () => {
  const cancelledWithRefund = {
    status: 'cancelled',
    paymentStatus: 'paid',
    refundStatus: 'full',
    totalRefunded: 1999,
  }

  it('detects refund in progress on cancelled orders', () => {
    expect(orderHasRefundInProgress(cancelledWithRefund)).toBe(true)
    expect(getPaymentStatusLabel(cancelledWithRefund)).toBe('Refund in progress')
  })

  it('locks admin edit for cancelled orders', () => {
    expect(isAdminOrderStatusLocked(cancelledWithRefund)).toBe(true)
    expect(adminOrderStatusLockReason(cancelledWithRefund)).toMatch(/cancelled/i)
  })

  it('does not show refund for unpaid cancelled orders', () => {
    const order = { status: 'cancelled', paymentStatus: 'Not paid', refundStatus: 'none' }
    expect(orderHasRefundInProgress(order)).toBe(false)
    expect(getPaymentStatusLabel(order)).toBe('Not paid')
  })

  it('surfaces refunded delivered orders via display status', () => {
    const order = { status: 'delivered', refundStatus: 'full' }
    expect(getOrderDisplayStatus(order).displayStatus).toBe('refunded')
    expect(getOrderDisplayStatus(order).displayStatusLabel).toBe('Refunded')
    expect(getOrderDisplayStatus(order).fulfillmentStatus).toBe('delivered')
  })

  it('shows return in progress ahead of fulfillment label', () => {
    expect(
      resolveOrderDisplayStatus(
        { status: 'delivered', refundStatus: 'none' },
        { returnRequestStatus: 'requested' }
      ).displayStatusLabel
    ).toBe('Return in progress')
  })
})
