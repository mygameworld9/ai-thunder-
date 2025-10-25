#!/usr/bin/env node

/**
 * 简化的日志清除工具
 * 用于在数据库连接问题时进行基本的日志管理
 */

const fs = require('fs');
const path = require('path');

class SimpleLogClear {
  constructor() {
    this.logDir = path.join(__dirname, '../../logs');
    this.ensureLogDir();
  }

  /**
   * 确保日志目录存在
   */
  ensureLogDir() {
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
      console.log('📁 创建日志目录:', this.logDir);
    }
  }

  /**
   * 显示帮助信息
   */
  showHelp() {
    console.log(`
🎯 简化日志管理工具

用法:
  node src/scripts/simpleLogClear.js [command]

命令:
  help              显示此帮助信息
  clear-console       清除控制台输出缓存
  check-files         检查日志文件
  create-test-log     创建测试日志文件

说明:
  此工具用于在数据库连接问题时进行基本的日志管理。
  完整的日志管理功能需要数据库连接正常后使用。
    `);
  }

  /**
   * 检查日志文件
   */
  checkFiles() {
    console.log('📁 检查日志文件...');
    
    if (fs.existsSync(this.logDir)) {
      const files = fs.readdirSync(this.logDir);
      if (files.length === 0) {
        console.log('📭 暂无日志文件');
      } else {
        console.log(`📄 发现 ${files.length} 个文件:`);
        files.forEach(file => {
          const filePath = path.join(this.logDir, file);
          const stats = fs.statSync(filePath);
          console.log(`  - ${file} (${stats.size} bytes, ${stats.mtime.toLocaleString()})`);
        });
      }
    } else {
      console.log('📭 日志目录不存在');
    }
  }

  /**
   * 创建测试日志文件
   */
  createTestLog() {
    console.log('📝 创建测试日志文件...');
    
    const testLogPath = path.join(this.logDir, 'test_log.txt');
    const testContent = `测试日志 - ${new Date().toISOString()}
=====================================

这是一个测试日志文件，用于验证日志系统的基本功能。

时间戳: ${new Date().toLocaleString('zh-CN')}
状态: 正常
模块: 测试
消息: 日志系统初始化成功

数据库连接状态: 未连接
建议: 请检查 PostgreSQL 服务是否启动
    `;
    
    fs.writeFileSync(testLogPath, testContent);
    console.log(`✅ 测试日志已创建: ${testLogPath}`);
  }

  /**
   * 显示数据库连接建议
   */
  showConnectionAdvice() {
    console.log(`
🔧 数据库连接问题解决建议:

1. 检查 PostgreSQL 服务是否启动:
   - Windows: services.msc -> PostgreSQL
   - Linux: sudo systemctl status postgresql

2. 检查数据库配置:
   - 主机: localhost (默认)
   - 端口: 5432 (默认)
   - 数据库名: ai_interview
   - 用户名: postgres
   - 密码: 您设置的密码

3. 测试数据库连接:
   - 使用 pgAdmin 或 psql 工具
   - 连接字符串: postgresql://postgres:密码@localhost:5432/ai_interview

4. 如果使用 Docker:
   - docker run --name postgres -e POSTGRES_PASSWORD=yourpassword -p 5432:5432 -d postgres

5. 创建数据库:
   - CREATE DATABASE ai_interview;
   - CREATE USER postgres WITH PASSWORD 'yourpassword';
   - GRANT ALL PRIVILEGES ON DATABASE ai_interview TO postgres;
    `);
  }

  /**
   * 运行工具
   */
  run() {
    const args = process.argv.slice(2);
    const command = args[0];

    console.log('🎯 AI面试系统日志管理工具 (简化版)');
    console.log('=====================================\n');

    switch (command) {
      case 'check-files':
        this.checkFiles();
        break;
      case 'create-test-log':
        this.createTestLog();
        break;
      case 'help':
      default:
        this.showHelp();
        this.showConnectionAdvice();
        break;
    }
  }
}

// 运行工具
if (require.main === module) {
  const tool = new SimpleLogClear();
  tool.run();
}

module.exports = SimpleLogClear;
