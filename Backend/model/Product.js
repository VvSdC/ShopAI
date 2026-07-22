//product schema
import mongoose from 'mongoose'
import { PRODUCT_NAME_COLLATION } from '../utils/productName.js'
const Schema = mongoose.Schema

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Brand',
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    /** How sizes are defined for this product (none, apparel preset, numeric, custom). */
    sizeMeasurementType: {
      type: String,
      enum: ['none', 'apparel', 'numeric', 'custom'],
      default: 'apparel',
    },
    /** Customer-facing label for the size selector (e.g. "UK shoe size"). */
    sizeLabel: {
      type: String,
      trim: true,
      default: 'Size',
    },
    sizes: {
      type: [String],
      default: [],
    },
    colors: {
      type: [String],
      required: true,
    },

    /** Admin who created the product (audit only — not exposed on public catalog). */
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    images: [
      {
        type: String,
        required: true,
      },
    ],

    price: {
      type: Number,
      required: true,
    },

    totalQty: {
      type: Number,
      required: true,
    },
    totalSold: {
      type: Number,
      required: true,
      default: 0,
    },
    tags: {
      type: [String],
      default: [],
    },
    searchDocument: {
      type: String,
      default: '',
    },
    embedding: {
      // Stored for local cosine fallback and Atlas $vectorSearch (requires a separate
      // Atlas Vector Search index — not a Mongoose schema.index() call).
      type: [Number],
      default: undefined,
    },
    embeddingProvider: String,
    embeddingModel: String,
    embeddingVersion: Number,
    /** Vector length at index time — used to detect provider/dimension drift. */
    embeddingDimension: Number,
    embeddedAt: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(_doc, ret) {
        if (ret.category && typeof ret.category === 'object' && ret.category.name) {
          ret.category = ret.category.name
        }
        if (ret.brand && typeof ret.brand === 'object' && ret.brand.name) {
          ret.brand = ret.brand.name
        }
        delete ret.user
        return ret
      },
    },
  }
)
// qty left (inventory only — review stats come from Review.product via productListStats)
ProductSchema.virtual('qtyLeft').get(function () {
  return this.totalQty - this.totalSold
})
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' })
ProductSchema.index({ name: 1 }, { unique: true, collation: PRODUCT_NAME_COLLATION })
ProductSchema.index({ category: 1 })
ProductSchema.index({ brand: 1 })
ProductSchema.index({ price: 1 })
ProductSchema.index({ tags: 1 })
ProductSchema.index({ user: 1, createdAt: -1 })

const Product = mongoose.model('Product', ProductSchema)

export default Product
