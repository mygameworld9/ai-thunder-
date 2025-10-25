#!/usr/bin/env node

const { spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');

/**
 * 数据库设置脚本 - 支持多种部署方式
 */
class DatabaseSetup {
  constructor() {
    this.dbConfig = {
      host: 'localhost',
      port: 5432,
      database: 'ai_interview',
      user: 'postgres',
      password: 'PASSWORD'
    };
  }

  /**
   * 检查PostgreSQL是否可用
   */
  async checkPostgreSQL() {
    console.log('🔍 检查PostgreSQL服务状态...');
    
    return new Promise((resolve) => {
      const child = spawn('pg_isready', ['-h', this.dbConfig.host, '-p', this.dbConfig.port.toString()], {
        stdio: 'pipe'
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ PostgreSQL 服务正在运行');
          resolve(true);
        } else {
          console.log('❌ PostgreSQL 服务未运行或无法连接');
          resolve(false);
        }
      });
      
      child.on('error', () => {
        console.log('❌ 无法检查PostgreSQL服务状态');
        resolve(false);
      });
    });
  }

  /**
   * 创建数据库
   */
  async createDatabase() {
    console.log('🔧 创建数据库 ai_interview...');
    
    return new Promise((resolve) => {
      const child = spawn('psql', [
        '-h', this.dbConfig.host,
        '-p', this.dbConfig.port.toString(),
        '-U', this.dbConfig.user,
        '-c', `CREATE DATABASE ${this.dbConfig.database};`
      ], {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: this.dbConfig.password }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ 数据库创建成功');
          resolve(true);
        } else {
          if (stderr.includes('already exists')) {
            console.log('✅ 数据库已存在');
            resolve(true);
          } else {
            console.log('❌ 数据库创建失败:', stderr);
            resolve(false);
          }
        }
      });
      
      child.on('error', (err) => {
        console.log('❌ 创建数据库时出错:', err.message);
        resolve(false);
      });
    });
  }

  /**
   * 测试数据库连接
   */
  async testConnection() {
    console.log('🔍 测试数据库连接...');
    
    return new Promise((resolve) => {
      const child = spawn('psql', [
        '-h', this.dbConfig.host,
        '-p', this.dbConfig.port.toString(),
        '-U', this.dbConfig.user,
        '-d', this.dbConfig.database,
        '-c', 'SELECT version();'
      ], {
        stdio: 'pipe',
        env: { ...process.env, PGPASSWORD: this.dbConfig.password }
      });
      
      let stdout = '';
      let stderr = '';
      
      child.stdout.on('data', (data) => {
        stdout += data.toString();
      });
      
      child.stderr.on('data', (data) => {
        stderr += data.toString();
      });
      
      child.on('exit', (code) => {
        if (code === 0) {
          console.log('✅ 数据库连接测试成功');
          console.log('   PostgreSQL版本:', stdout.split('\n')[0].trim());
          resolve(true);
        } else {
          console.log('❌ 数据库连接测试失败:', stderr);
          resolve(false);
        }
      });
      
      child.on('error', (err) => {
        console.log('❌ 连接数据库时出错:', err.message);
        resolve(false);
      });
    });
  }

  /**
   * 生成离线部署说明
   */
  async generateOfflineInstructions() {
    console.log('\n📋 生成离线部署说明...');
    
    const instructions = `# AI面试系统数据库离线部署指南

## 方法1：使用本地PostgreSQL安装

### Windows安装步骤：
1. 下载PostgreSQL Windows安装包：
   https://www.postgresql.org/download/windows/

2. 安装PostgreSQL：
   - 运行安装程序
   - 记住设置的密码（建议使用：PASSWORD）
   - 确保启动PostgreSQL服务

3. 创建数据库：
   \`\`\`bash
   # 打开命令提示符
   psql -h localhost -p 5432 -U postgres -c "CREATE DATABASE ai_interview;"
   \`\`\`

4. 验证安装：
   \`\`\`bash
   psql -h localhost -p 5432 -U postgres -d ai_interview -c "SELECT version();"
   \`\`\`

### Linux安装步骤：
\`\`\`bash
# Ubuntu/Debian
sudo apt update
sudo apt install postgresql postgresql-contrib

# CentOS/RHEL
sudo yum install postgresql-server postgresql-contrib

# 启动服务
sudo systemctl start postgresql
sudo systemctl enable postgresql

# 创建数据库
sudo -u postgres psql -c "CREATE DATABASE ai_interview;"
\`\`\`

## 方法2：使用便携版PostgreSQL

1. 下载PostgreSQL便携版：
   https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

2. 解压到任意目录

3. 启动PostgreSQL：
   \`\`\`bash
   # 进入解压目录
   ./bin/pg_ctl -D ./data start
   \`\`\`

4. 创建数据库：
   \`\`\`bash
   ./bin/createdb -h localhost -p 5432 -U postgres ai_interview
   \`\`\`

## 方法3：修改应用配置

如果使用其他数据库服务，修改 .env 文件：

\`\`\`env
DB_HOST=your_database_host
DB_PORT=5432
DB_NAME=ai_interview
DB_USER=your_username
DB_PASSWORD=your_password
\`\`\`

## 验证步骤

1. 运行数据库连接测试：
   \`\`\`bash
   node test_db_connection.js
   \`\`\`

2. 运行数据库迁移：
   \`\`\`bash
   node src/migrations/migrate.js
   \`\`\`

3. 启动服务器：
   \`\`\`bash
   node src/server.js
   \`\`\`
`;

    try {
      await fs.writeFile(path.join(__dirname, 'OFFLINE_SETUP_GUIDE.md'), instructions);
      console.log('✅ 离线部署指南已生成：OFFLINE_SETUP_GUIDE.md');
      return true;
    } catch (error) {
      console.log('❌ 生成离线部署指南失败:', error.message);
      return false;
    }
  }

  /**
   * 运行完整设置流程
   */
  async runSetup() {
    console.log('🎯 AI面试系统数据库设置向导');
    console.log('================================\n');
    
    try {
      // 检查PostgreSQL服务
      const pgAvailable = await this.checkPostgreSQL();
      
      if (pgAvailable) {
        // 测试连接
        const connectionOk = await this.testConnection();
        
        if (connectionOk) {
          console.log('\n🎉 数据库连接正常！可以直接运行迁移和服务器。');
          console.log('\n下一步操作：');
          console.log('1. node src/migrations/migrate.js  # 运行数据库迁移');
          console.log('2. node src/server.js             # 启动服务器');
          return true;
        } else {
          // 尝试创建数据库
          const dbCreated = await this.createDatabase();
          if (dbCreated) {
            const connectionOk2 = await this.testConnection();
            if (connectionOk2) {
              console.log('\n🎉 数据库设置完成！可以运行迁移和服务器。');
              console.log('\n下一步操作：');
              console.log('1. node src/migrations/migrate.js  # 运行数据库迁移');
              console.log('2. node src/server.js             # 启动服务器');
              return true;
            }
          }
        }
      }
      
      // 如果自动设置失败，生成离线指南
      console.log('\n⚠️  自动设置失败，生成离线部署指南...');
      await this.generateOfflineInstructions();
      
      console.log('\n📋 请参考生成的离线部署指南进行手动设置。');
      console.log('文件位置：OFFLINE_SETUP_GUIDE.md');
      
      return false;
      
    } catch (error) {
      console.error('❌ 设置过程中出现错误:', error);
      await this.generateOfflineInstructions();
      return false;
    }
  }
}

// 运行设置
if (require.main === module) {
  const setup = new DatabaseSetup();
  setup.runSetup().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('设置脚本执行失败:', error);
    process.exit(1);
  });
}

module.exports = DatabaseSetup;
