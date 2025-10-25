#!/bin/bash

# AI面试系统启动脚本 (包含Redis)

echo "🚀 启动AI面试系统..."

# 检查Redis容器是否已存在
if docker ps -a --format "table {{.Names}}" | grep -q "redis-test"; then
    echo "✅ Redis容器(redis-test)已存在"
else
    echo "🔄 创建Redis容器..."
    docker run -itd --name redis-test -p 6379:6379 redis
fi

# 检查Redis是否运行
if docker ps --format "table {{.Names}}" | grep -q "redis-test"; then
    echo "✅ Redis容器正在运行"
else
    echo "🔄 启动Redis容器..."
    docker start redis-test
fi

# 等待Redis启动
echo "⏳ 等待Redis启动..."
sleep 3

# 检查Redis连接
if docker exec redis-test redis-cli ping > /dev/null 2>&1; then
    echo "✅ Redis连接正常"
else
    echo "❌ Redis连接失败"
    exit 1
fi

# 启动Docker Compose服务
echo "🔄 启动Docker Compose服务..."
docker-compose up -d

# 等待服务启动
echo "⏳ 等待服务启动..."
sleep 10

# 检查服务状态
echo "📋 服务状态检查:"
docker-compose ps

echo ""
echo "🎉 AI面试系统启动完成！"
echo "📊 访问信息:"
echo "   - 后端API: http://localhost:3002"
echo "   - pgAdmin: http://localhost:8080 (可选)"
echo "   - Redis: redis-test容器 (端口6379)"
echo ""
echo "🔧 停止服务: docker-compose down"
echo "🗑️ 清理所有容器: docker-compose down -v"
