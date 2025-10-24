# AI 模拟面试系统

一个基于AI的智能模拟面试平台，帮助用户准备技术面试。

## 项目结构

```
ai-interview-system/
├── backend/           # 后端服务
│   ├── src/
│   │   ├── config/        # 配置文件
│   │   ├── controllers/   # 控制器
│   │   ├── middleware/    # 中间件
│   │   ├── models/        # 数据模型
│   │   ├── routes/        # 路由
│   │   ├── migrations/    # 数据库迁移
│   │   ├── services/      # 业务服务
│   │   └── utils/         # 工具函数
│   ├── package.json
│   └── .env.example
├── frontend/          # 前端应用
│   ├── src/
│   │   ├── components/    # React组件
│   │   ├── pages/         # 页面组件
│   │   ├── store/         # 状态管理
│   │   ├── services/      # 服务
│   │   ├── styles/        # 样式文件
│   │   └── utils/         # 工具函数
│   ├── package.json
│   ├── vite.config.js
│   └── index.html
└── README.md
```

## 技术栈

### 后端
- **Node.js + Fastify** - 高性能Web框架
- **PostgreSQL** - 关系型数据库
- **Redis** - 缓存和实时通信
- **Google Gemini / OpenAI / Ollama** - AI服务提供商

### 前端
- **React 18** - 用户界面框架
- **Vite** - 构建工具
- **Zustand** - 状态管理
- **Tailwind CSS** - 样式框架

## 功能特性

### 阶段0: 基础架构 ✅
- [x] 项目目录结构创建
- [x] 后端项目初始化 (Fastify + Node.js)
- [x] 前端项目初始化 (React + Vite)
- [x] 数据库配置 (PostgreSQL连接)
- [x] Redis配置 (缓存和SSE)
- [x] JWT身份认证中间件
- [x] 环境变量管理
- [x] 核心数据表迁移
- [x] Prompt模板初始化
- [x] 模块化路由结构

### 阶段1: 准备阶段
- [ ] 面试信息输入表单
- [ ] 文件上传处理 (.pdf, .md, .png, .jpg)
- [ ] 公司背景研究功能
- [ ] 会话创建和管理

### 阶段2: 配置阶段
- [ ] 角色确认和澄清
- [ ] AI服务提供商选择
- [ ] 面试参数设置

### 阶段3: 执行阶段
- [ ] 实时问答循环
- [ ] SSE异步通信
- [ ] 问题生成和追问逻辑

### 阶段4: 评估阶段
- [ ] 面试报告生成
- [ ] 详细反馈分析
- [ ] 可视化报告展示

## 快速开始

### 环境要求
- Node.js 18+
- PostgreSQL 12+
- Redis 6+

### 安装依赖

```bash
# 后端
cd backend
npm install

# 前端
cd frontend
npm install
```

### 配置环境变量

```bash
# 后端配置
cp .env.example .env
# 编辑 .env 文件，配置数据库和API密钥

# 前端配置
cp .env.example .env
# 编辑 .env 文件，配置API地址
```

### 数据库迁移

```bash
# 运行数据库迁移
cd backend
npm run migrate
```

### 启动服务

```bash
# 启动后端
cd backend
npm run dev

# 启动前端
cd frontend
npm run dev
```

## API文档

### 认证接口
- `POST /api/v1/auth/register` - 用户注册
- `POST /api/v1/auth/login` - 用户登录
- `GET /api/v1/auth/me` - 获取用户信息

### 面试接口
- `POST /api/v1/interview/start` - 开始面试
- `POST /api/v1/interview/configure` - 配置面试
- `POST /api/v1/interview/start_session` - 开始会话
- `POST /api/v1/interview/submit_answer` - 提交答案
- `GET /api/v1/interview/report` - 获取报告

## 开发指南

### 代码规范
- 使用ESLint进行代码检查
- 使用Prettier进行代码格式化
- 遵循React Hooks最佳实践

### 测试
- 使用Jest进行单元测试
- 使用React Testing Library进行组件测试

## 许可证

MIT License
