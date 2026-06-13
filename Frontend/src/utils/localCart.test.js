import { parseLocalCart } from './localCart'

describe('parseLocalCart', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('returns an empty array for missing or invalid JSON', () => {
    expect(parseLocalCart(null)).toEqual([])
    expect(parseLocalCart('{not-json')).toEqual([])
    expect(parseLocalCart('{"not":"array"}')).toEqual([])
  })

  it('keeps valid cart lines and drops malformed entries', () => {
    const raw = JSON.stringify([
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cricket bat',
        qty: 2,
        price: 999,
        color: 'red',
        size: 'M',
      },
      { _id: 'bad', qty: 0 },
      null,
    ])

    expect(parseLocalCart(raw)).toEqual([
      {
        _id: '507f1f77bcf86cd799439011',
        name: 'Cricket bat',
        qty: 2,
        price: 999,
        totalPrice: 1998,
        color: 'red',
        size: 'M',
        description: '',
        image: '',
      },
    ])
  })
})
