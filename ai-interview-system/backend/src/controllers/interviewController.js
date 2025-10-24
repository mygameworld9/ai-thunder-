const { query } = require('../config/database')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs').promises
const { companyCache, sessionCache } = require('../config/redis')
const companyResearchService = require('../services/companyResearchService')
const sessionService = require('../services/sessionService')
const FileUtils = require('../utils/fileUtils')

class InterviewController {
  /**
   * 开始面试 - 处理面试信息输入
   */
  async startInterview(request, reply) {
    try {
      const { 
        target_position, 
        job_description, 
        company_name, 
        additional_info 
      } = request.body

      let resume_content = null
      let file_url = null
      let mime_type = null

      // 处理简历文件上传
      if (request.files && request.files.resume_file) {
        const file = request.files.resume_file
        
        // 验证文件
        FileUtils.validateFileType(file)
        FileUtils.validateFileSize(file)

        // 保存文件并提取内容
        const savedFile = await FileUtils.saveUploadedFile(file)
        resume_content = await this.extractResumeContent(file, await fs.readFile(file.filepath))
        file_url = savedFile.fileUrl
        mime_type = savedFile.mimeType
      }

      // 如果没有提供简历文件但有简历内容
      if (request.body.resume_content) {
        resume_content = request.body.resume_content
      }

      if (!resume_content || !target_position) {
        return reply.status(400).send({
          error: 'MISSING_REQUIRED_FIELDS',
          message: '简历内容和目标岗位是必需的'
        })
      }

      // 处理公司背景研究
      let company_context_summary = null
      if (company_name) {
        company_context_summary = await this.getCompanyContext(company_name)
      }

      // 创建面试会话
      const user_id = request.user?.user_id
      const sessionData = {
        user_id,
        target_position,
        resume_content,
        job_description,
        company_context_summary
      }

      const session = await sessionService.createSession(sessionData)

      // 检查是否需要角色确认
      let role_confirmation_text = null
      if (!job_description) {
        role_confirmation_text = await this.generateRoleConfirmation(
          target_position,
          resume_content,
          company_context_summary
        )
      }

      return {
        session_id: session.session_id,
        role_confirmation_text,
        message: '面试会话创建成功'
      }

    } catch (error) {
      console.error('开始面试失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '面试启动失败，请重试'
      })
    }
  }

  /**
   * 提取简历内容（简化版本）
   */
  async extractResumeContent(file, buffer) {
    const { filename, mimetype } = file
    
    // 根据文件类型提取内容
    if (mimetype === 'text/markdown' || mimetype === 'text/plain') {
      return buffer.toString('utf-8')
    }
    
    if (mimetype === 'application/pdf') {
      // TODO: 集成PDF文本提取库
      return '[PDF文件已上传，内容提取功能待实现]'
    }
    
    if (mimetype.startsWith('image/')) {
      // TODO: 集成OCR服务
      return '[图片文件已上传，OCR文本提取功能待实现]'
    }
    
    return buffer.toString('utf-8')
  }

  /**
   * 获取公司背景信息
   */
  async getCompanyContext(company_name) {
    try {
      const companyInfo = await companyResearchService.getCompanyContext(company_name)
      return JSON.stringify(companyInfo)
    } catch (error) {
      console.error('获取公司信息失败:', error)
      // 返回公司名称作为备选
      return company_name
    }
  }

  /**
   * 生成角色确认文本
   */
  async generateRoleConfirmation(target_position, resume_content, company_context_summary) {
    try {
      // TODO: 集成 LLM 调用 P-CONTEXT-CLARIFY Prompt
      // 暂时返回模拟的确认文本
      
      let confirmation_text = `我注意到您的目标岗位是 "${target_position}"。`
      
      // 简单分析简历内容
      if (resume_content.toLowerCase().includes('react') || 
          resume_content.toLowerCase().includes('javascript')) {
        confirmation_text += ` 基于您的简历中提到的前端开发经验，`
      }
      
      if (resume_content.toLowerCase().includes('python') || 
          resume_content.toLowerCase().includes('machine learning')) {
        confirmation_text += ` 基于您的简历中提到的Python和机器学习经验，`
      }

      // 分析公司背景
      if (company_context_summary && company_context_summary.includes('人工智能')) {
        confirmation_text += ` 结合 ${JSON.parse(company_context_summary).company_name} 在人工智能领域的业务重点，`
      }

      confirmation_text += ` 我推测这个角色将重点关注技术深度和实际项目经验。这是您期望的面试情境吗？`

      return confirmation_text

    } catch (error) {
      console.error('生成角色确认文本失败:', error)
      return null
    }
  }

  /**
   * 配置面试（角色修正）
   */
  async configureInterview(request, reply) {
    try {
      const { session_id, role_correction } = request.body

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      // 更新会话状态
      const updateQuery = `
        UPDATE interview_sessions 
        SET status = 'IN_PROGRESS', 
            company_context_summary = COALESCE($1, company_context_summary)
        WHERE session_id = $2
        RETURNING session_id, status
      `

      const result = await query(updateQuery, [role_correction, session_id])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      // 更新缓存
      await sessionCache.cacheSessionState(session_id, {
        status: 'IN_PROGRESS'
      })

      return {
        session_id,
        status: 'IN_PROGRESS',
        message: '面试配置成功'
      }

    } catch (error) {
      console.error('配置面试失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '面试配置失败'
      })
    }
  }

  /**
   * 开始会话
   */
  async startSession(request, reply) {
    try {
      const { session_id, provider, model, difficulty, mode, count } = request.body

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      // 验证AI提供商
      const validProviders = ['GOOGLE', 'OPENAI', 'OLLAMA']
      if (provider && !validProviders.includes(provider)) {
        return reply.status(400).send({
          error: 'INVALID_PROVIDER',
          message: '不支持的AI服务提供商'
        })
      }

      // 更新会话配置
      const updateQuery = `
        UPDATE interview_sessions 
        SET provider = COALESCE($1, provider),
            model = COALESCE($2, model),
            difficulty = COALESCE($3, difficulty),
            status = 'IN_PROGRESS'
        WHERE session_id = $4
        RETURNING session_id, provider, model, difficulty, status
      `

      const result = await query(updateQuery, [
        provider,
        model,
        difficulty,
        session_id
      ])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      const session = result.rows[0]

      // 更新缓存
      await sessionCache.cacheSessionState(session_id, {
        status: 'IN_PROGRESS',
        provider: session.provider,
        model: session.model,
        difficulty: session.difficulty
      })

      return {
        session_id,
        provider: session.provider,
        model: session.model,
        difficulty: session.difficulty,
        status: 'IN_PROGRESS',
        message: '会话开始成功'
      }

    } catch (error) {
      console.error('开始会话失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '会话启动失败'
      })
    }
  }
}

module.exports = new InterviewController()
