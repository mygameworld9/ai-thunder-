import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import api from '../services/api'
import './RoleVerificationModal.css'

const RoleVerificationModal = ({ isOpen, onClose, roleConfirmationText, sessionId }) => {
  const [isCorrecting, setIsCorrecting] = useState(false)
  const [correctionText, setCorrectionText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()

  if (!isOpen) return null

  const handleConfirm = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/v1/interview/configure', {
        session_id: sessionId,
        role_correction: null // 确认不需要修正
      })
      
      // 直接进入面试配置页面
      navigate(`/interview/${sessionId}/settings`)
    } catch (error) {
      console.error('确认角色失败:', error)
      alert('确认失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCorrect = async () => {
    if (!correctionText.trim()) {
      alert('请输入修正内容')
      return
    }

    setIsLoading(true)
    try {
      const response = await api.post('/v1/interview/configure', {
        session_id: sessionId,
        role_correction: correctionText
      })
      
      // 使用修正后的内容重新生成确认文本
      // 这里可以重新调用后端获取新的确认文本，或者直接进入配置页面
      navigate(`/interview/${sessionId}/settings`)
    } catch (error) {
      console.error('修正角色失败:', error)
      alert('修正失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartSession = async () => {
    setIsLoading(true)
    try {
      const response = await api.post('/v1/interview/start_session', {
        session_id: sessionId,
        provider: 'GOOGLE', // 默认提供商
        model: 'gemini-2.5-flash', // 默认模型
        difficulty: 'Senior' // 默认难度
      })
      
      const { session_id, status } = response.data
      
      if (status === 'IN_PROGRESS') {
        // 进入面试界面
        navigate(`/interview/${session_id}`)
      }
    } catch (error) {
      console.error('开始会话失败:', error)
      alert('开始会话失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <div className="modal-header">
          <h2>角色确认</h2>
          <button className="close-btn" onClick={onClose} disabled={isLoading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="confirmation-text">
            <p>{roleConfirmationText}</p>
          </div>

          {!isCorrecting ? (
            <div className="modal-actions">
              <button
                className="btn btn-primary"
                onClick={handleConfirm}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className="loading"></span>
                    确认中...
                  </>
                ) : (
                  '确认'
                )}
              </button>
              <button
                className="btn btn-secondary"
                onClick={() => setIsCorrecting(true)}
                disabled={isLoading}
              >
                修正
              </button>
            </div>
          ) : (
            <div className="correction-section">
              <textarea
                className="correction-input"
                placeholder="请描述您期望的面试情境..."
                value={correctionText}
                onChange={(e) => setCorrectionText(e.target.value)}
                rows={4}
              />
              <div className="correction-actions">
                <button
                  className="btn btn-primary"
                  onClick={handleCorrect}
                  disabled={isLoading || !correctionText.trim()}
                >
                  {isLoading ? (
                    <>
                      <span className="loading"></span>
                      修正中...
                    </>
                  ) : (
                    '提交修正'
                  )}
                </button>
                <button
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsCorrecting(false)
                    setCorrectionText('')
                  }}
                  disabled={isLoading}
                >
                  取消
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default RoleVerificationModal
