import mongoose from 'mongoose'

const cartItemSchema = new mongoose.Schema(
  {
    _id: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
    },
    name: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
    price: { type: Number, required: true },
    totalPrice: { type: Number, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' },
  },
  { _id: false }
)

const CartSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    items: {
      type: [cartItemSchema],
      default: [],
    },
    couponCode: {
      type: String,
      default: null,
    },
  },
  { timestamps: true }
)

const Cart = mongoose.model('Cart', CartSchema)

export default Cart
