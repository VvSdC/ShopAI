export const getTokenFromHeader = (req) => {
  // Try cookie first (shopai_token), then fallback to Authorization header
  const cookieToken = req?.cookies?.shopai_token;
  if (cookieToken) {
    return cookieToken;
  }
  const token = req?.headers?.authorization?.split(" ")[1];
  if (token === undefined) {
    return "No token found in the header";
  } else {
    return token;
  }
};
