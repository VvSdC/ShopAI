import asyncHandler from 'express-async-handler'
import Brand from '../model/Brand.js'
import Category from '../model/Category.js'
import Product from '../model/Product.js'
import Review from '../model/Review.js'
import { tagProductInBackground } from '../services/productTagging.js'

// @desc    Create new product
// @route   POST /api/v1/products
// @access  Private/Admin
export const createProductCtrl = asyncHandler(async (req, res) => {
  const { name, description, category, sizes, colors, price, totalQty, brand } =
    req.body
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
  //create the product
  const product = await Product.create({
    name,
    description,
    category,
    sizes,
    colors,
    user: req.userAuthId,
    price,
    totalQty,
    brand,
    images: convertedImgs,
  })
  //push the product into category
  categoryFound.products.push(product._id)
  //resave
  await categoryFound.save()
  //push the product into brand
  brandFound.products.push(product._id)
  //resave
  await brandFound.save()

  tagProductInBackground(product._id)

  //send response
  res.json({
    status: 'success',
    message: 'Product created successfully',
    product,
  })
})

// @desc    Get all products
// @route   GET /api/v1/products
// @access  Public

export const getProductsCtrl = asyncHandler(async (req, res) => {
  const filter = {}

  if (req.query.name) filter.name = { $regex: req.query.name, $options: 'i' }
  if (req.query.brand) filter.brand = req.query.brand
  if (req.query.category) filter.category = req.query.category
  if (req.query.color) filter.colors = req.query.color
  if (req.query.size) filter.sizes = req.query.size
  if (req.query.price) {
    const priceRange = req.query.price.split('-')
    filter.price = { $gte: priceRange[0], $lte: priceRange[1] }
  }

  const page = parseInt(req.query.page) || 1
  const limit = parseInt(req.query.limit) || 12
  const startIndex = (page - 1) * limit
  const endIndex = page * limit
  const total = await Product.countDocuments(filter)

  const products = await Product.find(filter)
    .skip(startIndex)
    .limit(limit)
    .populate('reviews')

  const pagination = {}
  if (endIndex < total) {
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
    message: 'Products fetched successfully',
    products,
  })
})

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public

export const getProductCtrl = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id).populate({
    path: 'reviews',
    populate: {
      path: 'user',
      select: 'fullname',
    },
  })
  if (!product) {
    throw new Error('Prouduct not found')
  }
  res.json({
    status: 'success',
    message: 'Product fetched successfully',
    product,
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
    user,
    price,
    totalQty,
    brand,
  } = req.body
  //validation

  //update
  const product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      category,
      sizes,
      colors,
      user,
      price,
      totalQty,
      brand,
    },
    {
      new: true,
      runValidators: true,
    }
  )

  if (product) tagProductInBackground(product._id)

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
  // Delete all reviews for this product
  await Review.deleteMany({ product: product._id })
  // Remove product reference from categories and brands
  await Category.updateMany({}, { $pull: { products: product._id } })
  await Brand.updateMany({}, { $pull: { products: product._id } })
  // Delete the product
  await Product.findByIdAndDelete(req.params.id)
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
    const qtyLeft = product.totalQty - product.totalSold
    if (qtyLeft <= 0) {
      return { ...item, unavailable: true, qtyLeft: 0, reason: 'Out of stock' }
    }
    if (item.qty > qtyLeft) {
      return {
        ...item,
        qty: qtyLeft,
        totalPrice: item.price * qtyLeft,
        qtyLeft,
        adjusted: true,
        unavailable: false,
        reason: `Only ${qtyLeft} left in stock`,
      }
    }
    return { ...item, qtyLeft, unavailable: false, adjusted: false }
  })

  res.json({ status: 'success', items: validated })
})
