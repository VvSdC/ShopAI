import express from "express";
import {
  registerUserCtrl,
  loginUserCtrl,
  getUserProfileCtrl,
  updateProfileCtrl,
  updateShippingAddresctrl,
  editShippingAddressCtrl,
  deleteShippingAddressCtrl,
  refreshTokenCtrl,
  logoutUserCtrl,
  getCurrentUserCtrl,
  toggleBlockUserCtrl,
  deleteAccountCtrl,
  getAllUsersCtrl,
  forgotPasswordCtrl,
  verifyOTPCtrl,
  resetPasswordCtrl,
} from "../controllers/usersCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import isAdmin from "../middlewares/isAdmin.js";
import { validate } from "../middlewares/validate.js";
import { registerSchema, loginSchema } from "../validations/authSchemas.js";

const userRoutes = express.Router();

userRoutes.post("/register", validate(registerSchema), registerUserCtrl);
userRoutes.post("/login", validate(loginSchema), loginUserCtrl);
userRoutes.post("/refresh", refreshTokenCtrl);
userRoutes.post("/logout", logoutUserCtrl);
userRoutes.post("/forgot-password", forgotPasswordCtrl);
userRoutes.post("/verify-otp", verifyOTPCtrl);
userRoutes.post("/reset-password", resetPasswordCtrl);
userRoutes.get("/me", isLoggedIn, getCurrentUserCtrl);
userRoutes.get("/profile", isLoggedIn, getUserProfileCtrl);
userRoutes.put("/update/profile", isLoggedIn, updateProfileCtrl);
userRoutes.get("/all", isLoggedIn, isAdmin, getAllUsersCtrl);
userRoutes.put("/update/shipping", isLoggedIn, updateShippingAddresctrl);
userRoutes.put("/update/shipping/:addressId", isLoggedIn, editShippingAddressCtrl);
userRoutes.delete("/update/shipping/:addressId", isLoggedIn, deleteShippingAddressCtrl);
userRoutes.put("/block/:id", isLoggedIn, isAdmin, toggleBlockUserCtrl);
userRoutes.delete("/delete-account", isLoggedIn, deleteAccountCtrl);
export default userRoutes;
