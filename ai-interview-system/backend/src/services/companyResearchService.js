const { google } = require('googleapis')
const { query } = require('../config/database')
const { companyCache } = require('../config/redis')

/**
 * 公司背景研究服务
 */
class CompanyResearchService {
  constructor() {
    this.googleApiKey = process.env.GOOGLE_API_KEY
    this.googleCseId = process.env.GOOGLE_CSE_ID
    this.googleSearch = this.googleApiKey ? google.customsearch('v1') : null
  }

  /**
   * 获取公司背景信息
   */
  async getCompanyContext(companyName) {
    try {
      // 检查缓存
      const cached = await companyCache.getCompanyInfo(companyName)
      if (cached) {
        console.log(`从缓存获取公司信息: ${companyName}`)
        return JSON.parse(cached.summary)
      }

      // 如果没有缓存，获取新的公司信息
      const companyInfo = await this.fetchCompanyInfo(companyName)
      
      // 缓存结果（24小时）
      await companyCache.cacheCompanyInfo(companyName, {
        summary: JSON.stringify(companyInfo),
        timestamp: new Date().toISOString()
      })

      return companyInfo

    } catch (error) {
      console.error('获取公司信息失败:', error)
      // 返回基础信息作为备选
      return {
        company_name: companyName,
        company_summary: `${companyName} - 公司信息获取失败，将使用公司名称作为背景`,
        key_focus_areas: [companyName]
      }
    }
  }

  /**
   * 获取公司信息（主要方法）
   */
  async fetchCompanyInfo(companyName) {
    try {
      // 并行获取多种信息
      const searchQueries = [
        `${companyName} 主要业务`,
        `${companyName} 行业和产品`,
        `${companyName} 公司介绍`,
        `${companyName} 技术领域`
      ]

      const searchPromises = searchQueries.map(query => 
        this.performGoogleSearch(query)
      )

      const searchResults = await Promise.allSettled(searchPromises)
      
      // 提取有效的搜索结果
      const validResults = searchResults
        .filter(result => result.status === 'fulfilled' && result.value)
        .map(result => result.value)

      if (validResults.length === 0) {
        throw new Error('未能获取到有效的搜索结果')
      }

      // 使用LLM总结公司信息
      const companySummary = await this.summarizeCompanyInfo(companyName, validResults)
      
      return companySummary

    } catch (error) {
      console.error('获取公司信息时出错:', error)
      // 返回模拟数据
      return this.generateMockCompanyInfo(companyName)
    }
  }

  /**
   * 执行Google搜索
   */
  async performGoogleSearch(query) {
    if (!this.googleSearch) {
      throw new Error('Google API 未配置')
    }

    try {
      const response = await this.googleSearch.cse.list({
        auth: this.googleApiKey,
        cx: this.googleCseId,
        q: query,
        num: 5, // 获取前5个结果
        lr: 'lang_zh' // 中文结果
      })

      const results = response.data.items || []
      
      return {
        query,
        results: results.map(item => ({
          title: item.title,
          snippet: item.snippet,
          link: item.link
        }))
      }

    } catch (error) {
      console.error(`搜索 "${query}" 失败:`, error.message)
      throw error
    }
  }

  /**
   * 使用LLM总结公司信息
   */
  async summarizeCompanyInfo(companyName, searchResults) {
    try {
      // TODO: 集成LLM调用 P-CORP-SUMMARIZE Prompt
      // 暂时使用简单的文本处理

      const allSnippets = searchResults
        .flatMap(result => result.results.map(r => r.snippet))
        .filter(snippet => snippet)

      if (allSnippets.length === 0) {
        return this.generateMockCompanyInfo(companyName)
      }

      // 简单的文本分析
      const summary = this.analyzeCompanyInfo(companyName, allSnippets)
      
      return summary

    } catch (error) {
      console.error('总结公司信息失败:', error)
      return this.generateMockCompanyInfo(companyName)
    }
  }

  /**
   * 分析公司信息
   */
  analyzeCompanyInfo(companyName, snippets) {
    // 提取关键词
    const keywords = this.extractKeywords(snippets)
    
    // 生成公司摘要
    const summary = this.generateCompanySummary(companyName, keywords, snippets)
    
    return {
      company_name: companyName,
      company_summary: summary,
      key_focus_areas: keywords.slice(0, 5) // 取前5个关键词
    }
  }

  /**
   * 提取关键词
   */
  extractKeywords(snippets) {
    const text = snippets.join(' ')
    const words = text.split(/[\s，。；、]/)
    
    // 简单的关键词提取（实际项目中应该使用NLP库）
    const keywordMap = new Map()
    
    const importantWords = [
      '人工智能', 'AI', '机器学习', '大数据', '云计算', '区块链',
      '物联网', '5G', '金融科技', '电子商务', '游戏', '教育',
      '医疗', '健康', '汽车', '制造', '房地产', '金融', '投资'
    ]

    words.forEach(word => {
      if (importantWords.includes(word)) {
        keywordMap.set(word, (keywordMap.get(word) || 0) + 1)
      }
    })

    // 按频率排序
    return Array.from(keywordMap.entries())
      .sort((a, b) => b[1] - a[1])
      .map(entry => entry[0])
  }

  /**
   * 生成公司摘要
   */
  generateCompanySummary(companyName, keywords, snippets) {
    let summary = `${companyName} 是一家`
    
    if (keywords.length > 0) {
      summary += `专注于 ${keywords.slice(0, 3).join('、')} 等领域的`
    }
    
    summary += '公司。'
    
    // 添加更多细节
    if (snippets.length > 0) {
      const firstSnippet = snippets[0]
      const cleanSnippet = firstSnippet.replace(/<[^>]*>/g, '')
      summary += ` ${cleanSnippet}`
    }
    
    return summary
  }

  /**
   * 生成模拟公司信息
   */
  generateMockCompanyInfo(companyName) {
    const mockData = {
      '阿里巴巴': {
        company_name: '阿里巴巴',
        company_summary: '阿里巴巴是一家领先的电子商务和科技公司，专注于在线零售、云计算和数字支付服务。',
        key_focus_areas: ['电子商务', '云计算', '数字支付', '物流', '人工智能']
      },
      '腾讯': {
        company_name: '腾讯',
        company_summary: '腾讯是一家全球领先的互联网科技公司，业务涵盖社交网络、数字娱乐、金融科技和云计算。',
        key_focus_areas: ['社交网络', '游戏', '金融科技', '云计算', '人工智能']
      },
      '字节跳动': {
        company_name: '字节跳动',
        company_summary: '字节跳动是一家全球领先的科技公司，以抖音、今日头条等产品闻名，专注于人工智能和内容推荐技术。',
        key_focus_areas: ['人工智能', '内容推荐', '短视频', '社交媒体', '大数据']
      }
    }

    return mockData[companyName] || {
      company_name: companyName,
      company_summary: `${companyName} 是一家科技公司，致力于为客户提供优质的产品和服务。`,
      key_focus_areas: ['科技', '创新', '服务']
    }
  }

  /**
   * 清除公司缓存
   */
  async clearCompanyCache(companyName) {
    try {
      await companyCache.deleteCompanyInfo(companyName)
      console.log(`已清除公司缓存: ${companyName}`)
      return true
    } catch (error) {
      console.error('清除缓存失败:', error)
      return false
    }
  }

  /**
   * 获取缓存状态
   */
  async getCacheStatus(companyName) {
    try {
      const cached = await companyCache.getCompanyInfo(companyName)
      return {
        isCached: !!cached,
        timestamp: cached?.timestamp || null
      }
    } catch (error) {
      return {
        isCached: false,
        timestamp: null
      }
    }
  }
}

module.exports = new CompanyResearchService()
