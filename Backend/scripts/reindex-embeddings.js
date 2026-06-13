/**
 * Force re-index all product embeddings (manual / CI).
 *
 * Use when changing embedding provider, model, or dimension — for example switching
 * HuggingFace 768-dim vectors to Voyage 1024-dim. Also run after bumping
 * SEARCH_EMBEDDING_VERSION or updating Atlas Vector Search index numDimensions.
 *
 * Normal production catch-up: server auto-sync on startup reindexes missing/stale vectors.
 *
 * Usage: npm run search:reindex
 *        node scripts/reindex-embeddings.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Product from '../model/Product.js'
import { indexProductEmbedding } from '../services/search/vectorIndexService.js'
import { runWithConcurrencyLimit } from '../services/search/embeddingSyncService.js'
import { config } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

await mongoose.connect(config.db.mongoUrl)
console.log(
  `Embedding config: provider=${config.search.embedding.provider}, ` +
    `model=${config.search.embedding.model}, ` +
    `dimension=${config.search.embedding.dimension}, ` +
    `version=${config.search.embeddingVersion}`
)
const products = await Product.find({}).select('_id name')
console.log(
  `Force reindexing ${products.length} products (concurrency ${config.search.syncConcurrency})...`
)

const outcomes = await runWithConcurrencyLimit(
  products,
  config.search.syncConcurrency,
  async (product) => {
    const result = await indexProductEmbedding(product._id)
    if (result.ok) {
      console.log(`  OK ${product.name} (${result.dims} dims)`)
      return true
    }
    console.log(`  FAIL ${product.name}: ${result.reason}`)
    return false
  }
)

const ok = outcomes.filter(Boolean).length
const fail = outcomes.length - ok

console.log(`Done: ${ok} ok, ${fail} failed`)
await mongoose.disconnect()
