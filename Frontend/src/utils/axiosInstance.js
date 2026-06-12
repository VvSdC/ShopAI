import axios from 'axios'
import baseURL from './baseURL'

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // Send cookies with every request
})

let cachedCsrfToken = null

async function ensureCsrfToken() {
  if (cachedCsrfToken) return cachedCsrfToken
  const { data } = await axios.get(`${baseURL}/users/csrf-token`, { withCredentials: true })
  cachedCsrfToken = data.csrfToken
  return cachedCsrfToken
}

function isMutatingMethod(method) {
  const m = String(method || 'get').toLowerCase()
  return m !== 'get' && m !== 'head' && m !== 'options'
}

axiosInstance.interceptors.request.use(async (config) => {
  if (isMutatingMethod(config.method)) {
    const token = await ensureCsrfToken()
    config.headers = config.headers || {}
    config.headers['X-CSRF-Token'] = token
  }
  return config
})

// Response interceptor to handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config

    if (error.response?.status === 403 && isMutatingMethod(originalRequest?.method)) {
      cachedCsrfToken = null
      if (!originalRequest._csrfRetry) {
        originalRequest._csrfRetry = true
        const token = await ensureCsrfToken()
        originalRequest.headers = originalRequest.headers || {}
        originalRequest.headers['X-CSRF-Token'] = token
        return axiosInstance(originalRequest)
      }
    }

    // If 401 and not already retried, try refreshing
    if (
      error.response?.status === 401 &&
      !originalRequest._retry &&
      !originalRequest.url?.includes('/users/refresh') &&
      !originalRequest.url?.includes('/users/login') &&
      !originalRequest.url?.includes('/users/me')
    ) {
      originalRequest._retry = true
      try {
        await axiosInstance.post('/users/refresh', {})
        // Retry original request with new cookie
        return axiosInstance(originalRequest)
      } catch (refreshError) {
        // Refresh failed — redirect to login only if not already there
        if (!window.location.pathname.includes('/login') && !window.location.pathname.includes('/register')) {
          window.location.href = '/login'
        }
        return Promise.reject(refreshError)
      }
    }
    return Promise.reject(error)
  }
)

export default axiosInstance
