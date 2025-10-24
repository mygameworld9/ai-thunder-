const fp = require('fastify-plugin');
const interviewController = require('../controllers/interviewController');

async function interviewRoutes(fastify, options) {
  // 阶段0: 开始面试
  fastify.post('/start', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.startInterview
  });

  // 阶段1: 配置面试
  fastify.post('/configure', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.configureInterview
  });

  // 阶段2: 开始会话
  fastify.post('/start_session', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.startSession
  });

  // 获取会话信息
  fastify.get('/session/:session_id', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.getSessionInfo
  });

  // 阶段3: 提交答案
  fastify.post('/submit_answer', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.submitAnswer
  });

  // 获取会话消息
  fastify.get('/:session_id/messages', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.getSessionMessages
  });

  // 阶段4: 获取报告
  fastify.get('/report', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.getReport
  });

  // 阶段3: 提交答案
  fastify.post('/submit_answer', {
    preHandler: [fastify.optionalAuth],
    handler: interviewController.submitAnswer
  });
}

module.exports = fp(interviewRoutes, {
  name: 'interview-routes'
});
