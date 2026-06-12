import jwt from "jsonwebtoken";
import config from "../config/env.js";

export const verifyToken = (token) => {
  return jwt.verify(token, config.auth.jwtKey, (err, decoded) => {
    if (err) {
      return false;
    } else {
      return decoded;
    }
  });
};
