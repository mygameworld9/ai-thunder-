#!/bin/bash

echo "🚀 启动AI面试系统Docker环境..."

# 检查Docker是否安装
if ! command -v docker &> /dev/null; then
    echo "❌ Docker未安装，请先安装Docker"
    exit 1
fi

# 检查Docker Compose是否安装
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose未安装，请先安装Docker Compose"
    exit 1
fi

# 启动Docker服务
echo "🔄 启动PostgreSQL、Redis和pgAdmin服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "🔍 检查服务状态..."

# 检查PostgreSQL
if docker-compose ps | grep -q "postgres.*Up"; then
    echo "✅ PostgreSQL 服务启动成功"
else
    echo "❌ PostgreSQL 服务启动失败"
fi

# 检查Redis
if docker-compose ps | grep -q "redis.*Up"; then
    echo "✅ Redis 服务启动成功"
else
    echo "❌ Redis 服务启动失败"
fi

# 检查pgAdmin
if docker-compose ps | grep -q "pgadmin.*Up"; then
    echo "✅ pgAdmin 服务启动成功"
else
    echo "❌ pgAdmin 服务启动失败"
fi

echo ""
echo "🎉 Docker环境启动完成！"
echo ""
echo "📊 服务信息："
echo "  - PostgreSQL: localhost:5432"
echo "  - Redis: localhost:6379"
echo "  - pgAdmin: http://localhost:8080 (admin@example.com / admin)"
echo ""
echo "🔧 接下来启动后端服务："
echo "  cd ai-interview-system/backend && node src/server.js"
echo ""
echo "🌐 然后启动前端服务："
echo "  cd ai-interview-system/frontend && npm run dev"
