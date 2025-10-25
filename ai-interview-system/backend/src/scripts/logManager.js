#!/usr/bin/env node

const LogManager = require('../utils/logManager');
const { testConnection } = require('../config/database');

/**
 * 日志管理CLI工具
 * 提供命令行接口来管理系统日志
 */
class LogCLIManager {
  constructor() {
    this.logManager = LogManager;
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🎯 AI面试系统日志管理工具

用法:
  node src/scripts/logManager.js [command] [options]

命令:
  stats              显示日志统计信息
  recent [limit]     显示最近的日志 (默认50条)
  errors [limit]     显示错误日志 (默认50条)
  clear-all          清除所有日志
  clear-errors       清除所有错误日志
  clear-warns        清除警告日志
  clear-before <date> 清除指定日期之前的日志
  error-summary      显示错误摘要
  help               显示此帮助信息

示例:
  node src/scripts/logManager.js stats
  node src/scripts/logManager.js recent 100
  node src/scripts/logManager.js clear-all
  node src/scripts/logManager.js clear-before "2024-01-01"
    `);
  }

  /**
   * 显示日志统计
   */
  async showStats() {
    try {
      console.log('📊 获取日志统计信息...');
      const stats = await this.logManager.getLogStatistics();
      
      console.log('\n📈 日志统计:');
      console.log(`  总日志数: ${stats.total_logs}`);
      console.log(`  错误日志: ${stats.error_count}`);
      console.log(`  警告日志: ${stats.warn_count}`);
      console.log(`  信息日志: ${stats.info_count}`);
      console.log(`  致命错误: ${stats.fatal_count}`);
      console.log(`  最新日志: ${stats.latest_log_time}`);
      console.log(`  最早日志: ${stats.earliest_log_time}`);
      
    } catch (error) {
      console.error('❌ 获取统计失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 显示最近日志
   */
  async showRecent(limit = 50) {
    try {
      console.log(`📋 获取最近 ${limit} 条日志...`);
      const logs = await this.logManager.getRecentLogs(limit);
      
      if (logs.length === 0) {
        console.log('📭 暂无日志记录');
        return;
      }
      
      console.log(`\n📰 最近 ${logs.length} 条日志:`);
      logs.forEach((log, index) => {
        const time = new Date(log.created_at).toLocaleString('zh-CN');
        console.log(`\n${index + 1}. [${log.level}] ${time}`);
        console.log(`   会话ID: ${log.session_id || 'N/A'}`);
        console.log(`   用户ID: ${log.user_id || 'N/A'}`);
        console.log(`   消息: ${log.message}`);
        if (log.error_code) {
          console.log(`   错误码: ${log.error_code}`);
        }
        console.log(`   重试次数: ${log.retry_count}`);
      });
      
    } catch (error) {
      console.error('❌ 获取日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 显示错误日志
   */
  async showErrors(limit = 50) {
    try {
      console.log(`🚨 获取最近 ${limit} 条错误日志...`);
      const logs = await this.logManager.getLogsByLevel('ERROR', limit);
      
      if (logs.length === 0) {
        console.log('✅ 暂无错误日志');
        return;
      }
      
      console.log(`\n🚨 最近 ${logs.length} 条错误日志:`);
      logs.forEach((log, index) => {
        const time = new Date(log.created_at).toLocaleString('zh-CN');
        console.log(`\n${index + 1}. ${time}`);
        console.log(`   会话ID: ${log.session_id || 'N/A'}`);
        console.log(`   错误码: ${log.error_code || 'N/A'}`);
        console.log(`   消息: ${log.message}`);
        console.log(`   重试次数: ${log.retry_count}`);
      });
      
    } catch (error) {
      console.error('❌ 获取错误日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 显示错误摘要
   */
  async showErrorSummary() {
    try {
      console.log('📋 生成错误摘要...');
      const summary = await this.logManager.getErrorSummary();
      
      if (summary.length === 0) {
        console.log('✅ 暂无错误记录');
        return;
      }
      
      console.log('\n📊 错误摘要:');
      summary.forEach((item, index) => {
        console.log(`\n${index + 1}. 错误码: ${item.error_code || 'N/A'}`);
        console.log(`   错误次数: ${item.error_count}`);
        console.log(`   最新时间: ${new Date(item.latest_error_time).toLocaleString('zh-CN')}`);
        console.log(`   示例消息: ${item.sample_messages.substring(0, 100)}...`);
      });
      
    } catch (error) {
      console.error('❌ 生成错误摘要失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 清除所有日志
   */
  async clearAll() {
    try {
      const confirm = require('readline-sync').question('⚠️  确定要清除所有日志吗？(y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 取消操作');
        return;
      }
      
      const result = await this.logManager.clearAllLogs();
      console.log(`✅ ${result.message}`);
      
    } catch (error) {
      console.error('❌ 清除日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 清除错误日志
   */
  async clearErrors() {
    try {
      const confirm = require('readline-sync').question('⚠️  确定要清除所有错误日志吗？(y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 取消操作');
        return;
      }
      
      const result = await this.logManager.clearLogsByLevel('ERROR');
      console.log(`✅ ${result.message}`);
      
    } catch (error) {
      console.error('❌ 清除错误日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 清除警告日志
   */
  async clearWarns() {
    try {
      const confirm = require('readline-sync').question('⚠️  确定要清除所有警告日志吗？(y/N): ');
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 取消操作');
        return;
      }
      
      const result = await this.logManager.clearLogsByLevel('WARN');
      console.log(`✅ ${result.message}`);
      
    } catch (error) {
      console.error('❌ 清除警告日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 清除指定日期之前的日志
   */
  async clearBeforeDate(dateStr) {
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) {
        console.error('❌ 日期格式无效，请使用 YYYY-MM-DD 格式');
        process.exit(1);
      }
      
      const confirm = require('readline-sync').question(`⚠️  确定要清除 ${dateStr} 之前的日志吗？(y/N): `);
      if (confirm.toLowerCase() !== 'y') {
        console.log('❌ 取消操作');
        return;
      }
      
      const result = await this.logManager.clearLogsBeforeDate(date);
      console.log(`✅ ${result.message}`);
      
    } catch (error) {
      console.error('❌ 清除日志失败:', error.message);
      process.exit(1);
    }
  }

  /**
   * 运行CLI
   */
  async run() {
    // 检查数据库连接
    console.log('🔍 检查数据库连接...');
    const isConnected = await testConnection();
    if (!isConnected) {
      console.error('❌ 数据库连接失败，请检查配置');
      process.exit(1);
    }
    console.log('✅ 数据库连接正常\n');

    const args = process.argv.slice(2);
    const command = args[0];

    switch (command) {
      case 'stats':
        await this.showStats();
        break;
      case 'recent':
        await this.showRecent(parseInt(args[1]) || 50);
        break;
      case 'errors':
        await this.showErrors(parseInt(args[1]) || 50);
        break;
      case 'clear-all':
        await this.clearAll();
        break;
      case 'clear-errors':
        await this.clearErrors();
        break;
      case 'clear-warns':
        await this.clearWarns();
        break;
      case 'clear-before':
        if (!args[1]) {
          console.error('❌ 请提供日期参数');
          process.exit(1);
        }
        await this.clearBeforeDate(args[1]);
        break;
      case 'error-summary':
        await this.showErrorSummary();
        break;
      case 'help':
      default:
        this.showHelp();
        break;
    }
  }
}

// 运行CLI工具
if (require.main === module) {
  const cli = new LogCLIManager();
  cli.run().catch(error => {
    console.error('❌ 程序执行失败:', error);
    process.exit(1);
  });
}

module.exports = LogCLIManager;
