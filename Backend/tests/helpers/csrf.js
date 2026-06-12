import request from 'supertest'
import { CSRF_HEADER_NAME } from '../../middlewares/csrfProtection.js'

function cookiePartsFromSetCookie(setCookieHeader) {
  if (!setCookieHeader) return []
  return [].concat(setCookieHeader).map((entry) => String(entry).split(';')[0])
}

/** Fetch CSRF token + cookie pair for double-submit requests. */
export async function fetchCsrf(app) {
  const res = await request(app).get('/shopai/users/csrf-token')
  return {
    csrfToken: res.body.csrfToken,
    cookieParts: cookiePartsFromSetCookie(res.headers['set-cookie']),
  }
}

/** Parse Set-Cookie response headers into Cookie header fragments. */
export function cookiePartsFromResponse(res) {
  return cookiePartsFromSetCookie(res.headers['set-cookie'])
}

/** Attach CSRF header and cookies to a supertest request. */
export function withCsrf(req, csrf, extraCookieParts = []) {
  return req
    .set(CSRF_HEADER_NAME, csrf.csrfToken)
    .set('Cookie', [...csrf.cookieParts, ...extraCookieParts])
}

/** @deprecated Prefer fetchCsrf + withCsrf — agent cookie jar conflicts with explicit Cookie arrays. */
export async function createCsrfAgent(app) {
  const csrf = await fetchCsrf(app)
  return {
    csrf,
    mutate: (req, extraCookieParts = []) => withCsrf(req, csrf, extraCookieParts),
  }
}
