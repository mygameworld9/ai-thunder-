import React, { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './FinalReport.css'

const FinalReport = () => {
  const { sessionId } = useParams()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [reportData, setReportData] = useState(null)
  const [sessionData, setSessionData] = useState(null)
  const [pollingInterval, setPollingInterval] = useState(null)

  useEffect(() => {
    fetchSessionData()
    startPolling()
    
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval)
      }
    }
  }, [sessionId])

  const fetchSessionData = async () => {
    try {
      const response = await api.get(`/v1/interview/session/${sessionId}`)
      setSessionData(response.data)
    } catch (error) {
      console.error('获取会话数据失败:', error)
      setError('获取会话数据失败')
    }
  }

  const startPolling = () => {
    // 立即尝试获取报告
    fetchReport()
    
    // 设置轮询，每3秒检查一次
    const interval = setInterval(fetchReport, 3000)
    setPollingInterval(interval)
  }

  const fetchReport = async () => {
    try {
      const response = await api.get(`/v1/interview/report?session_id=${sessionId}`)
      
      if (response.data && response.data.report) {
        // 获取到报告，停止轮询
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
        
        setReportData(response.data.report)
        setIsLoading(false)
      }
    } catch (error) {
      // 如果是404错误，说明报告还在生成中，继续轮询
      if (error.response?.status !== 404) {
        console.error('获取报告失败:', error)
        setError('获取报告失败')
        setIsLoading(false)
        
        if (pollingInterval) {
          clearInterval(pollingInterval)
          setPollingInterval(null)
        }
      }
    }
  }

  const formatScore = (score) => {
    return Math.round(score * 100) / 100
  }

  const getScoreColor = (score) => {
    if (score >= 8) return '#28a745' // 绿色
    if (score >= 6) return '#ffc107' // 黄色
    return '#dc3545' // 红色
  }

  const getScoreLabel = (score) => {
    if (score >= 8) return '优秀'
    if (score >= 6) return '良好'
    if (score >= 4) return '一般'
    return '需要改进'
  }

  const handleBackToDashboard = () => {
    navigate('/dashboard')
  }

  const handleNewInterview = () => {
    navigate('/')
  }

  if (error && !reportData) {
    return (
      <div className="final-report-container">
        <div className="error-container">
          <h3>加载失败</h3>
          <p>{error}</p>
          <div className="error-actions">
            <button onClick={handleBackToDashboard} className="btn btn-secondary">
              返回仪表板
            </button>
            <button onClick={handleNewInterview} className="btn btn-primary">
              开始新的面试
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="final-report-container">
      <div className="report-header">
        <h1>面试评估报告</h1>
        <div className="session-info">
          <span className="info-item">
            目标岗位: <strong>{sessionData?.target_position}</strong>
          </span>
          <span className="info-item">
            AI提供商: <strong>{sessionData?.provider}</strong>
          </span>
          <span className="info-item">
            难度: <strong>{sessionData?.difficulty}</strong>
          </span>
        </div>
      </div>

      {isLoading ? (
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <h3>正在生成面试报告...</h3>
          <p>AI正在分析您的面试表现，请稍候</p>
          <div className="loading-steps">
            <div className="step">
              <span className="step-icon">📝</span>
              <span>分析回答内容</span>
            </div>
            <div className="step">
              <span className="step-icon">📊</span>
              <span>评估技能匹配度</span>
            </div>
            <div className="step">
              <span className="step-icon">🎯</span>
              <span>生成改进建议</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="report-content">
          {/* 总体评分 */}
          <div className="overall-score">
            <div className="score-circle">
              <div 
                className="score-value"
                style={{ color: getScoreColor(reportData.overall_score) }}
              >
                {formatScore(reportData.overall_score)}/10
              </div>
              <div className="score-label">
                {getScoreLabel(reportData.overall_score)}
              </div>
            </div>
            <div className="score-details">
              <h3>总体评分</h3>
              <p>{reportData.overall_feedback}</p>
            </div>
          </div>

          {/* 各项能力评分 */}
          <div className="skill-scores">
            <h3>能力评估</h3>
            <div className="skill-grid">
              {reportData.skill_scores?.map((skill, index) => (
                <div key={index} className="skill-item">
                  <div className="skill-header">
                    <span className="skill-name">{skill.skill}</span>
                    <span 
                      className="skill-score"
                      style={{ color: getScoreColor(skill.score) }}
                    >
                      {formatScore(skill.score)}/10
                    </span>
                  </div>
                  <div className="skill-bar">
                    <div 
                      className="skill-progress"
                      style={{ 
                        width: `${skill.score * 10}%`,
                        backgroundColor: getScoreColor(skill.score)
                      }}
                    ></div>
                  </div>
                  <div className="skill-feedback">{skill.feedback}</div>
                </div>
              ))}
            </div>
          </div>

          {/* 问题分析 */}
          {reportData.question_analysis && (
            <div className="question-analysis">
              <h3>问题分析</h3>
              <div className="analysis-list">
                {reportData.question_analysis.map((analysis, index) => (
                  <div key={index} className="analysis-item">
                    <div className="question-header">
                      <span className="question-number">问题 {index + 1}</span>
                      <span 
                        className="question-score"
                        style={{ color: getScoreColor(analysis.score) }}
                      >
                        {formatScore(analysis.score)}/10
                      </span>
                    </div>
                    <div className="question-text">{analysis.question}</div>
                    <div className="analysis-content">
                      <div className="analysis-section">
                        <h4>您的回答</h4>
                        <p>{analysis.user_answer}</p>
                      </div>
                      <div className="analysis-section">
                        <h4>评估反馈</h4>
                        <p>{analysis.feedback}</p>
                      </div>
                      <div className="analysis-section">
                        <h4>改进建议</h4>
                        <p>{analysis.suggestions}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* 总结建议 */}
          {reportData.improvement_suggestions && (
            <div className="improvement-suggestions">
              <h3>改进建议</h3>
              <ul className="suggestions-list">
                {reportData.improvement_suggestions.map((suggestion, index) => (
                  <li key={index} className="suggestion-item">
                    <span className="suggestion-icon">💡</span>
                    <span>{suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* 行动按钮 */}
          <div className="report-actions">
            <button 
              onClick={handleNewInterview}
              className="btn btn-primary btn-large"
            >
              开始新的面试
            </button>
            <button 
              onClick={handleBackToDashboard}
              className="btn btn-secondary btn-large"
            >
              返回仪表板
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default FinalReport
