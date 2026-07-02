import asyncHandler from 'express-async-handler'
import Brand from '../model/Brand.js'
import Category from '../model/Category.js'
import Product from '../model/Product.js'
import { PUBLIC_REVIEW_MATCH } from '../utils/reviewVisibility.js'
import Review from '../model/Review.js'
import { tagProductInBackground } from '../services/productTaggingQueue.js'
import { indexProductEmbeddingInBackground } from '../services/search/vectorIndexService.js'
import { searchProducts } from '../services/search/searchService.js'
import { getSimilarProducts } from '../services/similarProductsService.js'
import { resolveCategoryId } from '../utils/categoryRef.js'
import {
  getCachedOrFetch,
  invalidateCategoriesCache,
  invalidateProductListCache,
} from '../services/catalogCache.js'
import { CACHE_TTL, productsListCacheKey } from '../constants/cacheKeys.js'
import { AppError } from '../utils/appError.js'
import { normalizeProductSizes } from '../utils/normalizeProductSizes.js'
import { brandMongoCondition, mongoInCondition, parseBrandFilterQuery, parseColorFilterQuery } from '../utils/parseBrandFilter.js'

async function buildCatalogFilterFromQuery(query) {
  const filter = {}
  const brandMatch = brandMongoCondition(parseBrandFilterQuery(query.brand))
  if (brandMatch) filter.brand = brandMatch
  if (query.category) {
    const categoryId = await resolveCategoryId(query.category)
    if (!categoryId) return { filter: null, unknownCategory: true }
    filter.category = categoryId
  }
  const colorMatch = mongoInCondition(parseColorFilterQuery(query.color))
  if (colorMatch) filter.colors = colorMatch
  if (query.size) filter.sizes = query.size
  if (query.price) {
    const [min, max] = String(query.price).split('-')
    filter.price = { $gte: Number(min), $lte: Number(max) }
  }
  return { filter, unknownCategory: false }
}

async function invalidateProductCatalogCaches() {
  await invalidateProductListCache()
  await invalidateCategoriesCache()
}

function mapProductWithCreatedBy(product) {
  const json = product.toJSON ? product.toJSON() : product
  const creator = product.user
  let createdBy = null
  if (creator && typeof creator === 'object' && creator._id) {
    createdBy = { id: String(creator._id), fullname: creator.fullname || null }
  } else if (creator) {
    createdBy = { id: String(creator) }
  }
  return { ...json, createdBy }
}

function isDuplicateKeyError(err) {
  return err?.code === 11000
}

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
export const createProductCtrl = asyncHandler(async (req, res) => {
  const { name, description, category, sizes, colors, price, totalQty, brand, sizeMeasurementType, sizeLabel } =
    req.body
  if (!req.files?.length) {
    throw new AppError('At least one product image is required', 400)
  }
  const normalizedSizes = normalizeProductSizes({
    sizeMeasurementType,
    sizeLabel,
    sizes,
  })
  const convertedImgs = req.files.map((file) => file?.path)
  //Product exists
  const productExists = await Product.findOne({ name })
  if (productExists) {
    throw new Error('Product Already Exists')
  }
  //find the brand
  const brandFound = await Brand.findOne({
    name: brand,
  })
  if (!brandFound) {
    throw new Error(
      'Brand not found, please create brand first or check brand name'
    )
  }
  //find the category
  const categoryFound = await Category.findOne({
    name: category,
  })
  if (!categoryFound) {
    throw new Error(
      'Category not found, please create category first or check category name'
    )
  }
  let product
  try {
    product = await Product.create({
      name,
      description,
      category: categoryFound._id,
      ...normalizedSizes,
      colors,
      user: req.userAuthId,
      price,
      totalQty,
      brand,
      images: convertedImgs,
    })
  } catch (err) {
    if (isDuplicateKeyError(err)) {
      throw new Error('Product Already Exists')
    }
    throw err
  }

  tagProductInBackground(product._id)
  indexProductEmbeddingInBackground(product._id, 2500)

  await product.populate('category', 'name')
  await invalidateProductCatalogCaches()

  //send response
  res.json({
    status: 'success',
    message: 'Product created successfully',
    product: product.toJSON ? product.toJSON() : product,
  })
})

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public

export const getProductsCtrl = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 12
  const searchQuery = req.query.q?.trim() || req.query.name?.trim() || ''

  if (searchQuery) {
    const selectedBrands = parseBrandFilterQuery(req.query.brand)
    const selectedColors = parseColorFilterQuery(req.query.color)
    const searchArgs = {
      query: searchQuery,
      category: req.query.category,
      brands: selectedBrands,
      colors: selectedColors,
      size: req.query.size,
      inStock: req.query.inStock === 'true',
      limit,
    }
    if (req.query.price) {
      const priceRange = req.query.price.split('-').map((n) => Number(n.trim()))
      if (priceRange[0] >= 0) searchArgs.min_price = priceRange[0]
      if (priceRange[1] >= 0) searchArgs.max_price = priceRange[1]
    }

    const { products, count, message } = await searchProducts(searchArgs)
    return res.json({
      status: 'success',
      total: count,
      results: products.length,
      pagination: {},
      message: message || 'Products fetched successfully',
      products,
    })
  }

  const { filter: catalogFilter, unknownCategory } = await buildCatalogFilterFromQuery(req.query)
  if (unknownCategory) {
    return res.json({
      status: 'success',
      total: 0,
      results: 0,
      pagination: {},
      message: 'No products found for this category',
      products: [],
    })
  }

  const filter = catalogFilter || {}

  const listKey = productsListCacheKey({
    page,
    limit,
    brand: req.query.brand,
    category: req.query.category,
    color: req.query.color,
    size: req.query.size,
    price: req.query.price,
  })

  const { data } = await getCachedOrFetch(listKey, CACHE_TTL.productsList, async () => {
    const startIndex = (page - 1) * limit
    const endIndex = page * limit
    const total = await Product.countDocuments(filter)

    const products = await Product.find(filter)
      .skip(startIndex)
      .limit(limit)
      .populate('category', 'name')
      .populate('reviews')

    const pagination = {}
    if (endIndex < total) {
      pagination.next = { page: page + 1, limit }
    }
    if (startIndex > 0) {
      pagination.prev = { page: page - 1, limit }
    }

    return {
      status: 'success',
      total,
      results: products.length,
      pagination,
      message: 'Products fetched successfully',
      products: products.map((p) => (p.toJSON ? p.toJSON() : p)),
    }
  })

  res.json(data)
})

// @desc    Products created by the current admin (audit field)
// @route   GET /shopai/products/mine
// @access  Private/Admin
export const getMyProductsCtrl = asyncHandler(async (req, res) => {
  const page = parseInt(req.query.page, 10) || 1
  const limit = parseInt(req.query.limit, 10) || 12
  const startIndex = (page - 1) * limit
  const filter = { user: req.userAuthId }

  const total = await Product.countDocuments(filter)
  const products = await Product.find(filter)
    .sort({ createdAt: -1 })
    .skip(startIndex)
    .limit(limit)
    .populate('category', 'name')
    .populate('user', 'fullname')

  const pagination = {}
  if (startIndex + products.length < total) {
    pagination.next = { page: page + 1, limit }
  }
  if (startIndex > 0) {
    pagination.prev = { page: page - 1, limit }
  }

  res.json({
    status: 'success',
    total,
    results: products.length,
    pagination,
    message: 'Your products fetched successfully',
    products: products.map(mapProductWithCreatedBy),
  })
})

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public

export const getProductCtrl = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
    .populate('category', 'name')
    .populate({
      path: 'reviews',
      match: PUBLIC_REVIEW_MATCH,
      populate: {
        path: 'user',
        select: 'fullname',
      },
    })
  if (!product) {
    throw new AppError('Product not found', 404)
  }
  res.json({
    status: 'success',
    message: 'Product fetched successfully',
    product,
  })
})

export const getSimilarProductsCtrl = asyncHandler(async (req, res) => {
  const limit = Number(req.query.limit) || 8
  const result = await getSimilarProducts(req.params.id, { limit })
  res.json({
    status: 'success',
    ...result,
  })
})

// @desc    update  product
// @route   PUT /api/products/:id/update
// @access  Private/Admin

export const updateProductCtrl = asyncHandler(async (req, res) => {
  const {
    name,
    description,
    category,
    sizes,
    colors,
    price,
    totalQty,
    brand,
    sizeMeasurementType,
    sizeLabel,
  } = req.body
  //validation

  const normalizedSizes = normalizeProductSizes({
    sizeMeasurementType,
    sizeLabel,
    sizes,
  })

  let categoryId
  if (category) {
    categoryId = await resolveCategoryId(category)
    if (!categoryId) {
      throw new Error(
        'Category not found, please create category first or check category name'
      )
    }
  }

  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      ...(categoryId ? { category: categoryId } : {}),
      ...normalizedSizes,
      colors,
      price,
      totalQty,
      brand,
      ...(req.files?.length
        ? { images: req.files.map((file) => file?.path) }
        : {}),
    },
    {
      new: true,
      runValidators: true,
    }
  ).populate('category', 'name')

  if (product) {
    tagProductInBackground(product._id)
    await invalidateProductCatalogCaches()
  }

  res.json({
    status: 'success',
    message: 'Product updated successfully',
    product,
  })
})

// @desc    delete  product
// @route   DELETE /api/products/:id/delete
// @access  Private/Admin
export const deleteProductCtrl = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id)
  if (!product) {
    throw new Error('Product not found')
  }
  await Review.deleteMany({ product: product._id })
  await Product.findByIdAndDelete(req.params.id)
  await invalidateProductCatalogCaches()
  res.json({
    status: 'success',
    message: 'Product deleted successfully',
  })
})

// @desc    Validate cart items against current stock
// @route   POST /api/products/validate-cart
// @access  Public
function productIdKey(id) {
  if (id == null) return ''
  return String(id)
}

export const validateCartCtrl = asyncHandler(async (req, res) => {
  const { items } = req.body
  if (!items || !Array.isArray(items)) {
    throw new Error('Items array is required')
  }
  const productIds = [...new Set(items.map((i) => productIdKey(i._id)).filter(Boolean))]
  const products = await Product.find({ _id: { $in: productIds } })
  const productMap = {}
  products.forEach((p) => {
    productMap[productIdKey(p._id)] = p
  })

  const validated = items.map((item) => {
    const product = productMap[productIdKey(item._id)]
    if (!product) {
      return { ...item, unavailable: true, reason: 'Product no longer exists' }
    }

    const description = item.description || product.description || ''
    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) {
      return {
        ...item,
        description,
        unavailable: true,
        qtyLeft: 0,
        reason: 'Out of stock',
      }
    }
    if (item.qty > qtyLeft) {
      return {
        ...item,
        description,
        qty: qtyLeft,
        totalPrice: item.price * qtyLeft,
        qtyLeft,
        adjusted: true,
        unavailable: false,
        reason: `Only ${qtyLeft} left in stock`,
      }
    }
    return { ...item, description, qtyLeft, unavailable: false, adjusted: false }
  })

  res.json({ status: 'success', items: validated })
})
