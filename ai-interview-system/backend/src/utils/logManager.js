const { query } = require('../config/database');

/**
 * 日志管理工具类
 * 提供日志查询、清除、统计等功能
 */
class LogManager {
  /**
   * 清除所有系统日志
   */
  async clearAllLogs() {
    try {
      console.log('开始清除所有系统日志...');
      
      // 先备份日志统计信息
      const stats = await this.getLogStatistics();
      
      // 清除所有日志
      const deleteQuery = 'TRUNCATE TABLE system_logs RESTART IDENTITY CASCADE';
      await query(deleteQuery);
      
      console.log(`✅ 成功清除所有系统日志，清除前共有 ${stats.total_logs} 条日志`);
      
      return {
        success: true,
        message: `成功清除 ${stats.total_logs} 条日志`,
        previous_stats: stats
      };
    } catch (error) {
      console.error('清除日志失败:', error);
      throw new Error('清除日志失败: ' + error.message);
    }
  }

  /**
   * 按条件清除日志
   */
  async clearLogsByCondition(condition, params = []) {
    try {
      console.log(`开始按条件清除日志: ${condition}`);
      
      // 先统计要清除的日志数量
      const countQuery = `SELECT COUNT(*) as count FROM system_logs WHERE ${condition}`;
      const countResult = await query(countQuery, params);
      const logCount = parseInt(countResult.rows[0].count);
      
      // 执行清除
      const deleteQuery = `DELETE FROM system_logs WHERE ${condition}`;
      await query(deleteQuery, params);
      
      console.log(`✅ 成功清除 ${logCount} 条符合条件的日志`);
      
      return {
        success: true,
        message: `成功清除 ${logCount} 条日志`,
        condition: condition
      };
    } catch (error) {
      console.error('按条件清除日志失败:', error);
      throw new Error('按条件清除日志失败: ' + error.message);
    }
  }

  /**
   * 获取日志统计信息
   */
  async getLogStatistics() {
    try {
      const statsQuery = `
        SELECT 
          COUNT(*) as total_logs,
          COUNT(CASE WHEN level = 'ERROR' THEN 1 END) as error_count,
          COUNT(CASE WHEN level = 'WARN' THEN 1 END) as warn_count,
          COUNT(CASE WHEN level = 'INFO' THEN 1 END) as info_count,
          COUNT(CASE WHEN level = 'FATAL' THEN 1 END) as fatal_count,
          MAX(created_at) as latest_log_time,
          MIN(created_at) as earliest_log_time
        FROM system_logs
      `;
      
      const result = await query(statsQuery);
      return result.rows[0];
    } catch (error) {
      console.error('获取日志统计失败:', error);
      throw new Error('获取日志统计失败: ' + error.message);
    }
  }

  /**
   * 获取最近的日志
   */
  async getRecentLogs(limit = 50) {
    try {
      const logsQuery = `
        SELECT 
          log_id,
          session_id,
          user_id,
          level,
          message,
          error_code,
          retry_count,
          created_at
        FROM system_logs
        ORDER BY created_at DESC
        LIMIT $1
      `;
      
      const result = await query(logsQuery, [limit]);
      return result.rows;
    } catch (error) {
      console.error('获取最近日志失败:', error);
      throw new Error('获取最近日志失败: ' + error.message);
    }
  }

  /**
   * 按级别获取日志
   */
  async getLogsByLevel(level, limit = 50) {
    try {
      const logsQuery = `
        SELECT 
          log_id,
          session_id,
          user_id,
          level,
          message,
          error_code,
          retry_count,
          created_at
        FROM system_logs
        WHERE level = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await query(logsQuery, [level, limit]);
      return result.rows;
    } catch (error) {
      console.error('按级别获取日志失败:', error);
      throw new Error('按级别获取日志失败: ' + error.message);
    }
  }

  /**
   * 按会话ID获取日志
   */
  async getLogsBySession(session_id, limit = 50) {
    try {
      const logsQuery = `
        SELECT 
          log_id,
          session_id,
          user_id,
          level,
          message,
          error_code,
          retry_count,
          created_at
        FROM system_logs
        WHERE session_id = $1
        ORDER BY created_at DESC
        LIMIT $2
      `;
      
      const result = await query(logsQuery, [session_id, limit]);
      return result.rows;
    } catch (error) {
      console.error('按会话获取日志失败:', error);
      throw new Error('按会话获取日志失败: ' + error.message);
    }
  }

  /**
   * 清除指定时间之前的日志
   */
  async clearLogsBeforeDate(date) {
    try {
      const condition = 'created_at < $1';
      return await this.clearLogsByCondition(condition, [date]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 清除指定级别的日志
   */
  async clearLogsByLevel(level) {
    try {
      const condition = 'level = $1';
      return await this.clearLogsByCondition(condition, [level]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 清除指定会话的日志
   */
  async clearLogsBySession(session_id) {
    try {
      const condition = 'session_id = $1';
      return await this.clearLogsByCondition(condition, [session_id]);
    } catch (error) {
      throw error;
    }
  }

  /**
   * 获取错误日志摘要
   */
  async getErrorSummary() {
    try {
      const summaryQuery = `
        SELECT 
          error_code,
          COUNT(*) as error_count,
          MAX(created_at) as latest_error_time,
          STRING_AGG(DISTINCT message, '; ') as sample_messages
        FROM system_logs 
        WHERE level IN ('ERROR', 'FATAL')
        GROUP BY error_code
        ORDER BY error_count DESC
        LIMIT 20
      `;
      
      const result = await query(summaryQuery);
      return result.rows;
    } catch (error) {
      console.error('获取错误摘要失败:', error);
      throw new Error('获取错误摘要失败: ' + error.message);
    }
  }
}

module.exports = new LogManager();
