import Wishlist from '../model/Wishlist.js'
import Product from '../model/Product.js'
import { brandDisplayName, enrichProductsWithBrandNames } from '../utils/brandRef.js'
import { AppError } from '../utils/appError.js'

export function productIdKey(id) {
  if (id == null) return ''
  return String(id)
}

function isDuplicateKeyError(err) {
  return err?.code === 11000
}

async function findOrCreateWishlist(userId) {
  let wishlist = await Wishlist.findOne({ user: userId })
  if (wishlist) return wishlist

  try {
    return await Wishlist.create({ user: userId, items: [] })
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      wishlist = await Wishlist.findOne({ user: userId })
      if (wishlist) return wishlist
    }
    throw err
  }
}

async function loadProductMap(productIds) {
  const ids = [...new Set(productIds.map(productIdKey).filter(Boolean))]
  if (!ids.length) return {}

  const products = await Product.find({ _id: { $in: ids } })
    .select('name price images brand totalQty totalSold')
    .lean()
  const enriched = await enrichProductsWithBrandNames(products)
  const map = {}
  for (const product of enriched) {
    map[productIdKey(product._id)] = product
  }
  return map
}

function snapshotFromProduct(product) {
  return {
    _id: product._id,
    name: product.name,
    price: product.price,
    image: product.images?.[0] || '',
    brand: brandDisplayName(product.brand) || '',
  }
}

async function refreshWishlistFromCatalog(wishlist) {
  if (!wishlist.items?.length) return []

  const productMap = await loadProductMap(wishlist.items.map((item) => item._id))
  const nextStored = []
  const nextFormatted = []

  for (const item of wishlist.items) {
    const product = productMap[productIdKey(item._id)]
    if (!product) continue
    const qtyLeft = product.totalQty - product.totalSold
    const stored = {
      _id: product._id,
      name: product.name,
      price: product.price,
      image: product.images?.[0] || item.image || '',
      brand: brandDisplayName(product.brand) || item.brand || '',
    }
    nextStored.push(stored)
    nextFormatted.push({ ...stored, qtyLeft, inStock: qtyLeft > 0 })
  }

  const changed =
    nextStored.length !== wishlist.items.length ||
    nextStored.some((stored, index) => {
      const current = wishlist.items[index]
      return (
        !current ||
        stored.name !== current.name ||
        stored.price !== current.price ||
        stored.image !== current.image ||
        stored.brand !== current.brand ||
        productIdKey(stored._id) !== productIdKey(current._id)
      )
    })

  if (changed) {
    wishlist.items = nextStored
    await wishlist.save()
  }

  return nextFormatted
}

export function formatWishlistPayload(items = []) {
  return {
    items: items.map((item) => ({
      _id: String(item._id),
      name: item.name,
      price: item.price,
      image: item.image || '',
      brand: item.brand || '',
      qtyLeft: item.qtyLeft,
      inStock: item.inStock ?? true,
    })),
    count: items.length,
    isEmpty: items.length === 0,
  }
}

export async function getWishlist(userId) {
  const wishlist = await findOrCreateWishlist(userId)
  const items = await refreshWishlistFromCatalog(wishlist)
  return formatWishlistPayload(items)
}

export async function addWishlistItem(userId, productId) {
  const product = await Product.findById(productId)
    .select('name price images brand totalQty totalSold')
    .lean()
  if (!product) {
    throw new AppError('Product not found', 404)
  }
  const [enriched] = await enrichProductsWithBrandNames([product])

  const wishlist = await findOrCreateWishlist(userId)
  const key = productIdKey(productId)
  const exists = wishlist.items.some((item) => productIdKey(item._id) === key)
  if (exists) {
    return getWishlist(userId)
  }

  wishlist.items.push(snapshotFromProduct(enriched))
  await wishlist.save()
  return getWishlist(userId)
}

export async function removeWishlistItem(userId, productId) {
  const wishlist = await findOrCreateWishlist(userId)
  const key = productIdKey(productId)
  const before = wishlist.items.length
  wishlist.items = wishlist.items.filter((item) => productIdKey(item._id) !== key)
  if (wishlist.items.length !== before) {
    await wishlist.save()
  }
  return getWishlist(userId)
}

export async function syncLocalWishlistItems(userId, items = []) {
  if (!Array.isArray(items) || items.length === 0) {
    return getWishlist(userId)
  }

  const wishlist = await findOrCreateWishlist(userId)
  const existing = new Set(wishlist.items.map((item) => productIdKey(item._id)))
  const productMap = await loadProductMap(items.map((item) => item._id))

  for (const item of items) {
    const key = productIdKey(item?._id)
    if (!key || existing.has(key)) continue
    const product = productMap[key]
    if (!product) continue
    wishlist.items.push(snapshotFromProduct(product))
    existing.add(key)
  }

  await wishlist.save()
  return getWishlist(userId)
}
