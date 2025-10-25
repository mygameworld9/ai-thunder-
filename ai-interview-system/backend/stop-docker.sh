#!/bin/bash

echo "🛑 停止AI面试系统Docker环境..."

# 停止并删除容器
echo "🔄 停止所有服务..."
docker-compose down

# 清理网络
echo "🧹 清理Docker网络..."
docker network prune -f

echo ""
echo "✅ Docker环境已停止！"
echo ""
echo "💡 提示："
echo "  - 如需完全清理数据，运行：docker-compose down -v"
echo "  - 如需重新启动，运行：./start-docker.sh"
