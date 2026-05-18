import User from "../model/User.js";
const isAdmin = async (req, res, next) => {
  const user = await User.findById(req.userAuthId);
  if (user?.isAdmin) {
    next();
  } else {
    const err = new Error("Access denied, admin only");
    err.statusCode = 403;
    next(err);
  }
};

export default isAdmin;
