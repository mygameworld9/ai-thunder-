
这是一个使用 React 和 Node.js 实现 MVP Demo 的最快路径大纲。

我们将构建一个**单体架构**，其中 Node.js 服务器只提供一个核心 API 端点，React 前端负责所有视图和状态管理。

---

### 第一部分：后端 (Node.js + Express)

你的 Node.js 应用只有一个核心职责：接收聊天记录，添加一个“系统指令”，调用 LLM，然后返回结果。

**步骤 1：项目初始化**
1.  创建后端项目文件夹。
2.  初始化 Node.js 项目 (`npm init`)。
3.  安装依赖：`express`, `cors`, 以及 `openai` (或你选择的 LLM 客户端库)。

**步骤 2：硬编码 Prompt**
1.  在你的主服务器文件 (`server.js` 或 `index.js`) 顶部，创建两个常量字符串：
    * `SYSTEM_PROMPT_QUESTION`: (内容：“你是一个面试官，只提问...”)
    * `SYSTEM_PROMPT_FINAL_REPORT`: (内容：“你是一个面试教练，负责总结...”)

**步骤 3：创建核心 API 端点 (`POST /api/chat`)**
1.  使用 Express 创建一个 `POST` 路由。
2.  启用 `cors` 中间件，以便 React 前端可以调用它。
3.  此端点接收一个 JSON Body，其结构为：`{ "messages": [...] }` (一个包含所有聊天历史的消息数组)。

**步骤 4：实现 API 逻辑**
1.  在 `/api/chat` 端点内，获取传入的 `messages` 数组。
2.  **决策逻辑：** 检查 `messages` 数组中“assistant”角色的数量。
3.  **如果** “assistant” 消息数量 < 5 (我们的 MVP 目标)：
    * 选择 `SYSTEM_PROMPT_QUESTION` 作为系统指令。
4.  **否则** (如果已达到 5 个问题)：
    * 选择 `SYSTEM_PROMPT_FINAL_REPORT` 作为系统指令。
5.  **组装请求：** 创建一个新的消息数组，将你选择的“系统指令”作为第一条消息，后面跟上所有来自前端的 `messages`。
6.  **调用 LLM：** 使用 `openai` 库，`await` 调用 LLM API，传入组装好的新消息数组。
7.  **返回响应：** 从 LLM 的响应中提取 AI 的回复内容，并将其作为 JSON 返回给前端，格式为：`res.json({ "reply": "..." })`。

---

### 第二部分：前端 (React)

你的 React 应用负责收集初始输入、管理聊天状态，并调用后端 API。

**步骤 1：项目初始化**
1.  使用 Vite 或 Create React App 创建 React 项目。

**步骤 2：状态管理 (在 `App.js` 中)**
1.  使用 `useState` 创建三个核心状态：
    * `messages` (Array): 存储整个聊天记录。
    * `isLoading` (Boolean): 用于显示加载动画。
    * `isInterviewStarted` (Boolean): 用于切换视图。

**步骤 3：UI 布局**
1.  **条件渲染：**
    * **如果** `isInterviewStarted` 为 `false`：显示“面试准备”视图。
    * **如果** `isInterviewStarted` 为 `true`：显示“聊天窗口”视图。
2.  **“面试准备”视图：**
    * 包含一个**文件上传控件**（用于简历，支持图片、Markdown、PDF 格式）。
    * 包含一个 `<textarea>` (用于 JD)。
    * 包含一个“开始面试”按钮。
3.  **“聊天窗口”视图：**
    * 一个区域，用于 `map` 遍历 `messages` 状态并显示所有对话气泡。
    * 一个输入框，用于用户输入答案。
    * 一个 `isLoading` 状态绑定的加载指示器。

**步骤 4：核心逻辑 (API 调用函数)**
1.  创建一个 `async` 函数，例如 `handleSendMessage(currentMessages)`。
2.  此函数负责：
    * 设置 `isLoading(true)`。
    * 使用 `fetch` 向你的 Node.js 后端 `POST /api/chat` 发送请求，Body 为 `{ "messages": currentMessages }`。
    * `await` 响应，解析 JSON，获取 `reply` 字符串。
    * 创建一个新的 AI 消息对象：`{ "role": "assistant", "content": reply }`。
    * 更新 `messages` 状态：`setMessages([...currentMessages, newAIMessage])`。
    * 设置 `isLoading(false)`。

**步骤 5：连接事件**
1.  **“开始面试”按钮的 `onClick` 事件：**
    * **处理简历文件**:
        *   从文件上传控件获取 `File` 对象。
        *   根据文件类型进行处理：
            *   如果是图片，使用 `FileReader` 读取为 Base64 字符串。
            *   如果是 Markdown，使用 `FileReader` 读取为纯文本。
            *   如果是 PDF，提示用户当前版本不支持，建议上传图片。
    *   从 `<textarea>` 获取 JD 的文本。
    *   创建初始消息数组 `initialMessages`。**注意：** 如果是图片简历，此消息应为多模态格式，包含图片Base64数据和文本提示。
    *   设置 `setMessages(initialMessages)`。
    *   设置 `isInterviewStarted(true)`。
    *   **立即调用** `handleSendMessage(initialMessages)` (这将获取第一个问题)。
2.  **“聊天输入框”的 `onSubmit` (回车) 事件：**
    * 获取输入框中的用户答案。
    * 创建新的用户消息对象：`newUserMessage = { "role": "user", "content": "..." }`。
    * 创建包含此新消息的临时数组：`updatedMessages = [...messages, newUserMessage]`。
    * 设置 `setMessages(updatedMessages)`。
    * **立即调用** `handleSendMessage(updatedMessages)` (这将发送答案并获取下一个问题或报告)。
