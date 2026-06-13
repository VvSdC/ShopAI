import {
  skipIfFetching,
  skipIfListFetching,
  skipIfSameFetchInFlight,
} from './skipIfFetching'

describe('skipIfFetching helpers', () => {
  const thunkApi = (state) => ({ getState: () => state })

  it('skipIfListFetching blocks when listFetching is true', () => {
    const condition = skipIfListFetching('products')
    expect(
      condition(undefined, thunkApi({ products: { listFetching: true } }))
    ).toBe(false)
    expect(
      condition(undefined, thunkApi({ products: { listFetching: false } }))
    ).toBe(true)
  })

  it('skipIfSameFetchInFlight allows a different request key', () => {
    const condition = skipIfSameFetchInFlight(
      'products',
      {},
      (arg) => arg?.url ?? ''
    )
    const state = {
      products: {
        listFetching: true,
        listFetchKey: 'http://a/products?page=1',
      },
    }
    expect(
      condition({ url: 'http://a/products?page=1' }, thunkApi(state))
    ).toBe(false)
    expect(
      condition({ url: 'http://a/products?page=2' }, thunkApi(state))
    ).toBe(true)
  })

  it('skipIfFetching uses a custom selector', () => {
    const condition = skipIfFetching((state) =>
      Boolean(state?.coupons?.activeCouponFetching)
    )
    expect(
      condition(undefined, thunkApi({ coupons: { activeCouponFetching: true } }))
    ).toBe(false)
    expect(
      condition(undefined, thunkApi({ coupons: { activeCouponFetching: false } }))
    ).toBe(true)
  })
})
