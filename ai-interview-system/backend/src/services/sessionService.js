const { query } = require('../config/database')
const { v4: uuidv4 } = require('uuid')
const { sessionCache } = require('../config/redis')

/**
 * 会话管理服务
 */
class SessionService {
  /**
   * 创建新的面试会话
   */
  async createSession(userData) {
    try {
      const {
        user_id,
        target_position,
        resume_content,
        job_description,
        company_context_summary,
        provider = 'GOOGLE',
        model = 'gemini-2.5-flash',
        difficulty = 'Senior',
        total_questions = 10
      } = userData

      const session_id = uuidv4()

      // 创建简历记录（如果有用户和简历内容）
      let resume_id = null
      if (user_id && resume_content) {
        const insertResumeQuery = `
          INSERT INTO resumes (user_id, title, content, file_url, mime_type)
          VALUES ($1, $2, $3, $4, $5)
          RETURNING resume_id
        `
        const resumeResult = await query(insertResumeQuery, [
          user_id,
          `${target_position} - 简历`,
          resume_content,
          null, // file_url
          null  // mime_type
        ])
        resume_id = resumeResult.rows[0].resume_id
      }

      // 创建会话记录
      const insertSessionQuery = `
        INSERT INTO interview_sessions (
          session_id, user_id, resume_id, target_position, job_description,
          company_context_summary, status, difficulty, provider, model,
          total_questions, current_question_index
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
        RETURNING session_id, created_at
      `

      const sessionResult = await query(insertSessionQuery, [
        session_id,
        user_id,
        resume_id,
        target_position,
        job_description,
        company_context_summary,
        'CONFIGURING', // 初始状态
        difficulty,
        provider,
        model,
        total_questions,
        0 // 当前问题索引
      ])

      const session = sessionResult.rows[0]

      // 缓存会话状态
      await sessionCache.cacheSessionState(session_id, {
        status: 'CONFIGURING',
        target_position,
        resume_content,
        job_description,
        company_context_summary,
        provider,
        model,
        difficulty,
        total_questions
      })

      return {
        session_id: session.session_id,
        created_at: session.created_at,
        status: 'CONFIGURING'
      }

    } catch (error) {
      console.error('创建会话失败:', error)
      throw new Error('会话创建失败')
    }
  }

  /**
   * 获取会话信息
   */
  async getSession(session_id) {
    try {
      // 检查缓存
      const cached = await sessionCache.getSessionState(session_id)
      if (cached) {
        return cached
      }

      // 从数据库获取
      const getSessionQuery = `
        SELECT 
          s.session_id, s.user_id, s.resume_id, s.target_position,
          s.job_description, s.company_context_summary, s.status,
          s.difficulty, s.provider, s.model, s.total_questions,
          s.current_question_index, s.created_at, s.updated_at,
          r.content as resume_content, r.file_url
        FROM interview_sessions s
        LEFT JOIN resumes r ON s.resume_id = r.resume_id
        WHERE s.session_id = $1
      `

      const result = await query(getSessionQuery, [session_id])

      if (result.rows.length === 0) {
        return null
      }

      const session = result.rows[0]

      // 缓存会话信息
      const sessionData = {
        session_id: session.session_id,
        user_id: session.user_id,
        resume_id: session.resume_id,
        target_position: session.target_position,
        job_description: session.job_description,
        company_context_summary: session.company_context_summary,
        status: session.status,
        difficulty: session.difficulty,
        provider: session.provider,
        model: session.model,
        total_questions: session.total_questions,
        current_question_index: session.current_question_index,
        created_at: session.created_at,
        updated_at: session.updated_at,
        resume_content: session.resume_content,
        file_url: session.file_url
      }

      await sessionCache.cacheSessionState(session_id, sessionData)

      return sessionData

    } catch (error) {
      console.error('获取会话信息失败:', error)
      throw new Error('获取会话信息失败')
    }
  }

  /**
   * 更新会话状态
   */
  async updateSessionStatus(session_id, status, updates = {}) {
    try {
      const updateFields = ['status = $1']
      const values = [status]
      let paramIndex = 2

      // 添加其他更新字段
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          updateFields.push(`${key} = $${paramIndex}`)
          values.push(value)
          paramIndex++
        }
      }

      const updateQuery = `
        UPDATE interview_sessions 
        SET ${updateFields.join(', ')}, updated_at = NOW()
        WHERE session_id = $${paramIndex}
        RETURNING session_id, status
      `

      values.push(session_id)

      const result = await query(updateQuery, values)

      if (result.rows.length === 0) {
        throw new Error('会话不存在')
      }

      // 更新缓存
      const cacheUpdate = { status }
      for (const [key, value] of Object.entries(updates)) {
        if (value !== undefined && value !== null) {
          cacheUpdate[key] = value
        }
      }

      await sessionCache.updateSessionState(session_id, cacheUpdate)

      return result.rows[0]

    } catch (error) {
      console.error('更新会话状态失败:', error)
      throw new Error('会话状态更新失败')
    }
  }

  /**
   * 获取用户的所有会话
   */
  async getUserSessions(user_id, limit = 10, offset = 0) {
    try {
      const getSessionsQuery = `
        SELECT 
          s.session_id, s.target_position, s.status, s.difficulty,
          s.provider, s.model, s.total_questions, s.current_question_index,
          s.created_at, s.updated_at,
          r.title as resume_title
        FROM interview_sessions s
        LEFT JOIN resumes r ON s.resume_id = r.resume_id
        WHERE s.user_id = $1
        ORDER BY s.created_at DESC
        LIMIT $2 OFFSET $3
      `

      const result = await query(getSessionsQuery, [user_id, limit, offset])

      return result.rows.map(session => ({
        session_id: session.session_id,
        target_position: session.target_position,
        status: session.status,
        difficulty: session.difficulty,
        provider: session.provider,
        model: session.model,
        total_questions: session.total_questions,
        current_question_index: session.current_question_index,
        created_at: session.created_at,
        updated_at: session.updated_at,
        resume_title: session.resume_title
      }))

    } catch (error) {
      console.error('获取用户会话失败:', error)
      throw new Error('获取用户会话失败')
    }
  }

  /**
   * 删除会话
   */
  async deleteSession(session_id, user_id) {
    try {
      // 检查会话是否属于该用户
      const checkQuery = `
        SELECT session_id FROM interview_sessions 
        WHERE session_id = $1 AND user_id = $2
      `

      const checkResult = await query(checkQuery, [session_id, user_id])

      if (checkResult.rows.length === 0) {
        throw new Error('会话不存在或不属于该用户')
      }

      // 删除相关的消息记录
      await query('DELETE FROM interview_messages WHERE session_id = $1', [session_id])

      // 删除会话记录
      await query('DELETE FROM interview_sessions WHERE session_id = $1', [session_id])

      // 清除缓存
      await sessionCache.deleteSessionState(session_id)

      return { message: '会话删除成功' }

    } catch (error) {
      console.error('删除会话失败:', error)
      throw new Error('会话删除失败')
    }
  }

  /**
   * 清除会话缓存
   */
  async clearSessionCache(session_id) {
    try {
      await sessionCache.deleteSessionState(session_id)
      return true
    } catch (error) {
      console.error('清除会话缓存失败:', error)
      return false
    }
  }

  /**
   * 获取会话统计信息
   */
  async getSessionStats(user_id) {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_sessions,
          COUNT(CASE WHEN status = 'COMPLETED' THEN 1 END) as completed_sessions,
          COUNT(CASE WHEN status = 'IN_PROGRESS' THEN 1 END) as in_progress_sessions,
          AVG(current_question_index) as avg_progress
        FROM interview_sessions 
        WHERE user_id = $1
      `

      const result = await query(statsQuery, [user_id])

      return result.rows[0]

    } catch (error) {
      console.error('获取会话统计失败:', error)
      throw new Error('获取会话统计失败')
    }
  }
}

module.exports = new SessionService()
