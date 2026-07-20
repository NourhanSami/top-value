import React, { createContext, useContext, useState, useEffect, type ReactNode } from 'react'
import { api, setAuthToken, clearAuth } from '@/lib/api'

// Types
export interface User {
  id: number
  name: string
  email: string
  role: string
  branch_id?: number
  branch_name?: string
  permissions?: string[]
  avatar?: string
}

interface AuthContextType {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  checkAuth: () => Promise<void>
  updateUser: (userData: Partial<User>) => void
}

interface AuthResponse {
  user: User
  token: string
  expires_in?: number
}

// Create context
const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Provider props
interface AuthProviderProps {
  children: ReactNode
}

// Auth Provider Component
export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null)
  const [token, setToken] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('auth_token')
      const storedUser = localStorage.getItem('user')

      if (storedToken && storedUser && storedUser !== 'undefined' && storedUser !== 'null') {
        try {
          const parsedUser = JSON.parse(storedUser)
          setToken(storedToken)
          setUser(parsedUser)
          setAuthToken(storedToken)
          
          // Don't verify token on initialization to avoid race conditions
          // Token will be verified by the backend on first API call
        } catch (error) {
          console.error('Failed to parse stored auth data:', error)
          handleLogout()
        }
      }
      
      setIsLoading(false)
    }

    initializeAuth()
  }, [])

  // Check if token is expired
  const isTokenExpired = (): boolean => {
    const tokenExpiry = localStorage.getItem('token_expiry')
    if (!tokenExpiry) return false
    
    return new Date().getTime() > parseInt(tokenExpiry)
  }

  // Login function
  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response = await api.post<{ success: boolean; data: AuthResponse }>('/auth/login', {
        email,
        password
      })

      const { user: userData, token: authToken, expires_in } = response.data.data

      const expiryTime = expires_in 
        ? new Date().getTime() + (expires_in * 1000)
        : new Date().getTime() + (24 * 60 * 60 * 1000)

      localStorage.setItem('auth_token', authToken)
      localStorage.setItem('user', JSON.stringify(userData))
      localStorage.setItem('token_expiry', expiryTime.toString())

      setToken(authToken)
      setUser(userData)
      setAuthToken(authToken)
    } catch (error) {
      console.error('Login failed:', error)
      throw error
    }
  }

  // Logout function
  const logout = async (): Promise<void> => {
    try {
      // Call logout API endpoint
      await api.post('/auth/logout')
    } catch (error) {
      console.error('Logout API call failed:', error)
    } finally {
      handleLogout()
    }
  }

  // Handle logout cleanup
  const handleLogout = () => {
    setUser(null)
    setToken(null)
    clearAuth()
    localStorage.removeItem('token_expiry')
  }

  // Check authentication status
  const checkAuth = async (): Promise<void> => {
    try {
      // Check if token is expired
      if (isTokenExpired()) {
        handleLogout()
        return
      }

      // Verify token with backend
      const response = await api.get<{ user: User }>('/auth/me')
      const userData = response.data.user

      setUser(userData)
      localStorage.setItem('user', JSON.stringify(userData))
    } catch (error) {
      console.error('Auth check failed:', error)
      handleLogout()
      throw error
    }
  }

  // Update user data
  const updateUser = (userData: Partial<User>) => {
    if (user) {
      const updatedUser = { ...user, ...userData }
      setUser(updatedUser)
      localStorage.setItem('user', JSON.stringify(updatedUser))
    }
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user && !!token,
    isLoading,
    login,
    logout,
    checkAuth,
    updateUser
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// Custom hook to use auth context
export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  
  return context
}

// Helper hook to check permissions
export const usePermission = (permission: string): boolean => {
  const { user } = useAuth()
  
  if (!user || !user.permissions) {
    return false
  }
  
  return user.permissions.includes(permission) || user.permissions.includes('*')
}

// Helper hook to check role
export const useRole = (role: string): boolean => {
  const { user } = useAuth()
  
  if (!user) {
    return false
  }
  
  return user.role === role
}

export default AuthContext
