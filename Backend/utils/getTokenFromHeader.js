export const getTokenFromHeader = (req) => {
  const cookieToken = req?.cookies?.shopai_token
  if (cookieToken) {
    return cookieToken
  }

  const authHeader = req?.headers?.authorization
  if (!authHeader || typeof authHeader !== 'string') {
    return null
  }

  const [scheme, token] = authHeader.split(' ')
  if (scheme?.toLowerCase() !== 'bearer' || !token) {
    return null
  }

  return token
}
