import Product from '../../model/Product.js'
import { config } from '../../config/env.js'
import { cosineSimilarity } from './embeddingService.js'

const SELECT =
  'name brand category price totalQty totalSold colors sizes images description tags searchDocument embedding'

export async function vectorSearchLocal(queryVector, filter, limit) {
  const products = await Product.find({
    ...filter,
    embedding: { $exists: true, $ne: [] },
  })
    .select(SELECT)
    .limit(Math.min(limit * 4, 200))
    .lean()

  const scored = products
    .map((product) => ({
      product,
      score: cosineSimilarity(queryVector, product.embedding),
    }))
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(({ product }) => product)

  return scored
}

export async function vectorSearchAtlas(queryVector, filter, limit) {
  const pipeline = [
    {
      $vectorSearch: {
        index: config.search.vectorIndex,
        path: 'embedding',
        queryVector,
        numCandidates: config.search.vectorCandidates,
        limit,
        filter: Object.keys(filter).length ? filter : undefined,
      },
    },
    {
      $project: {
        name: 1,
        brand: 1,
        category: 1,
        price: 1,
        totalQty: 1,
        totalSold: 1,
        colors: 1,
        sizes: 1,
        images: 1,
        description: 1,
        tags: 1,
        searchDocument: 1,
        score: { $meta: 'vectorSearchScore' },
      },
    },
  ]

  return Product.aggregate(pipeline)
}

export async function vectorSearch(queryVector, mongoFilter, limit) {
  const isAtlas = config.db.mongoUrl.includes('mongodb+srv://')

  if (isAtlas) {
    try {
      const results = await vectorSearchAtlas(queryVector, mongoFilter, limit)
      if (results.length > 0) return results
    } catch (err) {
      console.warn('[vectorSearch] Atlas $vectorSearch failed, using local cosine:', err.message)
    }
  }

  return vectorSearchLocal(queryVector, mongoFilter, limit)
}
