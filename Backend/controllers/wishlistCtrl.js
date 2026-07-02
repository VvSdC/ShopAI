import asyncHandler from 'express-async-handler'
import {
  getWishlist,
  addWishlistItem,
  removeWishlistItem,
  syncLocalWishlistItems,
} from '../services/wishlistService.js'

export const getWishlistCtrl = asyncHandler(async (req, res) => {
  const wishlist = await getWishlist(req.userAuthId)
  res.json({ status: 'success', wishlist })
})

export const addWishlistItemCtrl = asyncHandler(async (req, res) => {
  const wishlist = await addWishlistItem(req.userAuthId, req.body.productId)
  res.json({ status: 'success', message: 'Saved to wishlist', wishlist })
})

export const removeWishlistItemCtrl = asyncHandler(async (req, res) => {
  const wishlist = await removeWishlistItem(req.userAuthId, req.body.productId)
  res.json({ status: 'success', message: 'Removed from wishlist', wishlist })
})

export const syncWishlistCtrl = asyncHandler(async (req, res) => {
  const wishlist = await syncLocalWishlistItems(req.userAuthId, req.body.items || [])
  res.json({ status: 'success', message: 'Wishlist synced', wishlist })
})
