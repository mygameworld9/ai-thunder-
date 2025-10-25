const jwt = require('@fastify/jwt');

// JWT 认证中间件
async function authenticate(request, reply) {
  try {
    // 从请求头获取 JWT token
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (!token) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: '缺少认证令牌'
      });
    }

    // 验证 JWT token
    const decoded = await request.jwtVerify();
    request.user = decoded;
    
  } catch (error) {
    if (error.code === 'FST_JWT_EXPIRED') {
      return reply.status(401).send({
        error: 'TOKEN_EXPIRED',
        message: '认证令牌已过期'
      });
    }
    
    if (error.code === 'FST_JWT_INVALID') {
      return reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: '无效的认证令牌'
      });
    }
    
    request.log.error('JWT 认证错误:', error);
    return reply.status(401).send({
      error: 'AUTHENTICATION_ERROR',
      message: '认证失败'
    });
  }
}

// 可选认证中间件（不强制要求认证）
async function optionalAuth(request, reply) {
  try {
    const token = request.headers.authorization?.replace('Bearer ', '');
    
    if (token) {
      const decoded = await request.jwtVerify();
      request.user = decoded;
    }
  } catch (error) {
    // 可选认证失败时不返回错误，只是不设置用户信息
    request.user = null;
  }
}

// 管理员权限检查中间件
function requireAdmin() {
  return async function (request, reply) {
    if (!request.user) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: '需要管理员权限'
      });
    }
    
    if (!request.user.isAdmin) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: '权限不足'
      });
    }
  };
}

// 生成 JWT token
function generateToken(payload) {
  return jwt.sign(payload, {
    expiresIn: '24h'
  });
}

// 验证用户是否拥有特定权限
function requirePermission(permission) {
  return async function (request, reply) {
    if (!request.user) {
      return reply.status(401).send({
        error: 'UNAUTHORIZED',
        message: '需要认证'
      });
    }
    
    if (!request.user.permissions || !request.user.permissions.includes(permission)) {
      return reply.status(403).send({
        error: 'FORBIDDEN',
        message: `需要 '${permission}' 权限`
      });
    }
  };
}

module.exports = {
  authenticate,
  optionalAuth,
  requireAdmin,
  requirePermission,
  generateToken
};
