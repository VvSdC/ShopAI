import User from "../model/User.js";
import { AppError } from "../utils/appError.js";

const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.userAuthId);
  if (user?.isAdmin) {
    next();
  } else {
    next(new AppError("Access denied, admin only", 403));
  }
};

export default isAdmin;
