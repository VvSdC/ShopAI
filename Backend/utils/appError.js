/** Expected application error — safe to expose message to clients. */
export class AppError extends Error {
  constructor(message, statusCode = 500) {
    super(message)
    this.name = 'AppError'
    this.statusCode = statusCode
    this.isOperational = true
  }
}

const THIRD_PARTY_ERROR_NAMES = new Set([
  'MongoError',
  'MongoServerError',
  'MongoNetworkError',
  'MongoTimeoutError',
  'ValidationError',
  'CastError',
  'DocumentNotFoundError',
  'StripeError',
  'StripeInvalidRequestError',
  'StripeAPIError',
  'StripeAuthenticationError',
  'StripeConnectionError',
  'StripeRateLimitError',
  'JsonWebTokenError',
  'TokenExpiredError',
  'NotBeforeError',
  'SyntaxError',
  'TypeError',
  'ReferenceError',
])

/** True for library/runtime errors whose messages may leak internals. */
export function isThirdPartyError(err) {
  if (!err) return false
  if (THIRD_PARTY_ERROR_NAMES.has(err.name)) return true
  if (typeof err.type === 'string' && err.type.startsWith('Stripe')) return true
  if (err.code === 11000 || err.code === 'E11000') return true
  return false
}

const GENERIC_BY_STATUS = {
  400: 'Bad request',
  401: 'Unauthorized',
  403: 'Forbidden',
  404: 'Not found',
  409: 'Conflict',
  422: 'Unprocessable request',
  429: 'Too many requests',
  500: 'Internal server error',
  502: 'Service temporarily unavailable',
  503: 'Service temporarily unavailable',
}

export function genericMessageForStatus(statusCode) {
  return GENERIC_BY_STATUS[statusCode] || 'Something went wrong'
}

/**
 * Mark intentional client errors as operational when flagged explicitly or when
 * the app set a 4xx status (on err or res) and the error is not from a library.
 */
export function applyOperationalFlag(err, res) {
  if (!err || err.isOperational === true) return err

  const statusCode =
    err.statusCode || (res?.statusCode >= 400 && res.statusCode < 600 ? res.statusCode : 500)

  if (statusCode >= 400 && statusCode < 500 && !isThirdPartyError(err)) {
    err.isOperational = true
    if (!err.statusCode) err.statusCode = statusCode
  }

  return err
}

export function resolveStatusCode(err, res) {
  const code = err?.statusCode || (res?.statusCode >= 400 ? res.statusCode : 500)
  return code >= 400 && code < 600 ? code : 500
}

/** Client-safe message — operational errors only; others get a generic string. */
export function clientErrorMessage(err, statusCode) {
  if (err?.isOperational === true && typeof err.message === 'string' && err.message.trim()) {
    return err.message
  }
  return genericMessageForStatus(statusCode)
}
