import React, { useState } from 'react'
import { useForm } from 'react-hook-form'
import { useNavigate } from 'react-router-dom'
import { useAuthStore } from '../store/authStore'
import api from '../services/api'
import './InterviewSetupForm.css'

const InterviewSetupForm = () => {
  const [isLoading, setIsLoading] = useState(false)
  const [fileInfo, setFileInfo] = useState(null)
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthStore()

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch
  } = useForm({
    mode: 'onBlur'
  })

  const targetPosition = watch('target_position')

  // 文件选择处理
  const handleFileChange = (event) => {
    const file = event.target.files[0]
    if (file) {
      const validTypes = ['application/pdf', 'text/markdown', 'image/png', 'image/jpeg']
      const maxSize = 10 * 1024 * 1024 // 10MB

      if (!validTypes.includes(file.type)) {
        alert('不支持的文件格式。请上传 PDF、MD、PNG 或 JPG 文件。')
        return
      }

      if (file.size > maxSize) {
        alert('文件大小不能超过 10MB。')
        return
      }

      setFileInfo({
        name: file.name,
        size: Math.round(file.size / 1024) + ' KB',
        type: file.type
      })

      setValue('resume_file', file)
    }
  }

  // 移除文件
  const removeFile = () => {
    setFileInfo(null)
    setValue('resume_file', null)
    document.getElementById('resume-file-input').value = ''
  }

  // 表单提交
  const onSubmit = async (data) => {
    setIsLoading(true)

    try {
      const formData = new FormData()
      
      // 添加表单字段
      formData.append('target_position', data.target_position)
      if (data.job_description) {
        formData.append('job_description', data.job_description)
      }
      if (data.company_name) {
        formData.append('company_name', data.company_name)
      }
      if (data.additional_info) {
        formData.append('additional_info', data.additional_info)
      }
      
      // 添加文件
      if (data.resume_file) {
        formData.append('resume_file', data.resume_file)
      }

      const response = await api.post('/v1/interview/start', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })

      const { session_id, role_confirmation_text } = response.data

      // 如果有角色确认文本，跳转到确认页面
      if (role_confirmation_text) {
        navigate(`/interview/${session_id}/confirm`, { 
          state: { roleConfirmationText: role_confirmation_text } 
        })
      } else {
        // 直接进入面试
        navigate(`/interview/${session_id}`)
      }

    } catch (error) {
      console.error('面试启动失败:', error)
      alert('面试启动失败，请重试。')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="interview-setup-form">
      <div className="form-container">
        <div className="form-header">
          <h1>开始模拟面试</h1>
          <p>请填写以下信息，我们将为您创建个性化的面试体验</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="setup-form">
          {/* 目标岗位 */}
          <div className="form-group">
            <label className="form-label" htmlFor="target_position">
              目标岗位 <span className="required">*</span>
            </label>
            <input
              id="target_position"
              type="text"
              placeholder="例如：前端开发工程师、Java后端工程师"
              className={`form-input ${errors.target_position ? 'error' : ''}`}
              {...register('target_position', {
                required: '请输入目标岗位',
                minLength: {
                  value: 2,
                  message: '岗位名称至少需要2个字符'
                }
              })}
            />
            {errors.target_position && (
              <span className="error-message">{errors.target_position.message}</span>
            )}
          </div>

          {/* 简历文件上传 */}
          <div className="form-group">
            <label className="form-label" htmlFor="resume_file">
              简历文件 <span className="required">*</span>
            </label>
            <div className="file-upload-container">
              <input
                id="resume-file-input"
                type="file"
                accept=".pdf,.md,.png,.jpg,.jpeg"
                onChange={handleFileChange}
                className="file-input"
                style={{ display: 'none' }}
              />
              
              {!fileInfo ? (
                <div className="file-upload-placeholder">
                  <button
                    type="button"
                    onClick={() => document.getElementById('resume-file-input').click()}
                    className="btn btn-secondary"
                  >
                    选择简历文件
                  </button>
                  <p className="file-hint">
                    支持 PDF、MD、PNG、JPG 格式，最大 10MB
                  </p>
                </div>
              ) : (
                <div className="file-info">
                  <div className="file-details">
                    <span className="file-name">{fileInfo.name}</span>
                    <span className="file-size">{fileInfo.size}</span>
                  </div>
                  <button
                    type="button"
                    onClick={removeFile}
                    className="btn btn-danger btn-sm"
                  >
                    移除
                  </button>
                </div>
              )}
            </div>
            {errors.resume_file && (
              <span className="error-message">{errors.resume_file.message}</span>
            )}
          </div>

          {/* 公司名称 */}
          <div className="form-group">
            <label className="form-label" htmlFor="company_name">
              公司名称 <span className="optional">(可选)</span>
            </label>
            <input
              id="company_name"
              type="text"
              placeholder="例如：阿里巴巴、腾讯、字节跳动"
              className="form-input"
              {...register('company_name')}
            />
            <p className="field-hint">
              如果提供公司名称，我们将研究该公司背景，为您提供更精准的面试情境
            </p>
          </div>

          {/* 职位描述 */}
          <div className="form-group">
            <label className="form-label" htmlFor="job_description">
              职位描述 <span className="optional">(可选)</span>
            </label>
            <textarea
              id="job_description"
              placeholder="粘贴职位描述内容..."
              className="form-textarea form-input"
              rows="6"
              {...register('job_description')}
            />
            <p className="field-hint">
              如果您有具体的职位描述，可以粘贴在这里，这将帮助我们更好地理解面试要求
            </p>
          </div>

          {/* 额外信息 */}
          <div className="form-group">
            <label className="form-label" htmlFor="additional_info">
              额外信息 <span className="optional">(可选)</span>
            </label>
            <textarea
              id="additional_info"
              placeholder="任何您希望我们了解的额外信息..."
              className="form-textarea form-input"
              rows="4"
              {...register('additional_info')}
            />
            <p className="field-hint">
              比如您的特殊技能、项目经验或其他相关信息
            </p>
          </div>

          {/* 提交按钮 */}
          <div className="form-actions">
            {!isAuthenticated && (
              <p className="auth-notice">
                <span className="notice-icon">⚠️</span>
                请先登录以保存您的面试记录
              </p>
            )}
            <button
              type="submit"
              disabled={isLoading || !targetPosition}
              className="btn btn-primary btn-large"
            >
              {isLoading ? (
                <>
                  <span className="loading"></span>
                  正在启动面试...
                </>
              ) : (
                '开始模拟面试'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default InterviewSetupForm
