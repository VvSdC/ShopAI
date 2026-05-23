import mongoose from 'mongoose'
import {
  startOfDay,
  endOfDay,
  isCouponExpired,
  daysLeftLabel,
} from '../utils/couponDates.js'

const Schema = mongoose.Schema

const CouponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
    },
    startDate: {
      type: Date,
      required: true,
    },
    endDate: {
      type: Date,
      required: true,
    },
    discount: {
      type: Number,
      required: true,
      default: 0,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
)

CouponSchema.virtual('isExpired').get(function () {
  return isCouponExpired(this)
})

CouponSchema.virtual('daysLeft').get(function () {
  return daysLeftLabel(this.endDate)
})

CouponSchema.pre('validate', function (next) {
  if (this.endDate && this.startDate && endOfDay(this.endDate) < startOfDay(this.startDate)) {
    next(new Error('End date must be on or after the start date'))
    return
  }
  if (this.discount <= 0 || this.discount > 100) {
    next(new Error('Discount must be between 1 and 100'))
    return
  }
  next()
})

const Coupon = mongoose.model('Coupon', CouponSchema)

export default Coupon
