const Redis = require('redis');
const dotenv = require('dotenv');

dotenv.config();

// 创建 Redis 客户端 - 使用新版本API
const redisClient = Redis.createClient({
  socket: {
    host: process.env.REDIS_HOST || 'localhost',
    port: process.env.REDIS_PORT || 6379,
  },
  password: process.env.REDIS_PASSWORD || undefined,
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
  // 如果Redis连接失败，记录错误但不阻止系统运行
  console.log('⚠️  Redis连接失败，系统将以无缓存模式运行');
});

redisClient.on('end', () => {
  console.log('Redis 客户端连接已结束');
});

// 如果Redis连接失败，使用内存缓存作为备选方案
let memoryCache = new Map();

// 简化的内存缓存实现
const memoryCacheOperations = {
  async set(key, value, ttl = 3600) {
    const expiry = Date.now() + (ttl * 1000);
    memoryCache.set(key, { value, expiry });
    return true;
  },

  async get(key) {
    const item = memoryCache.get(key);
    if (!item) return null;
    
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return null;
    }
    
    return item.value;
  },

  async del(key) {
    memoryCache.delete(key);
    return true;
  },

  async exists(key) {
    const item = memoryCache.get(key);
    if (!item) return false;
    
    if (Date.now() > item.expiry) {
      memoryCache.delete(key);
      return false;
    }
    
    return true;
  },

  async expire(key, ttl) {
    const item = memoryCache.get(key);
    if (item) {
      const expiry = Date.now() + (ttl * 1000);
      memoryCache.set(key, { value: item.value, expiry });
      return true;
    }
    return false;
  }
};

// 简化的公司缓存实现
const memoryCompanyCache = {
  async cacheCompanyInfo(companyName, data) {
    const key = `company:${companyName.toLowerCase()}`;
    return await memoryCacheOperations.set(key, data, 24 * 3600);
  },

  async getCompanyInfo(companyName) {
    const key = `company:${companyName.toLowerCase()}`;
    return await memoryCacheOperations.get(key);
  },

  async deleteCompanyInfo(companyName) {
    const key = `company:${companyName.toLowerCase()}`;
    return await memoryCacheOperations.del(key);
  }
};

// 简化的会话缓存实现
const memorySessionCache = {
  async cacheSessionState(sessionId, state) {
    const key = `session:${sessionId}`;
    return await memoryCacheOperations.set(key, state, 7200);
  },

  async getSessionState(sessionId) {
    const key = `session:${sessionId}`;
    return await memoryCacheOperations.get(key);
  },

  async deleteSession(sessionId) {
    const key = `session:${sessionId}`;
    return await memoryCacheOperations.del(key);
  }
};

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

// 动态选择缓存实现
async function getCacheImplementation() {
  try {
    await redisClient.connect();
    console.log('✅ 使用 Redis 缓存');
    return { companyCache, sessionCache };
  } catch (error) {
    console.log('⚠️  Redis 连接失败，使用内存缓存');
    return { companyCache: memoryCompanyCache, sessionCache: memorySessionCache };
  }
}

module.exports = {
  redisClient,
  testConnection,
  disconnect,
  redisOperations,
  companyCache,
  sessionCache,
  getCacheImplementation,
  // 暴露内存缓存实现用于测试
  memoryCompanyCache,
  memorySessionCache
};
