/**
 * One-time migration: convert Product.brand string values to Brand ObjectId refs.
 *
 * Usage (from Backend/):
 *   node scripts/migrateProductBrandToRef.js
 */
import mongoose from 'mongoose'
import { config } from '../config/env.js'
import Brand from '../model/Brand.js'
import Product from '../model/Product.js'
import User from '../model/User.js'
import logger from '../utils/logger.js'

async function ensureBrandForName(name, fallbackUserId) {
  const normalized = String(name || '').trim().toLowerCase()
  if (!normalized) return null

  let brand = await Brand.findOne({ name: normalized })
  if (!brand) {
    brand = await Brand.create({ name: normalized, user: fallbackUserId })
    logger.log(`[migrate] created brand "${normalized}"`)
  }
  return brand._id
}

async function main() {
  await mongoose.connect(config.db.mongoUrl)
  logger.log('[migrate] connected')

  const fallbackUser =
    (await User.findOne({ isAdmin: true }).select('_id')) ||
    (await User.findOne().select('_id'))

  if (!fallbackUser) {
    throw new Error('No users found — cannot create missing Brand rows')
  }

  const products = await Product.find({ brand: { $type: 'string' } }).select('_id brand')
  logger.log(`[migrate] found ${products.length} product(s) with string brand`)

  let updated = 0
  for (const product of products) {
    const brandId = await ensureBrandForName(product.brand, fallbackUser._id)
    if (!brandId) continue
    await Product.updateOne({ _id: product._id }, { $set: { brand: brandId } })
    updated += 1
  }

  logger.log(`[migrate] updated ${updated} product(s)`)
  await mongoose.disconnect()
}

main().catch((err) => {
  logger.error('[migrate] failed:', err)
  process.exit(1)
})
