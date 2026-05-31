import {
  orderHasRefundInProgress,
  getPaymentStatusLabel,
  isAdminOrderStatusLocked,
  adminOrderStatusLockReason,
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
})
