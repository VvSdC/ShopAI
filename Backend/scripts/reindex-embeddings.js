/**
 * Backfill searchDocument + embeddings for all products.
 * Usage: node scripts/reindex-embeddings.js
 */
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'
import mongoose from 'mongoose'
import Product from '../model/Product.js'
import { indexProductEmbedding } from '../services/search/vectorIndexService.js'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
dotenv.config({ path: path.join(__dirname, '..', '.env') })

const mongoUrl = process.env.MONGO_URL || 'mongodb://127.0.0.1:27017/ShopAI'

await mongoose.connect(mongoUrl)
const products = await Product.find({}).select('_id name')
console.log(`Reindexing ${products.length} products...`)

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
}

console.log(`Done: ${ok} ok, ${fail} failed`)
await mongoose.disconnect()
