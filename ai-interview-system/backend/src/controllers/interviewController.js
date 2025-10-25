const { query } = require('../config/database')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const fs = require('fs').promises
const { companyCache, sessionCache } = require('../config/redis')
const companyResearchService = require('../services/companyResearchService')
const sessionService = require('../services/sessionService')
const llmGateway = require('../services/llmGateway')
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
        const fileBuffer = await fs.readFile(file.filepath)
        resume_content = await FileUtils.extractFileContent(file, fileBuffer)
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

      // 检查会话是否存在
      const checkQuery = `
        SELECT session_id, status FROM interview_sessions 
        WHERE session_id = $1
      `
      const checkResult = await query(checkQuery, [session_id])

      if (checkResult.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      const currentStatus = checkResult.rows[0].status

      // 如果已经有角色修正，需要重新生成确认文本
      if (role_correction) {
        // TODO: 集成 LLM 调用 P-CONTEXT-CLARIFY Prompt 重新生成确认文本
        // 暂时返回成功，实际项目中应该返回新的确认文本
        
        // 更新会话的公司背景信息
        const updateQuery = `
          UPDATE interview_sessions 
          SET company_context_summary = COALESCE($1, company_context_summary),
              updated_at = NOW()
          WHERE session_id = $2
          RETURNING session_id, status
        `

        const result = await query(updateQuery, [role_correction, session_id])

        // 更新缓存
        await sessionCache.updateSessionState(session_id, {
          company_context_summary: role_correction
        })

        return {
          session_id: result.rows[0].session_id,
          status: result.rows[0].status,
          message: '角色修正成功',
          // TODO: 在实际项目中，这里应该返回新的确认文本
          new_role_confirmation_text: null
        }
      } else {
        // 确认角色，直接进入配置阶段
        const updateQuery = `
          UPDATE interview_sessions 
          SET status = 'CONFIGURED', 
              updated_at = NOW()
          WHERE session_id = $1
          RETURNING session_id, status
        `

        const result = await query(updateQuery, [session_id])

        // 更新缓存
        await sessionCache.updateSessionState(session_id, {
          status: 'CONFIGURED'
        })

        return {
          session_id: result.rows[0].session_id,
          status: result.rows[0].status,
          message: '角色确认成功'
        }
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
   * 获取会话信息
   */
  async getSessionInfo(request, reply) {
    try {
      const { session_id } = request.params

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      // 从缓存获取会话信息
      const cached = await sessionCache.getSessionState(session_id)
      if (cached) {
        return {
          session_id: cached.session_id,
          target_position: cached.target_position,
          job_description: cached.job_description,
          company_name: this.extractCompanyName(cached.company_context_summary),
          role_confirmation_text: cached.role_confirmation_text || null,
          status: cached.status
        }
      }

      // 从数据库获取
      const getSessionQuery = `
        SELECT 
          s.session_id, s.target_position, s.job_description, s.company_context_summary,
          s.status, s.provider, s.model, s.difficulty, s.total_questions,
          r.content as resume_content
        FROM interview_sessions s
        LEFT JOIN resumes r ON s.resume_id = r.resume_id
        WHERE s.session_id = $1
      `

      const result = await query(getSessionQuery, [session_id])

      if (result.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      const session = result.rows[0]

      // 缓存会话信息
      const sessionData = {
        session_id: session.session_id,
        target_position: session.target_position,
        job_description: session.job_description,
        company_context_summary: session.company_context_summary,
        status: session.status,
        provider: session.provider,
        model: session.model,
        difficulty: session.difficulty,
        total_questions: session.total_questions,
        resume_content: session.resume_content
      }

      await sessionCache.cacheSessionState(session_id, sessionData)

      return {
        session_id: session.session_id,
        target_position: session.target_position,
        job_description: session.job_description,
        company_name: this.extractCompanyName(session.company_context_summary),
        role_confirmation_text: null, // 这里需要根据实际逻辑返回
        status: session.status
      }

    } catch (error) {
      console.error('获取会话信息失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取会话信息失败'
      })
    }
  }

  /**
   * 提取公司名称辅助方法
   */
  extractCompanyName(companyContextSummary) {
    if (!companyContextSummary) {
      return null
    }

    try {
      const context = JSON.parse(companyContextSummary)
      return context.company_name || context.company_name
    } catch (error) {
      // 如果不是JSON格式，直接返回原始文本
      return companyContextSummary
    }
  }

  /**
   * 提交答案并生成下一个问题
   */
  async submitAnswer(request, reply) {
    try {
      const { session_id, answer } = request.body

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      if (!answer || !answer.trim()) {
        return reply.status(400).send({
          error: 'MISSING_ANSWER',
          message: '答案是必需的'
        })
      }

      // 获取会话信息
      const sessionQuery = `
        SELECT provider, model, difficulty, target_position, job_description,
               company_context_summary, current_question_index, total_questions
        FROM interview_sessions 
        WHERE session_id = $1
      `
      const sessionResult = await query(sessionQuery, [session_id])

      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      const session = sessionResult.rows[0]
      const currentQuestionIndex = session.current_question_index || 0
      const totalQuestions = session.total_questions || 10

      // 保存用户答案
      const answerQuery = `
        INSERT INTO interview_messages 
        (session_id, role, content, question_index)
        VALUES ($1, 'user', $2, $3)
        RETURNING message_id
      `
      const answerResult = await query(answerQuery, [
        session_id,
        answer.trim(),
        currentQuestionIndex
      ])

      // 检查是否达到问题数量上限
      if (currentQuestionIndex >= totalQuestions) {
        // 更新会话状态为完成
        await this.completeInterview(session_id)
        
        return {
          question: null,
          is_complete: true,
          current_question_index: currentQuestionIndex,
          total_questions: totalQuestions,
          message: '面试已完成'
        }
      }

      // 生成下一个问题
      const nextQuestion = await this.generateNextQuestion(session, currentQuestionIndex + 1, answer.trim())
      
      // 保存AI问题
      if (nextQuestion) {
        const questionQuery = `
          INSERT INTO interview_messages 
          (session_id, role, content, question_index)
          VALUES ($1, 'assistant', $2, $3)
        `
        await query(questionQuery, [
          session_id,
          nextQuestion,
          currentQuestionIndex + 1
        ])

        // 更新会话的当前问题索引
        await this.updateQuestionIndex(session_id, currentQuestionIndex + 1)
      }

      return {
        question: nextQuestion,
        is_complete: currentQuestionIndex + 1 >= totalQuestions,
        current_question_index: currentQuestionIndex + 1,
        total_questions: totalQuestions,
        message: '答案提交成功'
      }

    } catch (error) {
      console.error('提交答案失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '提交答案失败'
      })
    }
  }

  /**
   * 生成下一个问题
   */
  async generateNextQuestion(session, questionIndex, previousAnswer) {
    try {
      const { provider, model, difficulty, target_position, job_description, company_context_summary } = session

      // 构建问题生成的上下文
      const context = this.buildQuestionContext(session, questionIndex, previousAnswer)
      
      // TODO: 从数据库获取 P-QUESTION-GENERATE Prompt
      const prompt = this.buildQuestionPrompt(session, questionIndex)
      
      // 调用 LLM 生成问题
      const response = await llmGateway.generateResponse(session.session_id, prompt, context)
      
      return response.response

    } catch (error) {
      console.error('生成问题失败:', error)
      // 返回默认问题
      return this.getDefaultQuestion(questionIndex)
    }
  }

  /**
   * 构建问题生成的上下文
   */
  buildQuestionContext(session, questionIndex, previousAnswer) {
    const context = []
    
    // 添加面试基本信息
    context.push({
      role: 'system',
      content: `你是一个专业的面试官，正在对候选人进行${session.difficulty}级别的${session.target_position}岗位面试。`
    })

    // 添加职位描述
    if (session.job_description) {
      context.push({
        role: 'system',
        content: `职位描述: ${session.job_description}`
      })
    }

    // 添加公司背景
    if (session.company_context_summary) {
      context.push({
        role: 'system',
        content: `公司背景: ${session.company_context_summary}`
      })
    }

    // 添加之前的回答（如果是后续问题）
    if (questionIndex > 1 && previousAnswer) {
      context.push({
        role: 'user',
        content: previousAnswer
      })
    }

    return context
  }

  /**
   * 构建问题生成的 Prompt
   */
  buildQuestionPrompt(session, questionIndex) {
    const basePrompt = `你是一个专业的面试官，正在对候选人进行${session.difficulty}级别的${session.target_position}岗位面试。`

    let prompt = basePrompt

    // 添加职位描述信息
    if (session.job_description) {
      prompt += `\n\n职位描述: ${session.job_description}`
    }

    // 添加公司背景信息
    if (session.company_context_summary) {
      prompt += `\n\n公司背景: ${session.company_context_summary}`
    }

    // 根据问题索引生成不同类型的问题
    if (questionIndex === 1) {
      prompt += `\n\n这是第一个问题，请从基础的技术问题开始，考察候选人的基本技能和经验。`
    } else if (questionIndex <= 3) {
      prompt += `\n\n这是第${questionIndex}个问题，请继续深入考察候选人的技术能力和项目经验。`
    } else if (questionIndex <= 7) {
      prompt += `\n\n这是第${questionIndex}个问题，请开始考察候选人的系统设计能力和解决问题的思路。`
    } else {
      prompt += `\n\n这是第${questionIndex}个问题，请考察候选人的高级技术能力和领导力。`
    }

    prompt += `\n\n请生成一个具体的技术面试问题，要求问题清晰、有针对性，并且与目标岗位相关。`

    return prompt
  }

  /**
   * 获取默认问题（当LLM调用失败时）
   */
  getDefaultQuestion(questionIndex) {
    const defaultQuestions = [
      "请介绍一下你自己和你的技术背景。",
      "你为什么选择这个技术方向？",
      "请描述一个你最近参与的项目。",
      "你在项目中遇到的最大挑战是什么？",
      "你是如何解决技术难题的？",
      "请谈谈你对新技术的学习能力。",
      "你如何进行代码审查和质量保证？",
      "请描述你的团队合作经验。",
      "你如何处理项目中的冲突？",
      "你对未来的职业发展有什么规划？"
    ]

    return defaultQuestions[questionIndex - 1] || "请继续回答下一个问题。"
  }

  /**
   * 更新问题索引
   */
  async updateQuestionIndex(session_id, questionIndex) {
    try {
      const queryText = `
        UPDATE interview_sessions 
        SET current_question_index = $1, updated_at = NOW()
        WHERE session_id = $2
      `
      await query(queryText, [questionIndex, session_id])
    } catch (error) {
      console.error('更新问题索引失败:', error)
    }
  }

  /**
   * 完成面试
   */
  async completeInterview(session_id) {
    try {
      const queryText = `
        UPDATE interview_sessions 
        SET status = 'COMPLETED', completed_at = NOW()
        WHERE session_id = $1
      `
      await query(queryText, [session_id])

      // 更新缓存
      await sessionCache.updateSessionState(session_id, {
        status: 'COMPLETED',
        completed_at: new Date().toISOString()
      })

      // 触发报告生成
      await this.generateReport(session_id)

    } catch (error) {
      console.error('完成面试失败:', error)
    }
  }

  /**
   * 生成面试报告
   */
  async generateReport(session_id) {
    try {
      // 获取会话信息和消息历史
      const sessionQuery = `
        SELECT 
          s.target_position, s.job_description, s.company_context_summary,
          s.provider, s.model, s.difficulty, s.total_questions,
          s.resume_content
        FROM interview_sessions s
        WHERE s.session_id = $1
      `
      const sessionResult = await query(sessionQuery, [session_id])

      if (sessionResult.rows.length === 0) {
        throw new Error('会话不存在')
      }

      const session = sessionResult.rows[0]

      // 获取面试消息历史
      const messagesQuery = `
        SELECT role, content, question_index, created_at
        FROM interview_messages
        WHERE session_id = $1
        ORDER BY created_at ASC
      `
      const messagesResult = await query(messagesQuery, [session_id])

      const messages = messagesResult.rows

      // 构建报告生成的上下文
      const context = this.buildReportContext(session, messages)
      
      // TODO: 从数据库获取 P-FINAL-REPORT Prompt
      const prompt = this.buildReportPrompt(session, messages)
      
      // 调用 LLM 生成报告
      const response = await llmGateway.generateResponse(session_id, prompt, context)
      
      // 保存生成的报告
      await this.saveReport(session_id, response.response)

    } catch (error) {
      console.error('生成报告失败:', error)
      // 记录错误但不阻止面试完成
    }
  }

  /**
   * 构建报告生成的上下文
   */
  buildReportContext(session, messages) {
    const context = []
    
    // 添加面试基本信息
    context.push({
      role: 'system',
      content: `你是一个专业的面试评估专家，正在为${session.difficulty}级别的${session.target_position}岗位面试生成评估报告。`
    })

    // 添加职位描述
    if (session.job_description) {
      context.push({
        role: 'system',
        content: `职位描述: ${session.job_description}`
      })
    }

    // 添加公司背景
    if (session.company_context_summary) {
      context.push({
        role: 'system',
        content: `公司背景: ${session.company_context_summary}`
      })
    }

    // 添加面试消息历史
    messages.forEach(msg => {
      context.push({
        role: msg.role === 'user' ? 'user' : 'assistant',
        content: msg.content
      })
    })

    return context
  }

  /**
   * 构建报告生成的 Prompt
   */
  buildReportPrompt(session, messages) {
    const basePrompt = `你是一个专业的面试评估专家，正在为${session.difficulty}级别的${session.target_position}岗位面试生成评估报告。`

    let prompt = basePrompt

    // 添加职位描述信息
    if (session.job_description) {
      prompt += `\n\n职位描述: ${session.job_description}`
    }

    // 添加公司背景信息
    if (session.company_context_summary) {
      prompt += `\n\n公司背景: ${session.company_context_summary}`
    }

    prompt += `\n\n面试消息历史:`
    messages.forEach((msg, index) => {
      prompt += `\n${msg.role === 'user' ? '候选人' : '面试官'}: ${msg.content}`
    })

    prompt += `\n\n请生成一个结构化的JSON格式面试报告，包含以下字段：`
    prompt += `\n- overall_score: 总体评分 (0-10分)`
    prompt += `\n- overall_feedback: 总体反馈描述`
    prompt += `\n- skill_scores: 技能评分数组，每个元素包含 skill(技能名称)、score(评分0-10)、feedback(反馈)`
    prompt += `\n- question_analysis: 问题分析数组，每个元素包含 question(问题)、score(评分0-10)、user_answer(用户回答)、feedback(评估反馈)、suggestions(改进建议)`
    prompt += `\n- improvement_suggestions: 改进建议数组`

    prompt += `\n\n请确保评分客观公正，反馈具体有针对性，建议实用可行。`

    return prompt
  }

  /**
   * 保存报告
   */
  async saveReport(session_id, reportContent) {
    try {
      // 解析JSON报告
      let reportData
      try {
        reportData = JSON.parse(reportContent)
      } catch (error) {
        console.error('报告JSON解析失败:', error)
        // 如果JSON解析失败，保存原始文本
        reportData = {
          overall_score: 5,
          overall_feedback: '报告生成中...',
          skill_scores: [],
          question_analysis: [],
          improvement_suggestions: ['报告正在生成中，请稍后查看']
        }
      }

      // 保存报告到数据库
      const queryText = `
        INSERT INTO interview_reports 
        (session_id, report_data, generated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (session_id) 
        DO UPDATE SET 
          report_data = $2, 
          generated_at = NOW()
      `
      await query(queryText, [session_id, JSON.stringify(reportData)])

    } catch (error) {
      console.error('保存报告失败:', error)
    }
  }

  /**
   * 获取面试报告
   */
  async getReport(request, reply) {
    try {
      const { session_id } = request.query

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      // 检查会话是否存在
      const sessionQuery = `
        SELECT session_id FROM interview_sessions 
        WHERE session_id = $1
      `
      const sessionResult = await query(sessionQuery, [session_id])

      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      // 获取报告
      const reportQuery = `
        SELECT report_data, generated_at
        FROM interview_reports 
        WHERE session_id = $1
      `
      const reportResult = await query(reportQuery, [session_id])

      if (reportResult.rows.length === 0) {
        // 报告还在生成中
        return reply.status(404).send({
          error: 'REPORT_NOT_READY',
          message: '报告正在生成中，请稍后重试'
        })
      }

      const report = reportResult.rows[0]

      return {
        session_id,
        report: report.report_data,
        generated_at: report.generated_at
      }

    } catch (error) {
      console.error('获取报告失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取报告失败'
      })
    }
  }

  /**
   * 获取会话消息
   */
  async getSessionMessages(request, reply) {
    try {
      const { session_id } = request.params

      if (!session_id) {
        return reply.status(400).send({
          error: 'MISSING_SESSION_ID',
          message: '会话ID是必需的'
        })
      }

      // 检查会话是否存在
      const sessionQuery = `
        SELECT session_id FROM interview_sessions 
        WHERE session_id = $1
      `
      const sessionResult = await query(sessionQuery, [session_id])

      if (sessionResult.rows.length === 0) {
        return reply.status(404).send({
          error: 'SESSION_NOT_FOUND',
          message: '会话不存在'
        })
      }

      // 获取会话消息
      const messagesQuery = `
        SELECT 
          message_id,
          role,
          content,
          question_index,
          created_at
        FROM interview_messages 
        WHERE session_id = $1 
        ORDER BY created_at ASC
      `
      const messagesResult = await query(messagesQuery, [session_id])

      return {
        session_id,
        messages: messagesResult.rows.map(msg => ({
          id: msg.message_id,
          role: msg.role,
          content: msg.content,
          question_index: msg.question_index,
          timestamp: msg.created_at
        }))
      }

    } catch (error) {
      console.error('获取消息失败:', error)
      return reply.status(500).send({
        error: 'INTERNAL_SERVER_ERROR',
        message: '获取消息失败'
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
