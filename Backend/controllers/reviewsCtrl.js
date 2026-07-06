import asyncHandler from "express-async-handler";
import Product from "../model/Product.js";
import Review from "../model/Review.js";
import User from "../model/User.js";
import { AppError } from "../utils/appError.js";
import { moderateReviewInBackground } from "../services/moderationQueue.js";
import { userHasDeliveredPurchase } from "../services/reviewPurchaseVerification.js";

// @desc    Create new review
// @route   POST /api/v1/reviews/:productID
// @access  Private

export const createReviewCtrl = asyncHandler(async (req, res) => {
  const { message, rating } = req.body;
  const { productID } = req.params;

  const reviewer = await User.findById(req.userAuthId).select("isEmailVerified");
  if (reviewer?.isEmailVerified === false) {
    throw new AppError("Verify your email before leaving a review.", 403);
  }

  const productFound = await Product.findById(productID);
  if (!productFound) {
    throw new AppError("Product Not Found", 404);
  }

  const hasReviewed = await Review.findOne({
    product: productID,
    user: req.userAuthId,
  });
  if (hasReviewed) {
    throw new AppError("You have already reviewed this product", 409);
  }

  const verifiedPurchase = await userHasDeliveredPurchase(
    req.userAuthId,
    productFound._id
  );

  const review = await Review.create({
    message,
    rating,
    product: productFound._id,
    user: req.userAuthId,
    verifiedPurchase,
  });

  moderateReviewInBackground(review._id);

  res.status(201).json({
    success: true,
    message: "Review submitted — checking content...",
  });
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
export const updateReviewCtrl = asyncHandler(async (req, res) => {
  const { message, rating } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError("Review not found", 404);
  }
  if (review.user.toString() !== req.userAuthId.toString()) {
    throw new AppError("You can only update your own review", 403);
  }
  review.message = message !== undefined ? message : review.message;
  review.rating = rating !== undefined ? rating : review.rating;
  review.moderationStatus = "pending";
  review.moderationReason = "";
  review.tags = [];
  review.verifiedPurchase = await userHasDeliveredPurchase(
    req.userAuthId,
    review.product
  );
  await review.save();

  moderateReviewInBackground(review._id);

  res.json({
    success: true,
    message: "Review updated — re-checking content...",
    review,
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id/product/:productID
// @access  Private
export const deleteReviewCtrl = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new AppError("Review not found", 404);
  }
  //check ownership
  if (review.user.toString() !== req.userAuthId.toString()) {
    throw new AppError("You can only delete your own review", 403);
  }
  await Review.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Review deleted successfully",
  });
});
