import crypto from "crypto";
import jwt from "jsonwebtoken";
import config from "../config/env.js";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      hasShippingAddress: user.hasShippingAddress,
    },
    config.auth.jwtKey,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (id) => {
  return jwt.sign(
    { id, jti: crypto.randomUUID() },
    config.auth.jwtRefreshKey,
    { expiresIn: "7d" }
  );
};
