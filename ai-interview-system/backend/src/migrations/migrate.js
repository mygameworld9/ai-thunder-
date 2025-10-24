const { query } = require('../config/database');

// 创建所有核心表的 SQL 脚本
const createTablesSQL = `
-- 创建 Users 表
CREATE TABLE IF NOT EXISTS users (
  user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建 Resumes 表
CREATE TABLE IF NOT EXISTS resumes (
  resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  title VARCHAR(255) NOT NULL,
  content TEXT,
  file_url VARCHAR(500),
  mime_type VARCHAR(100),
  ocr_status VARCHAR(50) DEFAULT 'PENDING' CHECK (ocr_status IN ('PENDING', 'SUCCESS', 'FAILED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建 InterviewSessions 表
CREATE TABLE IF NOT EXISTS interview_sessions (
  session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(resume_id) ON DELETE CASCADE,
  job_description TEXT,
  company_context_summary TEXT,
  status VARCHAR(50) DEFAULT 'CONFIGURING' CHECK (status IN ('CONFIGURING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'TIMEOUT')),
  difficulty VARCHAR(50),
  provider VARCHAR(50) DEFAULT 'GOOGLE' CHECK (provider IN ('GOOGLE', 'OPENAI', 'OLLAMA')),
  model VARCHAR(100) DEFAULT 'gemini-2.5-flash',
  total_questions INTEGER DEFAULT 10,
  current_question_index INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建 InterviewMessages 表
CREATE TABLE IF NOT EXISTS interview_messages (
  message_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  role VARCHAR(10) NOT NULL CHECK (role IN ('AI', 'USER')),
  content TEXT NOT NULL,
  topic_tag VARCHAR(100),
  context_summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(session_id, sequence)
);

-- 创建 PromptTemplates 表
CREATE TABLE IF NOT EXISTS prompt_templates (
  prompt_template_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) UNIQUE NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  template_content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  metadata JSONB,
  context_window_limit INTEGER DEFAULT 4096,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建 SystemLogs 表
CREATE TABLE IF NOT EXISTS system_logs (
  log_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES interview_sessions(session_id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'FATAL')),
  message TEXT NOT NULL,
  error_code VARCHAR(100),
  retry_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);
CREATE INDEX IF NOT EXISTS idx_interview_messages_session_id ON interview_messages(session_id);
CREATE INDEX IF NOT EXISTS idx_interview_messages_created_at ON interview_messages(created_at);
CREATE INDEX IF NOT EXISTS idx_system_logs_session_id ON system_logs(session_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_user_id ON system_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_level ON system_logs(level);

-- 创建 updated_at 触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ language 'plpgsql';

-- 为 prompt_templates 表添加 updated_at 触发器
CREATE TRIGGER update_prompt_templates_updated_at
  BEFORE UPDATE ON prompt_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
`;

// 插入默认 Prompt 模板的 SQL 脚本
const insertPromptsSQL = `
-- 插入 P-CORP-SUMMARIZE 模板
INSERT INTO prompt_templates (name, version, template_content, metadata) 
VALUES (
  'P-CORP-SUMMARIZE',
  1,
  '你是一个高效的面试情境协调员 (Interview Context Coordinator)。你的任务是快速分析关于 "[Company Name]" 的搜索结果，并提取用于设置下游AI面试官角色的关键信息。你的输出必须是结构化的。

搜索结果:
[SEARCH_RESULTS]

请严格按照以下 JSON 格式，提取并总结该公司的情境信息：

{
  "company_name": "[Company Name]",
  "company_summary": "<这里生成一段 2-3 句话的总结，清晰描述其核心业务、市场定位和主要产品线>",
  "key_focus_areas": [
    "<从搜索结果中提取的业务关键词1>",
    "<业务关键词2>",
    "<业务关键词3>",
    "<其他相关核心技术或领域...>"
  ]
}',
  '{"model": "gemini-2.5-flash", "temperature": 0.7}'
)
ON CONFLICT (name) DO NOTHING;

-- 插入 P-CONTEXT-CLARIFY 模板
INSERT INTO prompt_templates (name, version, template_content, metadata) 
VALUES (
  'P-CONTEXT-CLARIFY',
  1,
  '你是一位资深的技术招聘负责人 (Tech Recruiting Lead)，拥有敏锐的洞察力。你的任务不是扮演面试官，而是分析和验证即将进行的面试情境。你必须找出输入信息中的歧义（Ambiguity）或缺失（Gap），并提出一个推论性的确认问题。

分析以下面试输入数据：
1. 目标岗位: [TARGET_POSITION]
2. 候选人简历: [RESUME_CONTENT]
3. 目标公司情境 (JSON): [COMPANY_CONTEXT_JSON]

你的任务:
1. 分析歧义：检查 [TARGET_POSITION] 是否存在多种行业解释，检查 [COMPANY_CONTEXT_JSON] 是否信息不足
2. 进行推导：结合 [RESUME_CONTENT] 和 [TARGET_POSITION] 或 [COMPANY_CONTEXT_JSON]
3. 生成确认：生成一段 2-3 句话的"情境确认"描述，明确提出你的推论，最后以一个确认问题结尾。

示例输出格式：
"我注意到您的目标岗位是 [量化研究员]，而您的简历重点在 [PyTorch 和深度学习]。为了确保面试的精准性，我推测您申请的是 [AI 模型的模型量化（Model Quantization）] 领域，而不是 [金融交易策略的量化（Financial Quant）] 领域。这是您期望的面试情境吗？"',
  '{"model": "gemini-2.5-flash", "temperature": 0.8}'
)
ON CONFLICT (name) DO NOTHING;

-- 插入 P-QUESTION-GENERATE 模板
INSERT INTO prompt_templates (name, version, template_content, metadata) 
VALUES (
  'P-QUESTION-GENERATE',
  1,
  '你是一位 [DIFFICULTY] 级别的资深面试官，正在 [COMPANY_SUMMARY] 进行一场 [TARGET_POSITION] 的面试。你的提问必须严格、专业、富有洞察力。

面试档案:
- 这是 [TOTAL_QUESTIONS] 个问题中的第 [CURRENT_N] 个
- 候选人资料: [RESUME_CONTENT]
- JD: [JOB_DESCRIPTION]
- 已确认的面试情境: [CONFIRMED_CONTEXT]
- 面试历史 (Q&A): [CHAT_HISTORY]

你的任务：(严格遵循以下决策树)

1. 分析上一轮回答:
审查最后一条答案 [LAST_ANSWER] (如果存在)。评估该答案是否：(a) 过于宽泛 (b) 回避了核心问题 (c) 缺乏技术深度或清晰的 STAR 结构？

2. 决策与行动:
(A) 如果 [LAST_ANSWER] 存在且符合 (a), (b), (c) 中任意一项：生成一个针对 [LAST_ANSWER] 的、更深入的追问
(B) 如果这是第一个问题 (N=1)，或者 [LAST_ANSWER] 回答质量达标：生成一个全新的面试问题

新问题约束:
- 主题绝不能与面试历史中的所有问题重复
- 必须严格结合 [CONFIRMED_CONTEXT]、[RESUME_CONTENT] 和 [JOB_DESCRIPTION] 进行设计
- 体现 [DIFFICULTY] 级别的专业性
- 只输出问题本身，不要有任何多余的寒暄',
  '{"model": "gemini-2.5-flash", "temperature": 0.9}'
)
ON CONFLICT (name) DO NOTHING;

-- 插入 P-FINAL-REPORT 模板
INSERT INTO prompt_templates (name, version, template_content, metadata) 
VALUES (
  'P-FINAL-REPORT',
  1,
  '你是一位顶级的职业规划导师和面试专家。你将对一场刚刚结束的模拟面试进行全面、深入、且富有建设性的评估。你的评估必须客观公正、数据驱动，并以严格的 JSON 格式输出。

面试档案 (Inputs):
- 岗位: [TARGET_POSITION]
- 公司情境: [COMPANY_SUMMARY]
- 难度: [DIFFICULTY]
- 简历: [RESUME_CONTENT]
- 岗位描述 (JD): [JOB_DESCRIPTION]

面试完整记录 (Q&A):
[CHAT_HISTORY]

你的任务 (严格遵循以下步骤)

1. 综合分析: 仔细审查上述所有输入，包括简历、JD、公司情境以及完整的 Q&A 记录。

2. 评分指南: 严格按照以下指南生成评分矩阵：
- skill_match: 基于 Q&A 中展示的技术能力与 [JOB_DESCRIPTION] 和 [RESUME_CONTENT] 的匹配程度
- company_fit: 评估候选人的回答与 [COMPANY_SUMMARY] 情境的关联性
- communication_clarity: 评估候选人表达的逻辑性、清晰度和专业性
- star_method_application: 仅评估行为面试问题的回答是否遵循了 STAR 结构

3. 生成报告: 严格按照以下 JSON 格式生成详细的面试反馈报告：

{
  "overall_score": <0-100 的总分>,
  "overall_summary": "<2-3 句话的总体评价>",
  "scoring_matrix": {
    "skill_match": <0-10 分>,
    "company_fit": <0-10 分>,
    "communication_clarity": <0-10 分>,
    "star_method_application": <0-10 分>
  },
  "per_question_analysis": [
    {
      "question": "[Question 1]",
      "answer": "[Answer 1]",
      "feedback_strengths": "<优点和亮点>",
      "feedback_improvements": "<具体改进建议>",
      "suggested_answer": "<更优回答示例>"
    }
  ],
  "final_recommendations": [
    "<最关键的 1-2 个改进建议>",
    "<其他关键建议>"
  ]
}',
  '{"model": "gemini-2.5-flash", "temperature": 0.7}'
)
ON CONFLICT (name) DO NOTHING;
`;

async function migrate() {
  try {
    console.log('开始数据库迁移...');
    
    // 创建表
    console.log('创建核心表...');
    await query(createTablesSQL);
    console.log('✅ 所有核心表创建成功');
    
    // 插入默认 Prompt 模板
    console.log('插入默认 Prompt 模板...');
    await query(insertPromptsSQL);
    console.log('✅ 默认 Prompt 模板插入成功');
    
    console.log('🎉 数据库迁移完成！');
    
  } catch (error) {
    console.error('❌ 数据库迁移失败:', error);
    throw error;
  }
}

// 如果直接运行此文件，则执行迁移
if (require.main === module) {
  migrate().then(() => {
    console.log('迁移完成，程序退出');
    process.exit(0);
  }).catch((error) => {
    console.error('迁移失败，程序退出');
    process.exit(1);
  });
}

module.exports = { migrate };
