import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './UserDashboard.css'

const UserDashboard = () => {
  const navigate = useNavigate()
  const { user, logout } = useAuthStore()
  const [interviews, setInterviews] = useState([])
  const [resumes, setResumes] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    fetchUserData()
  }, [])

  const fetchUserData = async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // 并行获取面试和简历数据
      const [interviewsResponse, resumesResponse] = await Promise.all([
        api.get('/v1/user/interviews'),
        api.get('/v1/user/resumes')
      ])

      setInterviews(interviewsResponse.data.interviews || [])
      setResumes(resumesResponse.data.resumes || [])
    } catch (error) {
      console.error('获取用户数据失败:', error)
      setError('获取用户数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartNewInterview = () => {
    navigate('/')
  }

  const handleViewInterview = (sessionId) => {
    navigate(`/interview/${sessionId}`)
  }

  const handleViewReport = (sessionId) => {
    navigate(`/report/${sessionId}`)
  }

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED': return '#28a745'
      case 'IN_PROGRESS': return '#ffc107'
      case 'CONFIGURED': return '#17a2b8'
      case 'PENDING': return '#6c757d'
      default: return '#6c757d'
    }
  }

  const getStatusText = (status) => {
    switch (status) {
      case 'COMPLETED': return '已完成'
      case 'IN_PROGRESS': return '进行中'
      case 'CONFIGURED': return '已配置'
      case 'PENDING': return '待开始'
      default: return status
    }
  }

  if (isLoading) {
    return (
      <div className="dashboard-container">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载您的数据...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="dashboard-container">
      {/* 页眉 */}
      <div className="dashboard-header">
        <div className="welcome-section">
          <h1>欢迎回来，{user?.name || '用户'}！</h1>
          <p>这里是您的AI面试管理面板</p>
        </div>
        <div className="header-actions">
          <button
            onClick={handleStartNewInterview}
            className="btn btn-primary"
          >
            🚀 开始新面试
          </button>
          <button
            onClick={handleLogout}
            className="btn btn-secondary"
          >
            📤 退出登录
          </button>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="error-banner">
          <span className="error-icon">⚠️</span>
          {error}
        </div>
      )}

      <div className="dashboard-content">
        {/* 最近面试 */}
        <div className="section">
          <div className="section-header">
            <h3>最近面试</h3>
            <span className="section-count">{interviews.length} 个会话</span>
          </div>
          
          {interviews.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">🎯</div>
              <h4>还没有面试记录</h4>
              <p>点击"开始新面试"来创建您的第一个模拟面试</p>
              <button
                onClick={handleStartNewInterview}
                className="btn btn-primary"
              >
                开始新面试
              </button>
            </div>
          ) : (
            <div className="interviews-grid">
              {interviews.slice(0, 6).map(interview => (
                <div key={interview.session_id} className="interview-card">
                  <div className="interview-header">
                    <h4>{interview.target_position}</h4>
                    <span
                      className="status-badge"
                      style={{ backgroundColor: getStatusColor(interview.status) }}
                    >
                      {getStatusText(interview.status)}
                    </span>
                  </div>
                  
                  <div className="interview-details">
                    <div className="detail-item">
                      <span className="detail-label">AI提供商:</span>
                      <span className="detail-value">{interview.provider}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">难度:</span>
                      <span className="detail-value">{interview.difficulty}</span>
                    </div>
                    <div className="detail-item">
                      <span className="detail-label">创建时间:</span>
                      <span className="detail-value">
                        {formatDate(interview.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="interview-actions">
                    {interview.status === 'COMPLETED' && (
                      <button
                        onClick={() => handleViewReport(interview.session_id)}
                        className="btn btn-sm btn-secondary"
                      >
                        📊 查看报告
                      </button>
                    )}
                    <button
                      onClick={() => handleViewInterview(interview.session_id)}
                      className="btn btn-sm btn-primary"
                    >
                      📝 查看详情
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 简历管理 */}
        <div className="section">
          <div className="section-header">
            <h3>我的简历</h3>
            <span className="section-count">{resumes.length} 份简历</span>
          </div>
          
          {resumes.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">📄</div>
              <h4>还没有保存的简历</h4>
              <p>在开始面试时可以保存您的简历以便重复使用</p>
            </div>
          ) : (
            <div className="resumes-list">
              {resumes.map(resume => (
                <div key={resume.resume_id} className="resume-item">
                  <div className="resume-info">
                    <h4>{resume.title || '未命名简历'}</h4>
                    <p>{resume.content?.substring(0, 100)}...</p>
                    <span className="resume-date">
                      更新于 {formatDate(resume.updated_at)}
                    </span>
                  </div>
                  <div className="resume-actions">
                    <button className="btn btn-sm btn-secondary">
                      📝 编辑
                    </button>
                    <button className="btn btn-sm btn-primary">
                      🚀 使用
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserDashboard
