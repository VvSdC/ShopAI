import express from "express";
import {
  createReviewCtrl,
  updateReviewCtrl,
  deleteReviewCtrl,
} from "../controllers/reviewsCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";

const reviewRouter = express.Router();

reviewRouter.post("/:productID", isLoggedIn, createReviewCtrl);
reviewRouter.put("/:id", isLoggedIn, updateReviewCtrl);
reviewRouter.delete("/:id/product/:productID", isLoggedIn, deleteReviewCtrl);

export default reviewRouter;
