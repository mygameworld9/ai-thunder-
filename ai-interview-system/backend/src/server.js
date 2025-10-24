const fastify = require('fastify')({ logger: true });
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

// 注册插件
async function registerPlugins() {
  try {
    await fastify.register(require('@fastify/cors'), {
      origin: process.env.FRONTEND_URL || 'http://localhost:3000',
      credentials: true
    });

    await fastify.register(require('@fastify/jwt'), {
      secret: process.env.JWT_SECRET || 'ai-interview-secret-key'
    });

    await fastify.register(require('@fastify/multipart'), {
      limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
        files: 1
      }
    });

    // 注册路由
    await fastify.register(require('./routes'));
    
    // 注册认证中间件
    fastify.decorate('authenticate', require('./middleware/auth').authenticate);
    fastify.decorate('requireAdmin', require('./middleware/auth').requireAdmin);
    
    console.log('所有插件注册成功');
  } catch (error) {
    console.error('插件注册失败:', error);
    process.exit(1);
  }
}

// 启动服务器
async function startServer() {
  try {
    await registerPlugins();
    
    const port = process.env.PORT || 3002;
    await fastify.listen({ port, host: '0.0.0.0' });
    console.log(`服务器启动成功，端口: ${port}`);
  } catch (error) {
    console.error('服务器启动失败:', error);
    process.exit(1);
  }
}

// 处理关闭信号
process.on('SIGINT', async () => {
  console.log('正在关闭服务器...');
  await fastify.close();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('正在关闭服务器...');
  await fastify.close();
  process.exit(0);
});

// 启动服务器
startServer();
