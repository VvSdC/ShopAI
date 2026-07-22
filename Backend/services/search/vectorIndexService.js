import logger from '../../utils/logger.js'
import Product from '../../model/Product.js'
import { enrichProductsWithBrandNames } from '../../utils/brandRef.js'
import { config } from '../../config/env.js'
import { buildProductSearchDocument } from './documentBuilder.js'
import { embedText } from './embeddingService.js'

export async function indexProductEmbedding(productId) {
  const product = await Product.findById(productId).populate('category', 'name')
  if (!product) return { ok: false, reason: 'not_found' }

  const [indexedProduct] = await enrichProductsWithBrandNames([product.toObject()])
  const searchDocument = buildProductSearchDocument(indexedProduct)
  let embeddingMeta = {}

  try {
    const { vector, provider, model } = await embedText(searchDocument)
    embeddingMeta = {
      embedding: vector,
      embeddingProvider: provider,
      embeddingModel: model,
      embeddingVersion: config.search.embeddingVersion,
      embeddingDimension: vector.length,
      embeddedAt: new Date(),
    }
  } catch (err) {
    logger.error(`[indexProductEmbedding] ${productId}:`, err.message)
    product.searchDocument = searchDocument
    await product.save()
    return { ok: false, reason: err.message }
  }

  product.searchDocument = searchDocument
  Object.assign(product, embeddingMeta)
  await product.save()
  return { ok: true, dims: embeddingMeta.embedding.length }
}

export function indexProductEmbeddingInBackground(productId, delayMs = 0) {
  setTimeout(() => {
    indexProductEmbedding(productId).catch((err) => {
      logger.error(`Background embedding failed for ${productId}:`, err.message)
    })
  }, delayMs)
}
