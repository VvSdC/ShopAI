import express from "express";
import {
  createReviewCtrl,
  updateReviewCtrl,
  deleteReviewCtrl,
} from "../controllers/reviewsCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import { validate } from "../middlewares/validate.js";
import { createReviewSchema, updateReviewSchema } from "../validations/reviewSchemas.js";

const reviewRouter = express.Router();

reviewRouter.post("/:productID", isLoggedIn, validate(createReviewSchema), createReviewCtrl);
reviewRouter.put("/:id", isLoggedIn, validate(updateReviewSchema), updateReviewCtrl);
reviewRouter.delete("/:id/product/:productID", isLoggedIn, deleteReviewCtrl);

export default reviewRouter;
