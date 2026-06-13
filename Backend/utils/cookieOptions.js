import config from '../config/env.js'

/**
 * Netlify (frontend) and Render (API) are different sites in production.
 * Browsers drop sameSite:'strict' cookies on cross-origin XHR — use 'none' + secure.
 */
export function crossSiteCookieAttributes({ httpOnly = true } = {}) {
  return {
    httpOnly,
    secure: config.isProduction,
    sameSite: config.isProduction ? 'none' : 'lax',
    path: '/',
  }
}

export function getAccessCookieOptions() {
  return {
    ...crossSiteCookieAttributes(),
    maxAge: 15 * 60 * 1000,
  }
}

export function getRefreshCookieOptions() {
  return {
    ...crossSiteCookieAttributes(),
    maxAge: 7 * 24 * 60 * 60 * 1000,
  }
}

export function getDeviceCookieOptions() {
  return {
    ...crossSiteCookieAttributes(),
    maxAge: 365 * 24 * 60 * 60 * 1000,
  }
}

export function getCsrfCookieOptions() {
  return {
    ...crossSiteCookieAttributes({ httpOnly: false }),
    maxAge: 24 * 60 * 60 * 1000,
  }
}

export function getAuthCookieClearOptions() {
  return crossSiteCookieAttributes()
}
