import asyncHandler from 'express-async-handler'
import { AppError } from '../utils/appError.js'
import { buildSitemapXml } from '../services/seoSitemap.js'
import {
  buildCategoryPreviewHtml,
  buildProductPreviewHtml,
} from '../services/seoPreview.js'

export const getSitemapCtrl = asyncHandler(async (req, res) => {
  const xml = await buildSitemapXml()
  res.set('Content-Type', 'application/xml; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=3600')
  res.send(xml)
})

export const getProductPreviewCtrl = asyncHandler(async (req, res) => {
  const html = await buildProductPreviewHtml(req.params.id)
  if (!html) {
    throw new AppError('Product not found', 404)
  }
  res.set('Content-Type', 'text/html; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=300')
  res.send(html)
})

export const getCategoryPreviewCtrl = asyncHandler(async (req, res) => {
  const categoryName = req.query.category
  if (!categoryName) {
    throw new AppError('category query parameter is required', 400)
  }

  const html = await buildCategoryPreviewHtml(categoryName)
  if (!html) {
    throw new AppError('Category not found', 404)
  }
  res.set('Content-Type', 'text/html; charset=utf-8')
  res.set('Cache-Control', 'public, max-age=300')
  res.send(html)
})
