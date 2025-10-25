const fp = require('fastify-plugin');

async function routes(fastify, options) {
  // 健康检查路由
  fastify.get('/health', async (request, reply) => {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  });

  // 测试数据库连接
  fastify.get('/test/db', async (request, reply) => {
    const { testConnection } = require('../config/database');
    const isConnected = await testConnection();
    return {
      database: isConnected ? 'connected' : 'disconnected'
    };
  });

  // 测试 Redis 连接
  fastify.get('/test/redis', async (request, reply) => {
    const { testConnection } = require('../config/redis');
    const isConnected = await testConnection();
    return {
      redis: isConnected ? 'connected' : 'disconnected'
    };
  });

  // 迁移数据库
  fastify.post('/migrate', async (request, reply) => {
    const { migrate } = require('../migrations/migrate');
    try {
      await migrate();
      return {
        success: true,
        message: '数据库迁移成功'
      };
    } catch (error) {
      fastify.log.error('数据库迁移失败:', error);
      return {
        success: false,
        message: '数据库迁移失败',
        error: error.message
      };
    }
  });

  // 用户认证路由
  await fastify.register(require('./auth'), { prefix: '/api/v1/auth' });
  
  // 面试相关路由
  await fastify.register(require('./interview'), { prefix: '/api/v1/interview' });
  
  // 用户管理路由
  await fastify.register(require('./user'), { prefix: '/api/v1/user' });
  
  // 管理员路由
  await fastify.register(require('./admin'), { prefix: '/api/v1/admin' });
}

module.exports = fp(routes, {
  name: 'routes'
});
