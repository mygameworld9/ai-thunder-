import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '../../store/authStore'
import api from '../../services/api'
import './LoginForm.css'

const LoginForm = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuthStore()

  const from = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      const response = await api.post('/v1/auth/login', {
        email,
        password
      })

      const { token, user } = response.data
      login(token, user)
      
      // 重定向到之前访问的页面或仪表板
      navigate(from, { replace: true })
    } catch (error) {
      console.error('登录失败:', error)
      setError(error.response?.data?.message || '登录失败，请检查邮箱和密码')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleLogin = () => {
    // TODO: 实现Google OAuth登录
    window.location.href = '/api/v1/auth/google'
  }

  return (
    <div className="login-form-container">
      <div className="login-form-card">
        <div className="login-header">
          <h2>欢迎回来</h2>
          <p>登录您的AI面试账户</p>
        </div>

        {error && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="login-form">
          <div className="form-group">
            <label htmlFor="email">邮箱地址</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="请输入您的邮箱"
              required
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">密码</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入您的密码"
              required
              disabled={isLoading}
            />
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="login-divider">
          <span>或</span>
        </div>

        <button
          type="button"
          className="google-login-button"
          onClick={handleGoogleLogin}
          disabled={isLoading}
        >
          <span className="google-icon">🔍</span>
          使用Google登录
        </button>

        <div className="login-footer">
          <span>还没有账户？</span>
          <button
            type="button"
            className="register-link"
            onClick={() => navigate('/register')}
            disabled={isLoading}
          >
            立即注册
          </button>
        </div>
      </div>
    </div>
  )
}

export default LoginForm
