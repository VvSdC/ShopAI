import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Order from "../model/Order.js";
import Cart from "../model/Cart.js";
import User, { SAFE_USER_SELECT } from "../model/User.js";
import {
  generateAccessToken,
} from "../utils/generateToken.js";
import { sendPasswordResetOTPEmail } from "../services/emailService.js";
import { scheduleWelcomeEmail } from "../services/emailQueue.js";
import {
  clearAuthCookies,
  createAuthSession,
  invalidateUserRefreshToken,
  revokeAuthSession,
  resolveDeviceId,
  formatDeviceIdCookie,
  rotateRefreshToken,
  verifyRefreshToken,
} from "../utils/authSessions.js";
import config from "../config/env.js";
import { AppError } from "../utils/appError.js";
import {
  getAccessCookieOptions,
  getDeviceCookieOptions,
  getRefreshCookieOptions,
} from "../utils/cookieOptions.js";

// Cookie options — sameSite:'none' in production for Netlify + Render cross-origin deploy
const accessCookieOptions = getAccessCookieOptions();
const refreshCookieOptions = getRefreshCookieOptions();
const deviceCookieOptions = getDeviceCookieOptions();

// @desc    Register user
// @route   POST /api/v1/users/register
// @access  Private/Admin

export const registerUserCtrl = asyncHandler(async (req, res) => {
  const { fullname, email, password, phone, country } = req.body;
  //Check user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    throw new AppError("User already exists", 409);
  }
  //hash password
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(password, salt);
  const user = await User.create({
    fullname,
    email,
    password: hashedPassword,
    phone,
    country,
  });
  scheduleWelcomeEmail(user.email, user.fullname);

  res.status(201).json({
    status: "success",
    message: "User Registered Successfully",
    data: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      country: user.country,
    },
  });
});
// @desc    Login user
// @route   POST /api/v1/users/login
// @access  Public

export const loginUserCtrl = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  //Find the user in db by email only
  const userFound = await User.findOne({
    email,
  });
  if (userFound && (await bcrypt.compare(password, userFound?.password))) {
    //Check if user is blocked
    if (userFound.isBlocked) {
      throw new AppError(
        "Your account has been blocked due to malicious activity. Please contact support.",
        403
      );
    }
    const accessToken = generateAccessToken(userFound);
    const deviceId = resolveDeviceId(req);
    const { refreshToken } = await createAuthSession(userFound._id, deviceId);
    res.cookie("shopai_token", accessToken, accessCookieOptions);
    res.cookie("shopai_refresh_token", refreshToken, refreshCookieOptions);
    res.cookie("shopai_device_id", formatDeviceIdCookie(deviceId), deviceCookieOptions);
    res.json({
      status: "success",
      message: "User logged in successfully",
    });
  } else {
    throw new AppError("Invalid login credentials", 401);
  }
});

// @desc    Refresh access token
// @route   POST /api/v1/users/refresh
// @access  Public
export const refreshTokenCtrl = asyncHandler(async (req, res) => {
  const refreshToken = req?.cookies?.shopai_refresh_token;
  if (!refreshToken) {
    throw new AppError("No refresh token, please login again", 401);
  }

  let decoded;
  try {
    decoded = verifyRefreshToken(refreshToken);
  } catch {
    throw new AppError("Invalid refresh token, please login again", 401);
  }

  const rotation = await rotateRefreshToken(refreshToken, decoded.id, res);
  if (rotation?.blocked) {
    throw new AppError(
      "Your account has been blocked due to malicious activity. Please contact support.",
      403
    );
  }
  if (!rotation) {
    throw new AppError("Invalid refresh token, please login again", 401);
  }

  const { user, newRefreshToken } = rotation;
  const newAccessToken = generateAccessToken(user);
  res.cookie("shopai_token", newAccessToken, accessCookieOptions);
  res.cookie("shopai_refresh_token", newRefreshToken, refreshCookieOptions);
  res.json({
    status: "success",
    message: "Token refreshed successfully",
  });
});

// @desc    Logout user
// @route   POST /api/v1/users/logout
// @access  Private
export const logoutUserCtrl = asyncHandler(async (req, res) => {
  const refreshToken = req?.cookies?.shopai_refresh_token;
  if (refreshToken) {
    // Verify and clear refresh token from DB
    try {
      const decoded = verifyRefreshToken(refreshToken);
      await revokeAuthSession(decoded.id, refreshToken);
    } catch (err) {
      // Token invalid, just clear cookies
    }
  }
  clearAuthCookies(res);
  res.json({
    status: "success",
    message: "User logged out successfully",
  });
});

// @desc    Get current user from token
// @route   GET /api/v1/users/me
// @access  Private
export const getCurrentUserCtrl = asyncHandler(async (req, res) => {
  // Token is already verified by isLoggedIn middleware
  // Decode claims from the access token cookie
  const token = req?.cookies?.shopai_token;
  const decoded = jwt.verify(token, config.auth.jwtKey);
  // Fetch latest user fields from DB to include email and createdAt
  const user = await User.findById(decoded.id).select(
    'fullname email isAdmin hasShippingAddress createdAt'
  );
  if (!user) {
    throw new AppError('User not found', 404);
  }
  res.json({
    status: 'success',
    user,
  });
});

// @desc    Get user profile
// @route   GET /api/v1/users/profile
// @access  Private
export const getUserProfileCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.userAuthId)
    .select(SAFE_USER_SELECT)
    .populate("orders");
  res.json({
    status: "success",
    message: "User profile fetched successfully",
    user,
  });
});

// @desc    Update user profile (name, email, phone)
// @route   PUT /api/v1/users/update/profile
// @access  Private
export const updateProfileCtrl = asyncHandler(async (req, res) => {
  const { fullname, email, phone, country } = req.body;
  const user = await User.findById(req.userAuthId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (email && email !== user.email) {
    const emailTaken = await User.findOne({ email });
    if (emailTaken) {
      throw new AppError("Email is already in use", 409);
    }
    user.email = email;
  }
  if (fullname) user.fullname = fullname;
  if (phone !== undefined) user.phone = phone;
  if (country !== undefined) user.country = country;
  await user.save();
  res.json({
    status: "success",
    message: "Profile updated successfully",
    user: {
      _id: user._id,
      fullname: user.fullname,
      email: user.email,
      phone: user.phone,
      country: user.country,
    },
  });
});

// @desc    Change password (logged-in user)
// @route   PUT /api/v1/users/change-password
// @access  Private
export const changePasswordCtrl = asyncHandler(async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  const user = await User.findById(req.userAuthId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  const matchesCurrent = await bcrypt.compare(currentPassword, user.password);
  if (!matchesCurrent) {
    throw new AppError("Current password is incorrect", 400);
  }

  const sameAsOld = await bcrypt.compare(newPassword, user.password);
  if (sameAsOld) {
    throw new AppError("New password must be different from your current password", 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(newPassword, salt);
  await invalidateUserRefreshToken(user);

  clearAuthCookies(res);
  res.json({
    status: "success",
    message: "Password changed successfully. Please log in again.",
  });
});

// @desc    Update user shipping address
// @route   PUT /api/v1/users/update/shipping
// @access  Private

export const updateShippingAddressCtrl = asyncHandler(async (req, res) => {
  const {
    firstName,
    lastName,
    address,
    city,
    postalCode,
    province,
    phone,
    country,
  } = req.body;
  const user = await User.findById(req.userAuthId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  user.shippingAddresses.push({
    firstName,
    lastName,
    address,
    city,
    postalCode,
    province,
    phone,
    country,
  });
  user.hasShippingAddress = true;
  await user.save();
  const safeUser = await User.findById(req.userAuthId).select(SAFE_USER_SELECT);
  res.json({
    status: "success",
    message: "Shipping address added successfully",
    user: safeUser,
  });
});

// @desc    Edit a shipping address
// @route   PUT /api/v1/users/update/shipping/:addressId
// @access  Private

export const editShippingAddressCtrl = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const {
    firstName,
    lastName,
    address,
    city,
    postalCode,
    province,
    phone,
    country,
  } = req.body;
  const user = await User.findById(req.userAuthId);
  const addr = user.shippingAddresses.id(addressId);
  if (!addr) {
    throw new AppError("Address not found", 404);
  }
  addr.firstName = firstName;
  addr.lastName = lastName;
  addr.address = address;
  addr.city = city;
  addr.postalCode = postalCode;
  addr.province = province;
  addr.phone = phone;
  addr.country = country;
  await user.save();
  const safeUser = await User.findById(req.userAuthId).select(SAFE_USER_SELECT);
  res.json({
    status: "success",
    message: "Shipping address updated successfully",
    user: safeUser,
  });
});

// @desc    Delete a shipping address
// @route   DELETE /api/v1/users/update/shipping/:addressId
// @access  Private

export const deleteShippingAddressCtrl = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.userAuthId);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  user.shippingAddresses.pull(addressId);
  if (user.shippingAddresses.length === 0) {
    user.hasShippingAddress = false;
  }
  await user.save();
  const safeUser = await User.findById(req.userAuthId).select(SAFE_USER_SELECT);
  res.json({
    status: "success",
    message: "Shipping address deleted successfully",
    user: safeUser,
  });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin

export const getAllUsersCtrl = asyncHandler(async (req, res) => {
  const users = await User.find().select(SAFE_USER_SELECT);
  res.json({
    status: "success",
    message: "All users fetched",
    users,
  });
});

// @desc    Block/Unblock a user
// @route   PUT /api/v1/users/block/:id
// @access  Private/Admin

export const toggleBlockUserCtrl = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    throw new AppError("User not found", 404);
  }
  if (user.isAdmin) {
    throw new AppError("Cannot block an admin user", 403);
  }
  user.isBlocked = !user.isBlocked;
  await user.save();
  if (user.isBlocked) {
    await invalidateUserRefreshToken(user);
  }
  const safeUser = await User.findById(user._id).select(SAFE_USER_SELECT);
  res.json({
    status: "success",
    message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
    user: safeUser,
  });
});

// @desc    Delete own account (keeps orders)
// @route   DELETE /api/v1/users/delete-account
// @access  Private

export const deleteAccountCtrl = asyncHandler(async (req, res) => {
  const userId = req.userAuthId;
  await Order.updateMany({ user: userId }, { $unset: { user: "" } });
  await Cart.deleteOne({ user: userId });
  await User.findByIdAndDelete(userId);
  clearAuthCookies(res);
  res.json({
    status: "success",
    message: "Account deleted successfully",
  });
});

// @desc    Forgot password — send OTP email
// @route   POST /api/v1/users/forgot-password
// @access  Public
export const forgotPasswordCtrl = asyncHandler(async (req, res) => {
  const { email } = req.body;
  const user = await User.findOne({ email: email?.toLowerCase()?.trim() });
  if (!user) {
    return res.json({
      status: "success",
      message: "If an account with that email exists, a reset OTP has been sent.",
    });
  }
  const otp = await user.createPasswordResetOTP();
  await user.save({ validateBeforeSave: false });

  await sendPasswordResetOTPEmail(user.email, user.fullname, otp);

  res.json({
    status: "success",
    message: "If an account with that email exists, a reset OTP has been sent.",
  });
});

// @desc    Verify OTP
// @route   POST /api/v1/users/verify-otp
// @access  Public
export const verifyOTPCtrl = asyncHandler(async (req, res) => {
  const { email, otp } = req.body;
  if (!email || !otp) {
    throw new AppError("Email and OTP are required", 400);
  }

  const user = await User.findByEmailAndValidResetOtp(email, otp);

  if (!user) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  user.passwordResetOTP = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerifiedUntil = Date.now() + 10 * 60 * 1000;
  await user.save({ validateBeforeSave: false });

  res.json({ status: "success", message: "OTP verified" });
});

// @desc    Reset password with OTP
// @route   POST /api/v1/users/reset-password
// @access  Public
export const resetPasswordCtrl = asyncHandler(async (req, res) => {
  const { email, otp, password } = req.body;
  if (!email || !otp || !password) {
    throw new AppError("Email, OTP and new password are required", 400);
  }

  let user = await User.findByEmailAndVerifiedReset(email);

  if (!user && otp) {
    user = await User.findByEmailAndValidResetOtp(email, otp);
    if (user) {
      user.passwordResetOTP = undefined;
      user.passwordResetExpires = undefined;
    }
  }

  if (!user) {
    throw new AppError("Invalid or expired OTP", 400);
  }

  const salt = await bcrypt.genSalt(10);
  user.password = await bcrypt.hash(password, salt);
  user.passwordResetOTP = undefined;
  user.passwordResetExpires = undefined;
  user.passwordResetVerifiedUntil = undefined;
  await invalidateUserRefreshToken(user);

  clearAuthCookies(res);
  res.json({
    status: "success",
    message: "Password reset successful. Please log in with your new password.",
  });
});
