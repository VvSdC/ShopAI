import Product from '../../model/Product.js'
import { buildProductSearchDocument } from './documentBuilder.js'
import { embedText } from './embeddingService.js'

export async function indexProductEmbedding(productId) {
  const product = await Product.findById(productId)
  if (!product) return { ok: false, reason: 'not_found' }

  const searchDocument = buildProductSearchDocument(product)
  let embeddingMeta = {}

  try {
    const { vector, provider, model } = await embedText(searchDocument)
    embeddingMeta = {
      embedding: vector,
      embeddingProvider: provider,
      embeddingModel: model,
      embeddedAt: new Date(),
    }
  } catch (err) {
    console.error(`[indexProductEmbedding] ${productId}:`, err.message)
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
      console.error(`Background embedding failed for ${productId}:`, err.message)
    })
  }, delayMs)
}
