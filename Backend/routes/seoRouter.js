import express from 'express'
import { validateObjectId } from '../middlewares/validateObjectId.js'
import {
  getCategoryPreviewCtrl,
  getProductPreviewCtrl,
  getSitemapCtrl,
} from '../controllers/seoCtrl.js'

const seoRouter = express.Router()

seoRouter.get('/sitemap.xml', getSitemapCtrl)
seoRouter.get(
  '/preview/product/:id',
  validateObjectId('id'),
  getProductPreviewCtrl
)
seoRouter.get('/preview/category', getCategoryPreviewCtrl)

export default seoRouter
