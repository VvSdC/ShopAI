import asyncHandler from 'express-async-handler'
import {
  getCart,
  addItem,
  updateItemQty,
  removeItem,
  applyCoupon,
  removeCoupon,
  syncLocalItems,
  validateCartStock,
  clearCart,
} from '../services/cartService.js'
import { withCartIdempotency } from '../middlewares/cartIdempotency.js'

export const getCartCtrl = asyncHandler(async (req, res) => {
  const cart = await getCart(req.userAuthId)
  res.json({ status: 'success', cart })
})

export const addCartItemCtrl = withCartIdempotency(async (req) => {
  const cart = await addItem(req.userAuthId, req.body)
  return { status: 'success', message: 'Item added to cart', cart }
})

export const updateCartItemCtrl = withCartIdempotency(async (req) => {
  const cart = await updateItemQty(req.userAuthId, req.body)
  return { status: 'success', message: 'Cart updated', cart }
})

export const removeCartItemCtrl = withCartIdempotency(async (req) => {
  const cart = await removeItem(req.userAuthId, req.body)
  return { status: 'success', message: 'Item removed from cart', cart }
})

export const applyCartCouponCtrl = withCartIdempotency(async (req) => {
  const cart = await applyCoupon(req.userAuthId, req.body.code)
  return { status: 'success', message: 'Coupon applied', cart }
})

export const removeCartCouponCtrl = withCartIdempotency(async (req) => {
  const cart = await removeCoupon(req.userAuthId)
  return { status: 'success', message: 'Coupon removed', cart }
})

export const syncCartCtrl = withCartIdempotency(async (req) => {
  const cart = await syncLocalItems(req.userAuthId, req.body.items || [])
  return { status: 'success', message: 'Cart synced', cart }
})

export const validateServerCartCtrl = asyncHandler(async (req, res) => {
  const result = await validateCartStock(req.userAuthId)
  res.json({ status: 'success', ...result })
})

export const clearCartCtrl = withCartIdempotency(async (req) => {
  const cart = await clearCart(req.userAuthId)
  return { status: 'success', message: 'Cart cleared', cart }
})
