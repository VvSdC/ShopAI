import jwt from "jsonwebtoken";

export const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      fullname: user.fullname,
      isAdmin: user.isAdmin,
      hasShippingAddress: user.hasShippingAddress,
    },
    process.env.JWT_KEY,
    { expiresIn: "15m" }
  );
};

export const generateRefreshToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_REFRESH_KEY, { expiresIn: "7d" });
};
