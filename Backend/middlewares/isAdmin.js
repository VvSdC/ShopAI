import User from "../model/User.js";
import { AppError } from "../utils/appError.js";

const isAdmin = async (req, res, next) => {
  if (req.authUser) {
    if (req.authUser.isAdmin) return next();
    return next(new AppError("Access denied, admin only", 403));
  }

  if (!req.userAuthId) {
    return next(new AppError("Access denied, admin only", 403));
  }

  const user = await User.findById(req.userAuthId).select("isAdmin");
  if (user?.isAdmin) {
    return next();
  }
  return next(new AppError("Access denied, admin only", 403));
};

export default isAdmin;
