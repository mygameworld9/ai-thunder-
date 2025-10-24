import React, { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './ChatInterface.css'

const ChatInterface = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [messages, setMessages] = useState([])
  const [currentAnswer, setCurrentAnswer] = useState('')
  const [isInterviewComplete, setIsInterviewComplete] = useState(false)
  const [showReportButton, setShowReportButton] = useState(false)
  
  const messagesEndRef = useRef(null)
  const textareaRef = useRef(null)

  useEffect(() => {
    fetchSessionData()
    fetchMessages()
  }, [sessionId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const fetchSessionData = async () => {
    try {
      const response = await api.get(`/v1/interview/session/${sessionId}`)
      setSessionData(response.data)
      
      // 检查是否已完成
      if (response.data.status === 'COMPLETED') {
        setIsInterviewComplete(true)
        setShowReportButton(true)
      }
    } catch (error) {
      console.error('获取会话数据失败:', error)
      setError('获取会话数据失败')
    }
  }

  const fetchMessages = async () => {
    try {
      const response = await api.get(`/v1/interview/${sessionId}/messages`)
      setMessages(response.data.messages || [])
    } catch (error) {
      console.error('获取消息失败:', error)
      // 如果是404错误，说明还没有消息，这是正常的
      if (error.response?.status !== 404) {
        setError('获取消息失败')
      }
    }
  }

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  const handleAnswerSubmit = async (e) => {
    e.preventDefault()
    
    if (!currentAnswer.trim() || isLoading) {
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/v1/interview/submit_answer', {
        session_id: sessionId,
        answer: currentAnswer.trim()
      })

      const { question, is_complete, current_question_index, total_questions } = response.data

      // 添加用户回答
      setMessages(prev => [...prev, {
        id: Date.now(),
        role: 'user',
        content: currentAnswer.trim(),
        timestamp: new Date().toISOString()
      }])

      // 添加AI问题（如果有）
      if (question) {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          role: 'assistant',
          content: question,
          timestamp: new Date().toISOString()
        }])
      }

      setCurrentAnswer('')

      // 检查是否完成
      if (is_complete) {
        setIsInterviewComplete(true)
        setShowReportButton(true)
      }

    } catch (error) {
      console.error('提交答案失败:', error)
      setError('提交答案失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleStartInterview = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const response = await api.post('/v1/interview/start_session', {
        session_id: sessionId,
        provider: sessionData?.provider || 'GOOGLE',
        model: sessionData?.model || 'gemini-2.5-flash',
        difficulty: sessionData?.difficulty || 'Senior'
      })

      const { question } = response.data

      if (question) {
        setMessages([{
          id: Date.now(),
          role: 'assistant',
          content: question,
          timestamp: new Date().toISOString()
        }])
      }

    } catch (error) {
      console.error('开始面试失败:', error)
      setError('开始面试失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const handleViewReport = () => {
    navigate(`/interview/${sessionId}/report`)
  }

  const formatTime = (timestamp) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  if (error && !sessionData) {
    return (
      <div className="chat-container">
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
    <div className="chat-container">
      {/* 侧边栏 */}
      <div className="sidebar">
        <div className="session-info">
          <h3>面试信息</h3>
          <div className="info-item">
            <span className="label">目标岗位:</span>
            <span className="value">{sessionData?.target_position}</span>
          </div>
          <div className="info-item">
            <span className="label">AI提供商:</span>
            <span className="value">{sessionData?.provider}</span>
          </div>
          <div className="info-item">
            <span className="label">模型:</span>
            <span className="value">{sessionData?.model}</span>
          </div>
          <div className="info-item">
            <span className="label">难度:</span>
            <span className="value">{sessionData?.difficulty}</span>
          </div>
        </div>

        {showReportButton && (
          <div className="report-section">
            <button 
              onClick={handleViewReport}
              className="btn btn-primary btn-large"
            >
              查看面试报告
            </button>
          </div>
        )}
      </div>

      {/* 聊天主区域 */}
      <div className="chat-main">
        <div className="chat-header">
          <h2>模拟面试</h2>
          <div className="status-indicator">
            <span className={`status-dot ${isInterviewComplete ? 'completed' : 'in-progress'}`}></span>
            <span>{isInterviewComplete ? '面试完成' : '面试进行中'}</span>
          </div>
        </div>

        <div className="messages-container">
          {messages.length === 0 ? (
            <div className="empty-state">
              <h3>欢迎来到模拟面试</h3>
              <p>点击下方按钮开始您的面试</p>
              <button 
                onClick={handleStartInterview}
                disabled={isLoading}
                className="btn btn-primary btn-large"
              >
                {isLoading ? (
                  <>
                    <span className="loading"></span>
                    正在准备面试...
                  </>
                ) : (
                  '开始面试'
                )}
              </button>
            </div>
          ) : (
            messages.map((message) => (
              <div
                key={message.id}
                className={`message ${message.role}`}
              >
                <div className="message-content">
                  <div className="message-text">
                    {message.content}
                  </div>
                  <div className="message-time">
                    {formatTime(message.timestamp)}
                  </div>
                </div>
              </div>
            ))
          )}
          <div ref={messagesEndRef} />
        </div>

        {!isInterviewComplete && messages.length > 0 && (
          <form onSubmit={handleAnswerSubmit} className="answer-form">
            <textarea
              ref={textareaRef}
              className="answer-input"
              placeholder="请输入您的回答..."
              value={currentAnswer}
              onChange={(e) => setCurrentAnswer(e.target.value)}
              disabled={isLoading}
              rows={3}
            />
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isLoading || !currentAnswer.trim()}
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  AI 思考中...
                </>
              ) : (
                '提交回答'
              )}
            </button>
          </form>
        )}

        {isInterviewComplete && (
          <div className="interview-complete">
            <div className="complete-message">
              <h3>面试完成！</h3>
              <p>感谢您的参与，面试已经结束。</p>
              <button 
                onClick={handleViewReport}
                className="btn btn-primary btn-large"
              >
                查看面试报告
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatInterface
