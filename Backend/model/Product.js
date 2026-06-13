//product schema
import mongoose from 'mongoose'
const Schema = mongoose.Schema

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    brand: {
      type: String,
      required: true,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: true,
    },
    sizes: {
      type: [String],
      enum: ['S', 'M', 'L', 'XL', 'XXL'],
      required: true,
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

    reviews: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Review',
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
        delete ret.user
        return ret
      },
    },
  }
)
//Virtuals
//qty left
ProductSchema.virtual('qtyLeft').get(function () {
  const product = this
  return product.totalQty - product.totalSold
})
function approvedReviewsForProduct(product) {
  return (product?.reviews || []).filter((review) => {
    const status = review?.moderationStatus
    return !status || status === 'approved'
  })
}

//Total rating (approved reviews only)
ProductSchema.virtual('totalReviews').get(function () {
  return approvedReviewsForProduct(this).length
})
//average Rating (approved reviews only)
ProductSchema.virtual('averageRating').get(function () {
  const approved = approvedReviewsForProduct(this)
  if (!approved.length) return 0
  let ratingsTotal = 0
  approved.forEach((review) => {
    ratingsTotal += review?.rating
  })
  return Number(ratingsTotal / approved.length).toFixed(1)
})
ProductSchema.index({ name: 'text', description: 'text', tags: 'text' })
ProductSchema.index({ category: 1 })
ProductSchema.index({ brand: 1 })
ProductSchema.index({ price: 1 })
ProductSchema.index({ tags: 1 })
ProductSchema.index({ user: 1, createdAt: -1 })

const Product = mongoose.model('Product', ProductSchema)

export default Product
