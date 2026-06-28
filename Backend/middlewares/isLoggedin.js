import User from "../model/User.js";
import { getTokenFromHeader } from "../utils/getTokenFromHeader.js";
import { verifyToken } from "../utils/verifyToken.js";
import { AppError } from "../utils/appError.js";

const BLOCKED_USER_MESSAGE =
  "Your account has been blocked due to malicious activity. Please contact support.";

export const isLoggedIn = async (req, res, next) => {
  const token = getTokenFromHeader(req);
  const decodedUser = verifyToken(token);
  if (!decodedUser) {
    return next(new AppError("Invalid/Expired token, please login again", 401));
  }

  const user = await User.findById(decodedUser.id).select("isBlocked");
  if (!user) {
    return next(new AppError("User not found", 401));
  }
  if (user.isBlocked) {
    return next(new AppError(BLOCKED_USER_MESSAGE, 403));
  }

  req.userAuthId = decodedUser.id;
  next();
};

export { BLOCKED_USER_MESSAGE };
