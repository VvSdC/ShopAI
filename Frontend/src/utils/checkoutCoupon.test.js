import { resolveCheckoutCouponCode } from './checkoutCoupon'

describe('resolveCheckoutCouponCode', () => {
  it('returns undefined when no discount is applied', () => {
    expect(
      resolveCheckoutCouponCode({ coupon: { code: 'SAVE10' } }, 'SAVE10', 0)
    ).toBeUndefined()
  })

  it('returns code from applied coupon payload', () => {
    expect(
      resolveCheckoutCouponCode({ coupon: { code: 'save10', discount: 10 } }, null, 10)
    ).toBe('save10')
  })

  it('falls back to server cart coupon code', () => {
    expect(resolveCheckoutCouponCode(null, 'CART20', 20)).toBe('CART20')
  })
})
