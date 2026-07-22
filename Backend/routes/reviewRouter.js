import express from "express";
import {
  createReviewCtrl,
  updateReviewCtrl,
  deleteReviewCtrl,
  listAdminReviewsCtrl,
  moderateReviewCtrl,
} from "../controllers/reviewsCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import isAdmin from "../middlewares/isAdmin.js";
import { validate } from "../middlewares/validate.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import {
  createReviewSchema,
  updateReviewSchema,
  adminModerateReviewSchema,
} from "../validations/reviewSchemas.js";

const reviewRouter = express.Router();

reviewRouter.get("/admin/all", isLoggedIn, isAdmin, listAdminReviewsCtrl);
reviewRouter.put(
  "/admin/:id/moderate",
  isLoggedIn,
  isAdmin,
  validateObjectId("id"),
  validate(adminModerateReviewSchema),
  moderateReviewCtrl
);

reviewRouter.post("/:productID", isLoggedIn, validateObjectId('productID'), validate(createReviewSchema), createReviewCtrl);
reviewRouter.put("/:id", isLoggedIn, validateObjectId('id'), validate(updateReviewSchema), updateReviewCtrl);
reviewRouter.delete("/:id/product/:productID", isLoggedIn, validateObjectId('id', 'productID'), deleteReviewCtrl);

export default reviewRouter;
