import { getTokenFromHeader } from "../utils/getTokenFromHeader.js";
import { verifyToken } from "../utils/verifyToken.js";

export const isLoggedIn = (req, res, next) => {
  //get token from header
  const token = getTokenFromHeader(req);
  //verify the token
  const decodedUser = verifyToken(token);
  if (!decodedUser) {
    const err = new Error("Invalid/Expired token, please login again");
    err.statusCode = 401;
    throw err;
  } else {
    //save the user into req obj
    req.userAuthId = decodedUser?.id;
    next();
  }
};
