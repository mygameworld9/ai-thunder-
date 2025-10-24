const fp = require('fastify-plugin');

async function interviewRoutes(fastify, options) {
  // 阶段0: 开始面试
  fastify.post('/start', async (request, reply) => {
    // TODO: 实现面试开始逻辑
    return { message: '开始面试功能待实现' };
  });

  // 阶段1: 配置面试
  fastify.post('/configure', async (request, reply) => {
    // TODO: 实现面试配置逻辑
    return { message: '配置面试功能待实现' };
  });

  // 阶段2: 开始会话
  fastify.post('/start_session', async (request, reply) => {
    // TODO: 实现开始会话逻辑
    return { message: '开始会话功能待实现' };
  });

  // 阶段3: 提交答案
  fastify.post('/submit_answer', async (request, reply) => {
    // TODO: 实现提交答案逻辑
    return { message: '提交答案功能待实现' };
  });

  // 阶段4: 获取报告
  fastify.get('/report', async (request, reply) => {
    // TODO: 实现获取报告逻辑
    return { message: '获取报告功能待实现' };
  });

  // SSE 实时通信端点
  fastify.get('/sse', async (request, reply) => {
    // TODO: 实现 SSE 逻辑
    return { message: 'SSE 功能待实现' };
  });
}

module.exports = fp(interviewRoutes, {
  name: 'interview-routes'
});
