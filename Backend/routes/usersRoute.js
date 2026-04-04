import express from "express";
import {
  registerUserCtrl,
  loginUserCtrl,
  getUserProfileCtrl,
  updateShippingAddresctrl,
  refreshTokenCtrl,
  logoutUserCtrl,
  getCurrentUserCtrl,
} from "../controllers/usersCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";

const userRoutes = express.Router();

userRoutes.post("/register", registerUserCtrl);
userRoutes.post("/login", loginUserCtrl);
userRoutes.post("/refresh", refreshTokenCtrl);
userRoutes.post("/logout", logoutUserCtrl);
userRoutes.get("/me", isLoggedIn, getCurrentUserCtrl);
userRoutes.get("/profile", isLoggedIn, getUserProfileCtrl);
userRoutes.put("/update/shipping", isLoggedIn, updateShippingAddresctrl);
export default userRoutes;
