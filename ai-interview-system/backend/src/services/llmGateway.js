const { query } = require('../config/database')
const { google } = require('googleapis')
const OpenAI = require('openai')
const { createOllama } = require('ollama')

/**
 * LLM 网关服务 - 统一管理不同AI服务提供商
 */
class LLMGateway {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_API_KEY
    this.openaiApiKey = process.env.OPENAI_API_KEY
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434'
    
    this.googleClient = this.googleApiKey ? this.initializeGoogleClient() : null
    this.openaiClient = this.openaiApiKey ? new OpenAI({ apiKey: this.openaiApiKey }) : null
    this.ollamaClient = createOllama({ host: this.ollamaBaseUrl })
  }

  /**
   * 初始化 Google 客户端
   */
  initializeGoogleClient() {
    try {
      return google.generativeai({
        apiKey: this.googleApiKey
      })
    } catch (error) {
      console.error('初始化 Google 客户端失败:', error)
      return null
    }
  }

  /**
   * 根据会话信息获取提供商客户端
   */
  getProviderClient(provider, model) {
    switch (provider) {
      case 'GOOGLE':
        if (!this.googleClient) {
          throw new Error('Google API 未配置')
        }
        return {
          client: this.googleClient,
          model: model || 'gemini-2.5-flash',
          adapter: this.googleAdapter
        }
      
      case 'OPENAI':
        if (!this.openaiClient) {
          throw new Error('OpenAI API 未配置')
        }
        return {
          client: this.openaiClient,
          model: model || 'gpt-4o',
          adapter: this.openaiAdapter
        }
      
      case 'OLLAMA':
        return {
          client: this.ollamaClient,
          model: model || 'llama3.1:8b',
          adapter: this.ollamaAdapter
        }
      
      default:
        throw new Error(`不支持的AI服务提供商: ${provider}`)
    }
  }

  /**
   * Google 适配器
   */
  async googleAdapter(client, model, prompt, context = []) {
    try {
      const genAI = client.getGenerativeModel({ model })
      
      // 构建消息历史
      const messages = []
      if (context && context.length > 0) {
        context.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'model',
            parts: [{ text: msg.content }]
          })
        })
      }

      // 添加当前提示
      messages.push({
        role: 'user',
        parts: [{ text: prompt }]
      })

      const result = await genAI.generateContent({
        contents: messages,
        generationConfig: {
          temperature: 0.7,
          topP: 0.9,
          topK: 40,
          maxOutputTokens: 2048
        }
      })

      const response = await result.response
      return response.text()

    } catch (error) {
      console.error('Google API 调用失败:', error)
      throw new Error('Google API 调用失败')
    }
  }

  /**
   * OpenAI 适配器
   */
  async openaiAdapter(client, model, prompt, context = []) {
    try {
      const messages = []
      
      // 添加系统消息（如果需要）
      messages.push({
        role: 'system',
        content: '你是一个专业的面试官，正在对候选人进行技术面试。'
      })

      // 添加历史消息
      if (context && context.length > 0) {
        context.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })
        })
      }

      // 添加当前提示
      messages.push({
        role: 'user',
        content: prompt
      })

      const response = await client.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 2048,
        top_p: 0.9,
        frequency_penalty: 0.0,
        presence_penalty: 0.0
      })

      return response.choices[0].message.content

    } catch (error) {
      console.error('OpenAI API 调用失败:', error)
      throw new Error('OpenAI API 调用失败')
    }
  }

  /**
   * Ollama 适配器
   */
  async ollamaAdapter(client, model, prompt, context = []) {
    try {
      const messages = []
      
      // 添加历史消息
      if (context && context.length > 0) {
        context.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          })
        })
      }

      // 添加当前提示
      messages.push({
        role: 'user',
        content: prompt
      })

      const response = await client.chat({
        model,
        messages,
        options: {
          temperature: 0.7,
          top_p: 0.9,
          repeat_penalty: 1.1
        }
      })

      return response.message.content

    } catch (error) {
      console.error('Ollama API 调用失败:', error)
      throw new Error('Ollama API 调用失败')
    }
  }

  /**
   * 调用 LLM 生成响应（带重试机制）
   */
  async generateResponse(session_id, prompt, context = []) {
    try {
      // 获取会话信息
      const session = await this.getSessionInfo(session_id)
      if (!session) {
        throw new Error('会话不存在')
      }

      const { provider, model } = session
      const providerInfo = this.getProviderClient(provider, model)

      // 使用重试机制调用适配器
      const response = await this.retryWithBackoff(async () => {
        return await providerInfo.adapter(
          providerInfo.client,
          providerInfo.model,
          prompt,
          context
        )
      })

      return {
        provider,
        model,
        response,
        timestamp: new Date().toISOString()
      }

    } catch (error) {
      console.error('LLM 调用失败:', error)
      
      // 记录错误日志
      await this.logError(session_id, provider, error.message)
      
      throw error
    }
  }

  /**
   * 记录错误日志
   */
  async logError(session_id, provider, errorMessage) {
    try {
      const queryText = `
        INSERT INTO system_logs 
        (session_id, provider, error_message, log_level, created_at)
        VALUES ($1, $2, $3, 'ERROR', NOW())
      `
      await query(queryText, [session_id, provider, errorMessage])
    } catch (error) {
      console.error('记录错误日志失败:', error)
    }
  }

  /**
   * 从数据库获取会话信息
   */
  async getSessionInfo(session_id) {
    try {
      const queryText = `
        SELECT provider, model, target_position, job_description, 
               company_context_summary, difficulty, current_question_index, total_questions
        FROM interview_sessions 
        WHERE session_id = $1
      `
      
      const result = await query(queryText, [session_id])
      
      if (result.rows.length === 0) {
        return null
      }

      return result.rows[0]

    } catch (error) {
      console.error('获取会话信息失败:', error)
      throw new Error('获取会话信息失败')
    }
  }

  /**
   * 获取可用的模型列表
   */
  getAvailableModels(provider) {
    const models = {
      GOOGLE: [
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-pro'
      ],
      OPENAI: [
        'gpt-4o',
        'gpt-4-turbo',
        'gpt-3.5-turbo'
      ],
      OLLAMA: [
        'llama3.1:8b',
        'llama3.1:70b',
        'mistral:7b'
      ]
    }

    return models[provider] || []
  }

  /**
   * 检查提供商是否可用
   */
  async checkProviderAvailability(provider) {
    try {
      const providerInfo = this.getProviderClient(provider)
      
      // 简单的可用性检查
      if (provider === 'GOOGLE' && !this.googleClient) {
        return { available: false, error: 'Google API 未配置' }
      }
      
      if (provider === 'OPENAI' && !this.openaiClient) {
        return { available: false, error: 'OpenAI API 未配置' }
      }
      
      if (provider === 'OLLAMA') {
        // 可以添加对 Ollama 服务的健康检查
        return { available: true }
      }

      return { available: true }

    } catch (error) {
      return { available: false, error: error.message }
    }
  }

  /**
   * 错误重试机制
   */
  async retryWithBackoff(fn, maxRetries = 3) {
    let lastError
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        if (attempt === maxRetries) {
          break
        }
        
        // 指数退避
        const delay = Math.pow(2, attempt) * 1000 // 2^attempt 秒
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
    
    throw lastError
  }
}

module.exports = new LLMGateway()
