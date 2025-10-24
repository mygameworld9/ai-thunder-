const fp = require('fastify-plugin');

async function authRoutes(fastify, options) {
  // 用户注册
  fastify.post('/register', async (request, reply) => {
    // TODO: 实现用户注册逻辑
    return { message: '注册功能待实现' };
  });

  // 用户登录
  fastify.post('/login', async (request, reply) => {
    // TODO: 实现用户登录逻辑
    return { message: '登录功能待实现' };
  });

  // 刷新 token
  fastify.post('/refresh', async (request, reply) => {
    // TODO: 实现 token 刷新逻辑
    return { message: '刷新 token 功能待实现' };
  });

  // 获取当前用户信息
  fastify.get('/me', { 
    preHandler: fastify.authenticate 
  }, async (request, reply) => {
    // TODO: 返回当前用户信息
    return { message: '获取用户信息功能待实现' };
  });
}

module.exports = fp(authRoutes, {
  name: 'auth-routes'
});
