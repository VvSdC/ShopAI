import asyncHandler from 'express-async-handler'
import Coupon from '../model/Coupon.js'
import {
  normalizeCouponDates,
  assertCouponDateRange,
  isCouponLive,
  isCouponNotStarted,
  isCouponExpired,
  daysLeftLabel,
} from '../utils/couponDates.js'

// @desc    Create new Coupon
// @route   POST /api/v1/coupons
// @access  Private/Admin

export const createCouponCtrl = asyncHandler(async (req, res) => {
  const { code, startDate, endDate, discount } = req.body

  const couponsExists = await Coupon.findOne({
    code: String(code || '').toUpperCase().trim(),
  })
  if (couponsExists) {
    throw new Error('Coupon already exists')
  }
  if (isNaN(discount)) {
    throw new Error('Discount value must be a number')
  }

  const dates = normalizeCouponDates({ startDate, endDate })
  assertCouponDateRange(dates.startDate, dates.endDate)

  const coupon = await Coupon.create({
    code: String(code).toUpperCase().trim(),
    startDate: dates.startDate,
    endDate: dates.endDate,
    discount,
    user: req.userAuthId,
  })

  res.status(201).json({
    status: 'success',
    message: 'Coupon created successfully',
    coupon,
  })
})

// @desc    Get currently active coupon for storefront
// @route   GET /api/v1/coupons/active
// @access  Public

export const getActiveCouponCtrl = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 }).select('code discount startDate endDate')

  const coupon = coupons.find((c) => isCouponLive(c))

  res.status(200).json({
    status: 'success',
    coupon: coupon
      ? {
          code: coupon.code,
          discount: coupon.discount,
          daysLeft: daysLeftLabel(coupon.endDate),
          isExpired: false,
        }
      : null,
  })
})

// @desc    Get all coupons
// @route   GET /api/v1/coupons
// @access  Private/Admin

export const getAllCouponsCtrl = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 })
  res.status(200).json({
    status: 'success',
    message: 'All coupons',
    coupons,
  })
})

// @desc    Get single coupon (apply at checkout)
// @route   GET /api/v1/coupons/single
// @access  Private

export const getCouponCtrl = asyncHandler(async (req, res) => {
  const code = String(req.query.code || '').toUpperCase().trim()
  const coupon = await Coupon.findOne({ code })
  if (!coupon) {
    throw new Error('Coupon not found')
  }
  if (isCouponNotStarted(coupon)) {
    throw new Error('This coupon is not active yet')
  }
  if (isCouponExpired(coupon)) {
    throw new Error('This coupon has expired')
  }

  res.json({
    status: 'success',
    message: 'Coupon fetched',
    coupon,
  })
})

export const updateCouponCtrl = asyncHandler(async (req, res) => {
  const { code, startDate, endDate, discount } = req.body
  const dates = normalizeCouponDates({ startDate, endDate })
  assertCouponDateRange(dates.startDate, dates.endDate, { allowPastStart: true })

  const coupon = await Coupon.findByIdAndUpdate(
    req.params.id,
    {
      code: code?.toUpperCase().trim(),
      discount,
      startDate: dates.startDate,
      endDate: dates.endDate,
    },
    { new: true, runValidators: true }
  )
  res.json({
    status: 'success',
    message: 'Coupon updated successfully',
    coupon,
  })
})

export const deleteCouponCtrl = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id)
  res.json({
    status: 'success',
    message: 'Coupon deleted successfully',
    coupon,
  })
})
