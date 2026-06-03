//product schema
import mongoose from 'mongoose'
const Schema = mongoose.Schema

const ProductSchema = new Schema(
  {
    name: {
      type: String,
      required: true,
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
      type: String,
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

    user: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
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
      type: [Number],
      default: undefined,
    },
    embeddingProvider: String,
    embeddingModel: String,
    embeddingVersion: Number,
    embeddedAt: Date,
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
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
ProductSchema.index({ embedding: 1 }, { sparse: true })

const Product = mongoose.model('Product', ProductSchema)

export default Product
