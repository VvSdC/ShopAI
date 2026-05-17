import User from "../model/User.js";
import asyncHandler from "express-async-handler";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Order from "../model/Order.js";
import {
  generateAccessToken,
  generateRefreshToken,
} from "../utils/generateToken.js";

// Cookie options
const accessCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 15 * 60 * 1000, // 15 minutes
};

const refreshCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "strict" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

// @desc    Register user
// @route   POST /api/v1/users/register
// @access  Private/Admin

export const registerUserCtrl = asyncHandler(async (req, res) => {
  const { fullname, email, password, phone, country } = req.body;
  //Check user exists
  const userExists = await User.findOne({ email });
  if (userExists) {
    //throw
    throw new Error("User already exists");
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
      throw new Error("Your account has been blocked due to malicious activity. Please contact support.");
    }
    const accessToken = generateAccessToken(userFound);
    const refreshToken = generateRefreshToken(userFound?._id);
    // Store refresh token in DB
    userFound.refreshToken = refreshToken;
    await userFound.save();
    // Set httpOnly cookies
    res.cookie("shopai_token", accessToken, accessCookieOptions);
    res.cookie("shopai_refresh_token", refreshToken, refreshCookieOptions);
    res.json({
      status: "success",
      message: "User logged in successfully",
    });
  } else {
    throw new Error("Invalid login credentials");
  }
});

// @desc    Refresh access token
// @route   POST /api/v1/users/refresh
// @access  Public
export const refreshTokenCtrl = asyncHandler(async (req, res) => {
  const refreshToken = req?.cookies?.shopai_refresh_token;
  if (!refreshToken) {
    throw new Error("No refresh token, please login again");
  }
  // Verify refresh token
  const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
  if (!decoded) {
    throw new Error("Invalid refresh token, please login again");
  }
  // Check if user exists and refresh token matches
  const user = await User.findById(decoded.id);
  if (!user || user.refreshToken !== refreshToken) {
    throw new Error("Invalid refresh token, please login again");
  }
  // Generate new access token
  const newAccessToken = generateAccessToken(user);
  res.cookie("shopai_token", newAccessToken, accessCookieOptions);
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
      const decoded = jwt.verify(refreshToken, process.env.JWT_REFRESH_KEY);
      await User.findByIdAndUpdate(decoded.id, { refreshToken: "" });
    } catch (err) {
      // Token invalid, just clear cookies
    }
  }
  res.clearCookie("shopai_token");
  res.clearCookie("shopai_refresh_token");
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
  const decoded = jwt.verify(token, process.env.JWT_KEY);
  // Fetch latest user fields from DB to include email and createdAt
  const user = await User.findById(decoded.id).select(
    'fullname email isAdmin hasShippingAddress createdAt'
  );
  if (!user) {
    throw new Error('User not found');
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
  //find the user
  const user = await User.findById(req.userAuthId).populate("orders");
  res.json({
    status: "success",
    message: "User profile fetched successfully",
    user,
  });
});

// @desc    Update user shipping address
// @route   PUT /api/v1/users/update/shipping
// @access  Private

export const updateShippingAddresctrl = asyncHandler(async (req, res) => {
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
  res.json({
    status: "success",
    message: "Shipping address added successfully",
    user,
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
    throw new Error("Address not found");
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
  res.json({
    status: "success",
    message: "Shipping address updated successfully",
    user,
  });
});

// @desc    Delete a shipping address
// @route   DELETE /api/v1/users/update/shipping/:addressId
// @access  Private

export const deleteShippingAddressCtrl = asyncHandler(async (req, res) => {
  const { addressId } = req.params;
  const user = await User.findById(req.userAuthId);
  user.shippingAddresses.pull(addressId);
  if (user.shippingAddresses.length === 0) {
    user.hasShippingAddress = false;
  }
  await user.save();
  res.json({
    status: "success",
    message: "Shipping address deleted successfully",
    user,
  });
});

// @desc    Get all users
// @route   GET /api/v1/users
// @access  Private/Admin

export const getAllUsersCtrl = asyncHandler(async (req, res) => {
  const users = await User.find().select('-password -refreshToken');
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
    throw new Error("User not found");
  }
  if (user.isAdmin) {
    throw new Error("Cannot block an admin user");
  }
  user.isBlocked = !user.isBlocked;
  await user.save();
  res.json({
    status: "success",
    message: user.isBlocked ? "User blocked successfully" : "User unblocked successfully",
    user,
  });
});

// @desc    Delete own account (keeps orders)
// @route   DELETE /api/v1/users/delete-account
// @access  Private

export const deleteAccountCtrl = asyncHandler(async (req, res) => {
  const userId = req.userAuthId;
  // Reassign orders to keep them (remove user reference)
  await Order.updateMany({ user: userId }, { $unset: { user: "" } });
  // Delete the user
  await User.findByIdAndDelete(userId);
  // Clear cookies
  res.clearCookie("shopai_token");
  res.clearCookie("shopai_refresh_token");
  res.json({
    status: "success",
    message: "Account deleted successfully",
  });
});
