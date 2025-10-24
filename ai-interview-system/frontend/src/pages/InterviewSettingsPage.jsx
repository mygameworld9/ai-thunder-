import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import RoleVerificationModal from '../components/RoleVerificationModal'
import './InterviewSettingsPage.css'

const InterviewSettingsPage = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [showRoleModal, setShowRoleModal] = useState(false)
  const [roleConfirmationText, setRoleConfirmationText] = useState(null)

  // 表单状态
  const [formData, setFormData] = useState({
    provider: 'GOOGLE',
    model: 'gemini-2.5-flash',
    difficulty: 'Senior',
    total_questions: 10
  })

  const providers = {
    GOOGLE: ['gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-pro'],
    OPENAI: ['gpt-4o', 'gpt-4-turbo', 'gpt-3.5-turbo'],
    OLLAMA: ['llama3.1:8b', 'llama3.1:70b', 'mistral:7b']
  }

  useEffect(() => {
    fetchSessionData()
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      setIsLoading(true)
      const response = await api.get(`/v1/interview/session/${sessionId}`)
      setSessionData(response.data)
      
      // 如果有角色确认文本，显示模态框
      if (response.data.role_confirmation_text) {
        setRoleConfirmationText(response.data.role_confirmation_text)
        setShowRoleModal(true)
      }
    } catch (error) {
      console.error('获取会话数据失败:', error)
      setError('获取会话数据失败')
    } finally {
      setIsLoading(false)
    }
  }

  const handleFormChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleStartSession = async (e) => {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/v1/interview/start_session', {
        session_id: sessionId,
        ...formData
      })

      const { session_id, status } = response.data
      
      if (status === 'IN_PROGRESS') {
        // 进入面试界面
        navigate(`/interview/${session_id}`)
      }
    } catch (error) {
      console.error('开始会话失败:', error)
      setError('开始会话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleRoleConfirm = () => {
    setShowRoleModal(false)
    setRoleConfirmationText(null)
  }

  const handleRoleCorrect = () => {
    setShowRoleModal(false)
    setRoleConfirmationText(null)
    // 重新获取会话数据以获取更新后的确认文本
    fetchSessionData()
  }

  if (isLoading && !sessionData) {
    return (
      <div className="settings-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>正在加载会话数据...</p>
        </div>
      </div>
    )
  }

  if (error && !sessionData) {
    return (
      <div className="settings-page">
        <div className="error-container">
          <h3>加载失败</h3>
          <p>{error}</p>
          <button onClick={fetchSessionData} className="btn btn-primary">
            重试
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="settings-page">
      <div className="page-header">
        <h1>面试配置</h1>
        <p>请配置您的面试参数</p>
      </div>

      <div className="settings-container">
        <div className="session-info">
          <h3>会话信息</h3>
          <div className="info-grid">
            <div className="info-item">
              <span className="label">目标岗位:</span>
              <span className="value">{sessionData?.target_position}</span>
            </div>
            <div className="info-item">
              <span className="label">公司名称:</span>
              <span className="value">{sessionData?.company_name || '未提供'}</span>
            </div>
            <div className="info-item">
              <span className="label">职位描述:</span>
              <span className="value">
                {sessionData?.job_description 
                  ? sessionData.job_description.length > 100 
                    ? sessionData.job_description.substring(0, 100) + '...' 
                    : sessionData.job_description
                  : '未提供'}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleStartSession} className="settings-form">
          <div className="form-section">
            <h3>AI 服务配置</h3>
            
            <div className="form-group">
              <label className="form-label">AI 服务提供商</label>
              <select
                className="form-select"
                value={formData.provider}
                onChange={(e) => handleFormChange('provider', e.target.value)}
              >
                <option value="GOOGLE">Google Gemini</option>
                <option value="OPENAI">OpenAI</option>
                <option value="OLLAMA">Ollama</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">模型选择</label>
              <select
                className="form-select"
                value={formData.model}
                onChange={(e) => handleFormChange('model', e.target.value)}
              >
                {providers[formData.provider]?.map(model => (
                  <option key={model} value={model}>{model}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-section">
            <h3>面试参数</h3>
            
            <div className="form-group">
              <label className="form-label">面试难度</label>
              <select
                className="form-select"
                value={formData.difficulty}
                onChange={(e) => handleFormChange('difficulty', e.target.value)}
              >
                <option value="Junior">初级</option>
                <option value="Mid">中级</option>
                <option value="Senior">高级</option>
                <option value="Expert">专家级</option>
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">问题数量</label>
              <select
                className="form-select"
                value={formData.total_questions}
                onChange={(e) => handleFormChange('total_questions', parseInt(e.target.value))}
              >
                <option value={5}>5个问题</option>
                <option value={10}>10个问题</option>
                <option value={15}>15个问题</option>
                <option value={20}>20个问题</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            {!isAuthenticated && (
              <div className="auth-notice">
                <span className="notice-icon">⚠️</span>
                请先登录以保存您的配置
              </div>
            )}
            <button
              type="submit"
              className="btn btn-primary btn-large"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  正在开始面试...
                </>
              ) : (
                '开始面试'
              )}
            </button>
          </div>
        </form>
      </div>

      {/* 角色确认模态框 */}
      <RoleVerificationModal
        isOpen={showRoleModal}
        onClose={() => setShowRoleModal(false)}
        roleConfirmationText={roleConfirmationText}
        sessionId={sessionId}
        onConfirm={handleRoleConfirm}
        onCorrect={handleRoleCorrect}
      />
    </div>
  )
}

export default InterviewSettingsPage
