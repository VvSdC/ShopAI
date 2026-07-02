import mongoose from 'mongoose'

const wishlistItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    image: { type: String, default: '' },
    brand: { type: String, default: '' },
  },
  { _id: false }
)

const WishlistSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [wishlistItemSchema],
      default: [],
    },
  },
  { timestamps: true }
)

const Wishlist = mongoose.model('Wishlist', WishlistSchema)

export default Wishlist
