import axios from 'axios'
import baseURL from './baseURL'

const axiosInstance = axios.create({
  baseURL,
  withCredentials: true, // Send cookies with every request
})

// Response interceptor to handle token refresh on 401
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
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
        await axios.post(`${baseURL}/users/refresh`, {}, { withCredentials: true })
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
