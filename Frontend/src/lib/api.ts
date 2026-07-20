import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios'

// Get base URL from environment variables or localStorage
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 
                     localStorage.getItem('api_base_url') || 
                     'http://localhost:8000/api'

// Create Axios instance with default configuration
export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30 seconds timeout
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest'
  }
})

// Request interceptor - Add authentication token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem('auth_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    
    // Add language header for Arabic support
    config.headers['Accept-Language'] = 'ar'
    
    return config
  },
  (error: AxiosError) => {
    console.error('Request Error:', error)
    return Promise.reject(error)
  }
)

// Response interceptor - Handle errors globally
api.interceptors.response.use(
  (response) => {
    return response
  },
  (error: AxiosError) => {
    if (error.response) {
      const { status, data } = error.response
      
      const message = (data as any)?.message || ''
      const isAuthError =
        status === 401 ||
        (typeof message === 'string' && /invalid or expired token|no token provided|unauthorized/i.test(message))

      if (isAuthError && window.location.pathname !== '/login') {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        localStorage.removeItem('token_expiry')
        window.location.href = '/login'
        return Promise.reject(error)
      }

      switch (status) {
        case 403:
          console.error('Access forbidden:', data)
          break
          
        case 404:
          console.error('Resource not found:', data)
          break
          
        case 422:
          console.error('Validation error:', data)
          break
          
        case 500:
        case 502:
        case 503:
        case 504:
          // Server errors
          console.error('Server error:', data)
          // You can show a toast notification here
          break
          
        default:
          console.error('API Error:', data)
      }
    } else if (error.request) {
      // Request was made but no response received
      console.error('Network Error:', error.message)
      // You can show a toast notification here
    } else {
      // Something else happened
      console.error('Error:', error.message)
    }
    
    return Promise.reject(error)
  }
)

// Helper function to update base URL dynamically
export const updateBaseURL = (newBaseURL: string) => {
  api.defaults.baseURL = newBaseURL
  localStorage.setItem('api_base_url', newBaseURL)
}

// Helper function to set authentication token
export const setAuthToken = (token: string) => {
  localStorage.setItem('auth_token', token)
}

// Helper function to clear authentication
export const clearAuth = () => {
  localStorage.removeItem('auth_token')
  localStorage.removeItem('user')
}

export default api
