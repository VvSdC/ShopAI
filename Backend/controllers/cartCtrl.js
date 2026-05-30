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
} from '../services/cartService.js'

export const getCartCtrl = asyncHandler(async (req, res) => {
  const cart = await getCart(req.userAuthId)
  res.json({ status: 'success', cart })
})

export const addCartItemCtrl = asyncHandler(async (req, res) => {
  const cart = await addItem(req.userAuthId, req.body)
  res.json({ status: 'success', message: 'Item added to cart', cart })
})

export const updateCartItemCtrl = asyncHandler(async (req, res) => {
  const cart = await updateItemQty(req.userAuthId, req.body)
  res.json({ status: 'success', message: 'Cart updated', cart })
})

export const removeCartItemCtrl = asyncHandler(async (req, res) => {
  const cart = await removeItem(req.userAuthId, req.body)
  res.json({ status: 'success', message: 'Item removed from cart', cart })
})

export const applyCartCouponCtrl = asyncHandler(async (req, res) => {
  const cart = await applyCoupon(req.userAuthId, req.body.code)
  res.json({ status: 'success', message: 'Coupon applied', cart })
})

export const removeCartCouponCtrl = asyncHandler(async (req, res) => {
  const cart = await removeCoupon(req.userAuthId)
  res.json({ status: 'success', message: 'Coupon removed', cart })
})

export const syncCartCtrl = asyncHandler(async (req, res) => {
  const cart = await syncLocalItems(req.userAuthId, req.body.items || [])
  res.json({ status: 'success', message: 'Cart synced', cart })
})

export const validateServerCartCtrl = asyncHandler(async (req, res) => {
  const result = await validateCartStock(req.userAuthId)
  res.json({ status: 'success', ...result })
})
