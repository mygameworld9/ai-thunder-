const Redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// 创建 Redis 客户端
const redisClient = Redis.createClient({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  password: process.env.REDIS_PASSWORD || undefined,
  retry_strategy: (options) => {
    if (options.error && options.error.code === 'ECONNREFUSED') {
      return new Error('Redis 服务器拒绝连接');
    }
    if (options.total_retry_time > 1000 * 60 * 60) {
      return new Error('Redis 重试时间已超过1小时');
    }
    if (options.attempt > 10) {
      return undefined;
    }
    // 指数退避重试
    return Math.min(options.attempt * 100, 3000);
  }
});

// 连接事件处理
redisClient.on('connect', () => {
  console.log('✅ Redis 客户端连接成功');
});

redisClient.on('ready', () => {
  console.log('✅ Redis 客户端准备就绪');
});

redisClient.on('error', (err) => {
  console.error('❌ Redis 客户端连接错误:', err.message);
});

redisClient.on('end', () => {
  console.log('Redis 客户端连接已结束');
});

// 测试 Redis 连接
async function testConnection() {
  try {
    await redisClient.connect();
    console.log('✅ Redis 连接测试成功');
    return true;
  } catch (error) {
    console.error('❌ Redis 连接测试失败:', error.message);
    return false;
  }
}

// 断开 Redis 连接
async function disconnect() {
  try {
    await redisClient.disconnect();
    console.log('Redis 连接已断开');
  } catch (error) {
    console.error('断开 Redis 连接时出错:', error);
  }
}

// Redis 操作封装
const redisOperations = {
  // 设置键值对
  async set(key, value, ttl = 3600) {
    try {
      await redisClient.setEx(key, ttl, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Redis SET 错误:', error);
      throw error;
    }
  },

  // 获取键值
  async get(key) {
    try {
      const result = await redisClient.get(key);
      return result ? JSON.parse(result) : null;
    } catch (error) {
      console.error('Redis GET 错误:', error);
      throw error;
    }
  },

  // 删除键
  async del(key) {
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL 错误:', error);
      throw error;
    }
  },

  // 检查键是否存在
  async exists(key) {
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS 错误:', error);
      throw error;
    }
  },

  // 设置过期时间
  async expire(key, ttl) {
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE 错误:', error);
      throw error;
    }
  },

  // 发布消息到频道
  async publish(channel, message) {
    try {
      await redisClient.publish(channel, JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Redis PUBLISH 错误:', error);
      throw error;
    }
  },

  // 订阅频道
  async subscribe(channel, callback) {
    try {
      redisClient.subscribe(channel, (message) => {
        try {
          callback(JSON.parse(message));
        } catch (parseError) {
          console.error('解析 Redis 消息失败:', parseError);
          callback(message);
        }
      });
      return true;
    } catch (error) {
      console.error('Redis SUBSCRIBE 错误:', error);
      throw error;
    }
  },

  // 获取所有键（用于调试）
  async keys(pattern = '*') {
    try {
      return await redisClient.keys(pattern);
    } catch (error) {
      console.error('Redis KEYS 错误:', error);
      throw error;
    }
  }
};

// 公司信息缓存相关操作
const companyCache = {
  // 缓存公司信息（24小时）
  async cacheCompanyInfo(companyName, data) {
    const key = `company:${companyName.toLowerCase()}`;
    return await redisOperations.set(key, data, 24 * 3600);
  },

  // 获取缓存的公司信息
  async getCompanyInfo(companyName) {
    const key = `company:${companyName.toLowerCase()}`;
    return await redisOperations.get(key);
  },

  // 删除公司信息缓存
  async deleteCompanyInfo(companyName) {
    const key = `company:${companyName.toLowerCase()}`;
    return await redisOperations.del(key);
  }
};

// 会话相关缓存操作
const sessionCache = {
  // 缓存会话状态
  async cacheSessionState(sessionId, state) {
    const key = `session:${sessionId}`;
    return await redisOperations.set(key, state, 7200); // 2小时
  },

  // 获取会话状态
  async getSessionState(sessionId) {
    const key = `session:${sessionId}`;
    return await redisOperations.get(key);
  },

  // 删除会话缓存
  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await redisOperations.del(key);
  }
};

module.exports = {
  redisClient,
  testConnection,
  disconnect,
  redisOperations,
  companyCache,
  sessionCache
};
