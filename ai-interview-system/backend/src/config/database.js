const { Pool } = require('pg');
const dotenv = require('dotenv');

dotenv.config();

// 创建 PostgreSQL 连接池
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'ai_interview',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  max: 20, // 连接池最大连接数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// 测试数据库连接
async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL 数据库连接成功');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 数据库连接失败:', error.message);
    return false;
  }
}

// 执行查询的辅助函数
async function query(text, params) {
  const start = Date.now();
  try {
    const res = await pool.query(text, params);
    console.log('执行查询:', text, `耗时: ${Date.now() - start}ms`);
    return res;
  } catch (error) {
    console.error('查询错误:', error);
    throw error;
  }
}

// 关闭连接池
async function close() {
  await pool.end();
  console.log('数据库连接池已关闭');
}

module.exports = {
  pool,
  testConnection,
  query,
  close,
};
