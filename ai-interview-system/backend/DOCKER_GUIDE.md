# Docker使用指南

## 🚀 快速开始

### 1. 启动Docker环境
```bash
cd ai-interview-system/backend
./start-docker.sh
```

### 2. 停止Docker环境
```bash
cd ai-interview-system/backend
./stop-docker.sh
```

## 📋 手动操作指南

### 启动服务
```bash
# 启动所有服务（后台运行）
docker-compose up -d

# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f
```

### 停止服务
```bash
# 停止所有服务
docker-compose down

# 停止并删除数据卷
docker-compose down -v
```

## 🌐 服务访问信息

| 服务 | 地址 | 端口 | 用户名/密码 |
|------|------|------|-------------|
| PostgreSQL | localhost | 5432 | postgres/PASSWORD |
| Redis | localhost | 6379 | 无密码 |
| pgAdmin | http://localhost:8080 | 80 | admin@example.com/admin |

## 🔧 环境变量配置

确保 `.env` 文件包含正确的连接信息：

```env
# 数据库配置
DB_HOST=localhost
DB_PORT=5432
DB_NAME=ai_interview
DB_USER=postgres
DB_PASSWORD=PASSWORD

# Redis配置
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## 🐛 常见问题

### 1. 端口被占用
```bash
# 查看占用端口的进程
lsof -i :5432  # PostgreSQL
lsof -i :6379  # Redis
lsof -i :8080  # pgAdmin

# 杀死进程
kill -9 <PID>
```

### 2. 服务启动失败
```bash
# 查看详细日志
docker-compose logs postgres
docker-compose logs redis
docker-compose logs pgadmin

# 重新构建并启动
docker-compose up -d --build
```

### 3. 数据清理
```bash
# 完全清理所有数据
docker-compose down -v
docker volume prune -f
docker network prune -f
```

## 📊 监控命令

```bash
# 实时查看所有服务日志
docker-compose logs -f

# 查看容器资源使用
docker stats

# 进入Redis容器
docker exec -it ai-interview-redis redis-cli

# 进入PostgreSQL容器
docker exec -it ai-interview-postgres psql -U postgres -d ai_interview
