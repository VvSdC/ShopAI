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
  changePasswordCtrl,
} from "../controllers/usersCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import isAdmin from "../middlewares/isAdmin.js";
import { validate } from "../middlewares/validate.js";
import { csrfTokenHandler } from "../middlewares/csrfProtection.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
} from "../validations/authSchemas.js";

const userRoutes = express.Router();

userRoutes.get("/csrf-token", csrfTokenHandler);

/** Mounted in app.js with authLimiter only (before apiLimiter). */
export const loginRoute = express.Router();
loginRoute.post("/", validate(loginSchema), loginUserCtrl);

export const registerRoute = express.Router();
registerRoute.post("/", validate(registerSchema), registerUserCtrl);

userRoutes.post("/refresh", refreshTokenCtrl);
userRoutes.post("/logout", logoutUserCtrl);
userRoutes.post("/forgot-password", forgotPasswordCtrl);
userRoutes.post("/verify-otp", verifyOTPCtrl);
userRoutes.post("/reset-password", validate(resetPasswordSchema), resetPasswordCtrl);
userRoutes.put("/change-password", isLoggedIn, validate(changePasswordSchema), changePasswordCtrl);
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
