import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import './Navbar.css'

const Navbar = () => {
  const location = useLocation()
  const { user, isAuthenticated, logout } = useAuthStore()

  const handleLogout = () => {
    logout()
  }

  const showAuthButtons = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register'

  return (
    <nav className="navbar">
      <div className="nav-brand">
        <h1>AI面试系统</h1>
      </div>
      
      <div className="nav-links">
        <Link to="/" className="nav-link">🎯 开始面试</Link>
        <Link to="/dashboard" className="nav-link">📊 仪表板</Link>
      </div>

      {showAuthButtons && (
        <div className="auth-buttons">
          {isAuthenticated ? (
            <div className="user-menu">
              <span className="user-name">你好, {user?.name || '用户'}!</span>
              <button onClick={handleLogout} className="btn btn-secondary">
                退出登录
              </button>
            </div>
          ) : (
            <div className="auth-links">
              <Link to="/login" className="btn btn-secondary">登录</Link>
              <Link to="/register" className="btn btn-primary">注册</Link>
            </div>
          )}
        </div>
      )}
    </nav>
  )
}

export default Navbar
