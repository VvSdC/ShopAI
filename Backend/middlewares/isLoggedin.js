import { getTokenFromHeader } from "../utils/getTokenFromHeader.js";
import { verifyToken } from "../utils/verifyToken.js";
import { AppError } from "../utils/appError.js";

export const isLoggedIn = (req, res, next) => {
  //get token from header
  const token = getTokenFromHeader(req);
  //verify the token
  const decodedUser = verifyToken(token);
  if (!decodedUser) {
    throw new AppError("Invalid/Expired token, please login again", 401);
  } else {
    //save the user into req obj
    req.userAuthId = decodedUser?.id;
    next();
  }
};
