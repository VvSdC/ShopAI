import asyncHandler from "express-async-handler";
import Product from "../model/Product.js";
import Review from "../model/Review.js";

// @desc    Create new review
// @route   POST /api/v1/reviews/:productID
// @access  Private

export const createReviewCtrl = asyncHandler(async (req, res) => {
  const { message, rating } = req.body;
  //1. Find the product
  const { productID } = req.params;
  const productFound = await Product.findById(productID).populate("reviews");
  if (!productFound) {
    throw new Error("Product Not Found");
  }
  //check if user already reviewed this product
  const hasReviewed = productFound?.reviews?.find((review) => {
    return review?.user?.toString() === req?.userAuthId?.toString();
  });
  if (hasReviewed) {
    throw new Error("You have already reviewed this product");
  }
  //create review
  const review = await Review.create({
    message,
    rating,
    product: productFound?._id,
    user: req.userAuthId,
  });
  //Push review into product Found
  productFound.reviews.push(review?._id);
  //resave
  await productFound.save();
  res.status(201).json({
    success: true,
    message: "Review created successfully",
  });
});

// @desc    Update review
// @route   PUT /api/v1/reviews/:id
// @access  Private
export const updateReviewCtrl = asyncHandler(async (req, res) => {
  const { message, rating } = req.body;
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new Error("Review not found");
  }
  //check ownership
  if (review.user.toString() !== req.userAuthId.toString()) {
    throw new Error("You can only update your own review");
  }
  review.message = message !== undefined ? message : review.message;
  review.rating = rating !== undefined ? rating : review.rating;
  await review.save();

  res.json({
    success: true,
    message: "Review updated successfully",
    review,
  });
});

// @desc    Delete review
// @route   DELETE /api/v1/reviews/:id/product/:productID
// @access  Private
export const deleteReviewCtrl = asyncHandler(async (req, res) => {
  const review = await Review.findById(req.params.id);
  if (!review) {
    throw new Error("Review not found");
  }
  //check ownership
  if (review.user.toString() !== req.userAuthId.toString()) {
    throw new Error("You can only delete your own review");
  }
  //remove review reference from product
  await Product.findByIdAndUpdate(req.params.productID, {
    $pull: { reviews: review._id },
  });
  await Review.findByIdAndDelete(req.params.id);

  res.json({
    success: true,
    message: "Review deleted successfully",
  });
});
