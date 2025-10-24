import React from 'react'
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import api from '../services/api'

const useAuthStore = create(
  devtools(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // 登录
      login: async (credentials) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/login', credentials)
          const { token, user } = response.data
          
          localStorage.setItem('token', token)
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          })
          return response.data
        } catch (error) {
          set({ 
            error: error.response?.data?.message || '登录失败', 
            isLoading: false 
          })
          throw error
        }
      },

      // 注册
      register: async (userData) => {
        set({ isLoading: true, error: null })
        try {
          const response = await api.post('/auth/register', userData)
          const { token, user } = response.data
          
          localStorage.setItem('token', token)
          set({ 
            user, 
            token, 
            isAuthenticated: true, 
            isLoading: false 
          })
          return response.data
        } catch (error) {
          set({ 
            error: error.response?.data?.message || '注册失败', 
            isLoading: false 
          })
          throw error
        }
      },

      // 登出
      logout: () => {
        localStorage.removeItem('token')
        set({ 
          user: null, 
          token: null, 
          isAuthenticated: false, 
          error: null 
        })
      },

      // 验证token
      verifyToken: async () => {
        const token = localStorage.getItem('token')
        if (!token) return false

        try {
          const response = await api.get('/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
          })
          set({ 
            user: response.data.user, 
            token, 
            isAuthenticated: true 
          })
          return true
        } catch (error) {
          localStorage.removeItem('token')
          set({ 
            user: null, 
            token: null, 
            isAuthenticated: false 
          })
          return false
        }
      },

      // 清除错误
      clearError: () => set({ error: null })
    }),
    { name: 'auth-store' }
  )
)

export const AuthProvider = ({ children }) => {
  // 在组件挂载时验证token
  React.useEffect(() => {
    useAuthStore.getState().verifyToken()
  }, [])

  return children
}

export { useAuthStore }
