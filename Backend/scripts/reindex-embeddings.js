/**
 * Force re-index all product embeddings (manual / CI).
 * Normal production use: server auto-sync on startup handles missing/stale vectors.
 * Usage: node scripts/reindex-embeddings.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Product from '../model/Product.js'
import { indexProductEmbedding } from '../services/search/vectorIndexService.js'
import { config } from '../config/env.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

await mongoose.connect(config.db.mongoUrl)
const products = await Product.find({}).select('_id name')
console.log(`Force reindexing ${products.length} products...`)

let ok = 0
let fail = 0
for (const p of products) {
  const result = await indexProductEmbedding(p._id)
  if (result.ok) {
    ok += 1
    console.log(`  OK ${p.name} (${result.dims} dims)`)
  } else {
    fail += 1
    console.log(`  FAIL ${p.name}: ${result.reason}`)
  }
  await new Promise((r) => setTimeout(r, config.search.syncDelayMs))
}

console.log(`Done: ${ok} ok, ${fail} failed`)
await mongoose.disconnect()
