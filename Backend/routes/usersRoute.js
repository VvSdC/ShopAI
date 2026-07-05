import express from "express";
import {
  registerUserCtrl,
  loginUserCtrl,
  getUserProfileCtrl,
  updateProfileCtrl,
  updateShippingAddressCtrl,
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
  verifyEmailCtrl,
  resendVerificationCtrl,
  changePasswordCtrl,
} from "../controllers/usersCtrl.js";
import { isLoggedIn } from "../middlewares/isLoggedin.js";
import isAdmin from "../middlewares/isAdmin.js";
import { validate } from "../middlewares/validate.js";
import { csrfTokenHandler } from "../middlewares/csrfProtection.js";
import { validateObjectId } from "../middlewares/validateObjectId.js";
import { authLimiter, otpConsumeLimiter, otpResendLimiter } from "../config/rateLimiters.js";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  resetPasswordSchema,
  verifyEmailSchema,
  resendVerificationSchema,
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
userRoutes.post("/forgot-password", authLimiter, otpResendLimiter, forgotPasswordCtrl);
userRoutes.post("/verify-otp", authLimiter, otpConsumeLimiter, verifyOTPCtrl);
userRoutes.post("/reset-password", authLimiter, otpConsumeLimiter, validate(resetPasswordSchema), resetPasswordCtrl);
userRoutes.post("/verify-email", authLimiter, otpConsumeLimiter, validate(verifyEmailSchema), verifyEmailCtrl);
userRoutes.post("/resend-verification", authLimiter, otpResendLimiter, validate(resendVerificationSchema), resendVerificationCtrl);
userRoutes.put("/change-password", isLoggedIn, validate(changePasswordSchema), changePasswordCtrl);
userRoutes.get("/me", isLoggedIn, getCurrentUserCtrl);
userRoutes.get("/profile", isLoggedIn, getUserProfileCtrl);
userRoutes.put("/update/profile", isLoggedIn, updateProfileCtrl);
userRoutes.get("/all", isLoggedIn, isAdmin, getAllUsersCtrl);
userRoutes.put("/update/shipping", isLoggedIn, updateShippingAddressCtrl);
userRoutes.put("/update/shipping/:addressId", isLoggedIn, validateObjectId('addressId'), editShippingAddressCtrl);
userRoutes.delete("/update/shipping/:addressId", isLoggedIn, validateObjectId('addressId'), deleteShippingAddressCtrl);
userRoutes.put("/block/:id", isLoggedIn, isAdmin, validateObjectId('id'), toggleBlockUserCtrl);
userRoutes.delete("/delete-account", isLoggedIn, deleteAccountCtrl);
export default userRoutes;
