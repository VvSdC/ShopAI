import express from "express";
import {
  createBrandCtrl,
  deleteBrandCtrl,
  getAllBrandsCtrl,
  getSingleBrandCtrl,
  updateBrandCtrl,
} from "../controllers/brandsCtrl.js";
import isAdmin from "../middlewares/isAdmin.js";

import { isLoggedIn } from "../middlewares/isLoggedin.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";

const brandsRouter = express.Router();

brandsRouter.post("/", isLoggedIn, isAdmin, createBrandCtrl);
brandsRouter.get("/", getAllBrandsCtrl);
brandsRouter.get("/:id", validateObjectId('id'), getSingleBrandCtrl);
brandsRouter.delete("/:id", isLoggedIn, isAdmin, validateObjectId('id'), deleteBrandCtrl);
brandsRouter.put("/:id", isLoggedIn, isAdmin, validateObjectId('id'), updateBrandCtrl);

export default brandsRouter;
