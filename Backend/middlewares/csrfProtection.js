import crypto from 'crypto'
import config from '../config/env.js'

export const CSRF_COOKIE_NAME = 'shopai_csrf'
/** Must match Frontend/src/utils/csrfConstants.js (lowercase HTTP header name). */
export const CSRF_HEADER_NAME = 'x-csrf-token'

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS'])
const CSRF_SKIP_PATHS = new Set(['/webhook'])

function generateCsrfToken() {
  return crypto.randomBytes(32).toString('hex')
}

function csrfCookieOptions() {
  return {
    httpOnly: false,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'strict' : 'lax',
    maxAge: 24 * 60 * 60 * 1000,
    path: '/',
  }
}

export function setCsrfCookie(res, token) {
  res.cookie(CSRF_COOKIE_NAME, token, csrfCookieOptions())
}

function tokensMatch(headerToken, cookieToken) {
  if (typeof headerToken !== 'string' || typeof cookieToken !== 'string') {
    return false
  }
  const a = Buffer.from(headerToken)
  const b = Buffer.from(cookieToken)
  if (a.length !== b.length || a.length === 0) {
    return false
  }
  return crypto.timingSafeEqual(a, b)
}

/** Case-insensitive lookup — safe outside Express header normalization. */
function readCsrfHeaderToken(req) {
  const headers = req.headers
  if (!headers || typeof headers !== 'object') return undefined
  if (headers[CSRF_HEADER_NAME] != null) return headers[CSRF_HEADER_NAME]
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === CSRF_HEADER_NAME) return value
  }
  return undefined
}

function usesCookieAuth(req) {
  return Boolean(req.cookies?.shopai_token || req.cookies?.shopai_refresh_token)
}

function usesBearerAuth(req) {
  return /^Bearer\s+\S+/i.test(String(req.headers.authorization || ''))
}

/** True when CSRF validation is required for this request. */
export function requiresCsrfProtection(req) {
  if (SAFE_METHODS.has(req.method)) return false
  if (CSRF_SKIP_PATHS.has(req.path)) return false
  if (usesBearerAuth(req) && !usesCookieAuth(req)) return false
  return true
}

export function ensureCsrfToken(req, res) {
  let token = req.cookies?.[CSRF_COOKIE_NAME]
  if (!token) {
    token = generateCsrfToken()
    setCsrfCookie(res, token)
  }
  return token
}

/** GET /shopai/users/csrf-token — issue or return the double-submit token. */
export function csrfTokenHandler(req, res) {
  const token = ensureCsrfToken(req, res)
  res.json({ csrfToken: token })
}

/** Reject state-changing cookie-auth requests without a matching CSRF header. */
export function validateCsrf(req, res, next) {
  if (!requiresCsrfProtection(req)) {
    return next()
  }

  const cookieToken = req.cookies?.[CSRF_COOKIE_NAME]
  const headerToken = readCsrfHeaderToken(req)

  if (!tokensMatch(String(headerToken || ''), String(cookieToken || ''))) {
    return res.status(403).json({ message: 'Invalid or missing CSRF token' })
  }

  return next()
}
