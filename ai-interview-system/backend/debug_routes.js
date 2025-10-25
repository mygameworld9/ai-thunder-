#!/usr/bin/env node

const fastify = require('fastify')({ logger: true });
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

async function debugRoutes() {
  try {
    console.log('🔍 调试路由注册...');
    
    // 注册插件
    await fastify.register(require('./src/routes'));
    
    // 获取所有路由
    const routes = fastify.printRoutes();
    console.log('\n📋 注册的路由:');
    console.log(routes);
    
    // 检查特定路由
    const authRoutes = [
      'POST:/api/v1/auth/register',
      'POST:/api/v1/auth/login',
      'GET:/health'
    ];
    
    console.log('\n🔍 检查特定路由:');
    for (const route of authRoutes) {
      const exists = routes.includes(route);
      console.log(`${route}: ${exists ? '✅ 存在' : '❌ 不存在'}`);
    }
    
  } catch (error) {
    console.error('❌ 路由调试失败:', error);
  }
}

// 运行调试
debugRoutes();
