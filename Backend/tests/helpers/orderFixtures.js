import mongoose from 'mongoose'

/** Minimal valid order line for tests — matches OrderItemSchema / normalizeOrderItems(). */
export function testOrderItem(overrides = {}) {
  const price = overrides.price ?? 100
  const qty = overrides.qty ?? 1
  return {
    _id: overrides._id ?? new mongoose.Types.ObjectId(),
    name: 'Test Item',
    qty,
    price,
    totalPrice: overrides.totalPrice ?? price * qty,
    color: 'Black',
    size: 'M',
    ...overrides,
  }
}

/** Minimal valid shipping snapshot for tests — matches ShippingAddressSchema. */
export function testShippingAddress(overrides = {}) {
  return {
    firstName: 'Test',
    lastName: 'User',
    address: '1 Test St',
    city: 'Test City',
    province: 'Test State',
    postalCode: '123456',
    country: 'IN',
    phone: '9876543210',
    ...overrides,
  }
}
