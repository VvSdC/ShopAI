/**
 * One-time migration: convert Product.category string names to Category ObjectIds.
 * Run: node scripts/migrate-product-category-refs.js
 */
import mongoose from 'mongoose'
import dotenv from 'dotenv'
import Product from '../model/Product.js'
import Category from '../model/Category.js'

dotenv.config()

async function main() {
  await mongoose.connect(process.env.MONGO_URL)
  const products = await Product.collection.find({ category: { $type: 'string' } }).toArray()

  let updated = 0
  let skipped = 0

  for (const doc of products) {
    const categoryName = String(doc.category || '').trim()
    if (!categoryName) {
      skipped += 1
      continue
    }

    const category = await Category.findOne({
      name: { $regex: `^${categoryName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' },
    })

    if (!category) {
      console.warn(`No Category for product ${doc._id} (${doc.name}): "${categoryName}"`)
      skipped += 1
      continue
    }

    await Product.collection.updateOne(
      { _id: doc._id },
      { $set: { category: category._id } }
    )
    updated += 1
  }

  console.log(`Migration complete. Updated: ${updated}, skipped: ${skipped}`)
  await mongoose.disconnect()
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
