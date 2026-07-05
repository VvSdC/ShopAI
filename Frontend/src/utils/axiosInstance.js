import axios from 'axios'
import baseURL from './baseURL'
import { CSRF_HEADER_NAME } from './csrfConstants'

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // Send cookies with every request
})

let cachedCsrfToken = null

export function resetCsrfTokenCache() {
  cachedCsrfToken = null
}

async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken
  const { data } = await axios.get(`${baseURL}/users/csrf-token`, { withCredentials: true })
  cachedCsrfToken = data.csrfToken
  return cachedCsrfToken
}

export { ensureCsrfToken }

function isMutatingMethod(method) {
  const m = String(method || 'get').toLowerCase()
  return m !== 'get' && m !== 'head' && m !== 'options'
}

/** Session probe endpoints — refresh on 401 but do not hard-redirect guests on failure. */
function isSessionProbeUrl(url = '') {
  return String(url).includes('/users/me')
}

function shouldRedirectToLoginAfterRefreshFailure(url = '') {
  if (isSessionProbeUrl(url)) return false
  const path = window.location.pathname
  return !path.includes('/login') && !path.includes('/register')
}

const ACCESS_TOKEN_TTL_MS = 14 * 60 * 1000
let proactiveRefreshTimer = null
/** One shared refresh for concurrent 401s (and proactive refresh). */
let refreshInFlight = null

function refreshSession() {
  if (!refreshInFlight) {
    refreshInFlight = axiosInstance
      .post('/users/refresh', {})
      .finally(() => {
        refreshInFlight = null
      })
  }
  return refreshInFlight
}

export function startProactiveTokenRefresh() {
  stopProactiveTokenRefresh()
  proactiveRefreshTimer = window.setInterval(() => {
    refreshSession().catch(() => {})
  }, ACCESS_TOKEN_TTL_MS)
}

export function stopProactiveTokenRefresh() {
  if (proactiveRefreshTimer != null) {
    window.clearInterval(proactiveRefreshTimer)
    proactiveRefreshTimer = null
  }
}

axiosInstance.interceptors.request.use(async (config) => {
  if (isMutatingMethod(config.method)) {
    const token = await ensureCsrfToken()
    config.headers = config.headers || {}
    config.headers[CSRF_HEADER_NAME] = token
  }
  return config
})

// Response interceptor to handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 403 && isMutatingMethod(originalRequest?.method)) {
      resetCsrfTokenCache()
      if (!originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true
        const token = await ensureCsrfToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers[CSRF_HEADER_NAME] = token
        return axiosInstance(originalRequest)
      }
    }

    // Access token expired — rotate using refresh cookie, then retry once.
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/users/refresh') &&
      !originalRequest.url?.includes('/users/login')
    ) {
      originalRequest._retry = true
      try {
        await refreshSession()
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        resetCsrfTokenCache()
        stopProactiveTokenRefresh()
        if (shouldRedirectToLoginAfterRefreshFailure(originalRequest.url)) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
