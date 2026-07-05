import express from "express";
import {
  createReviewCtrl,
  updateReviewCtrl,
  deleteReviewCtrl,
} from "../controllers/reviewsCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import { validate } from "../middlewares/validate.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { createReviewSchema, updateReviewSchema } from "../validations/reviewSchemas.js";

const reviewRouter = express.Router();

reviewRouter.post("/:productID", isLoggedIn, validateObjectId('productID'), validate(createReviewSchema), createReviewCtrl);
reviewRouter.put("/:id", isLoggedIn, validateObjectId('id'), validate(updateReviewSchema), updateReviewCtrl);
reviewRouter.delete("/:id/product/:productID", isLoggedIn, validateObjectId('id', 'productID'), deleteReviewCtrl);

export default reviewRouter;
