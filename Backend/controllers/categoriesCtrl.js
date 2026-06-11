import asyncHandler from 'express-async-handler'
import cloudinaryPackage from 'cloudinary'
import Category from '../model/Category.js'
import {
  CACHE_KEYS,
  CACHE_TTL,
  getCachedOrFetch,
  invalidateCategoriesCache,
} from '../services/catalogCache.js'

const cloudinary = cloudinaryPackage.v2
// @desc    Create new category
// @route   POST /api/v1/categories
// @access  Private/Admin

export const createCategoryCtrl = async (req, res) => {
  // Your existing code here
  const { name } = req.body
  //category exists
  const categoryFound = await Category.findOne({ name })
  if (categoryFound) {
    throw new Error('Category already exists')
  }
  //create
  // Ensure an image file was uploaded
  if (!req?.file?.path && !req?.body?.image) {
    const err = new Error('Category image is required')
    err.statusCode = 400
    throw err
  }

  const category = await Category.create({
    name: name?.toLowerCase(),
    user: req.userAuthId,
    image: req?.file?.path || req.body.image,
  })
  await invalidateCategoriesCache()
  res.json({
    status: 'success',
    message: 'Category created successfully',
    category,
  })
}

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public

export const getAllCategoriesCtrl = asyncHandler(async (req, res) => {
  const { data } = await getCachedOrFetch(
    CACHE_KEYS.categoriesAll,
    CACHE_TTL.categories,
    async () => {
      const categories = await Category.find().lean()
      return {
        status: 'success',
        message: 'Categories fetched successfully',
        categories,
      }
    }
  )
  res.json(data)
})

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
export const getSingleCategoryCtrl = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
  res.json({
    status: 'success',
    message: 'Category fetched successfully',
    category,
  })
})

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
export const updateCategoryCtrl = asyncHandler(async (req, res) => {
  const { name } = req.body

  const category = await Category.findById(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Category not found')
  }

  // Build update object
  const updateData = {}
  if (name) updateData.name = name

  // If a new image was uploaded, delete the old one from Cloudinary first
  if (req?.file?.path) {
    // Extract public_id from old Cloudinary URL
    if (category.image) {
      const parts = category.image.split('/')
      const fileWithExt = parts[parts.length - 1] // e.g. abc123.jpg
      const folder = parts[parts.length - 2]       // e.g. category-api
      const publicId = `${folder}/${fileWithExt.split('.')[0]}`
      try {
        await cloudinary.uploader.destroy(publicId)
      } catch (_err) {
        // If deletion fails, continue with update
      }
    }
    updateData.image = req.file.path
  }

  const updatedCategory = await Category.findByIdAndUpdate(
    req.params.id,
    updateData,
    { new: true }
  )

  await invalidateCategoriesCache()
  res.json({
    status: 'success',
    message: 'Category updated successfully',
    category: updatedCategory,
  })
})

// @desc    delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
export const deleteCategoryCtrl = asyncHandler(async (req, res) => {
  const category = await Category.findById(req.params.id)
  if (!category) {
    res.status(404)
    throw new Error('Category not found')
  }

  // Delete image from Cloudinary before removing from DB
  if (category.image) {
    const parts = category.image.split('/')
    const fileWithExt = parts[parts.length - 1]
    const folder = parts[parts.length - 2]
    const publicId = `${folder}/${fileWithExt.split('.')[0]}`
    try {
      await cloudinary.uploader.destroy(publicId)
    } catch (_err) {
      // If Cloudinary deletion fails, still proceed with DB removal
    }
  }

  await Category.findByIdAndDelete(req.params.id)
  await invalidateCategoriesCache()
  res.json({
    status: 'success',
    message: 'Category deleted successfully',
  })
})
