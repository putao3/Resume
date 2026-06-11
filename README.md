# 简历对比优化智能体

基于 AI 的简历评估、优化与面试模拟工具。上传简历 + 岗位 JD，即可获得四维度专业评估、一键优化和定制化面试题。

## 功能模块

- **📊 简历评估** — 从岗位匹配度、项目经验、工作经验、个人简介四个维度打分（0-100），输出综合评语和逐条修改建议
- **✨ 一键优化** — AI 根据评估意见自动改写简历，提供修改前后双栏对比，支持逐条接受/拒绝修改
- **🎯 面试模拟** — 根据 JD 生成 8-12 道面试题，覆盖技术能力、项目经验、行为面试、综合素养，每题含考核要点和参考答案
- **📝 历史记录** — 所有评估、优化、面试结果自动保存到本地 IndexedDB，随时恢复查看（保留最近 5 条）
- **⚙️ Prompt 配置** — 四个模块的提示词完全可自定义
- **🔌 多 API 兼容** — 默认使用 DeepSeek，也支持 Anthropic Claude 和 OpenAI 兼容接口

## 技术栈

| 类别 | 技术 |
|------|------|
| 框架 | React 19 + TypeScript 6 |
| 构建 | Vite 8 |
| 样式 | Tailwind CSS 4 |
| 状态管理 | Zustand 5 |
| 本地存储 | Dexie.js 4 (IndexedDB) |
| AI API | DeepSeek / Anthropic / OpenAI 兼容 |
| 文件解析 | pdfjs-dist / mammoth.js / tesseract.js |

## 快速开始

### 环境要求

- [Node.js](https://nodejs.org/) >= 18
- npm >= 9（随 Node.js 一起安装）

### 本地运行

```bash
# 1. 在终端中进入项目目录
cd Resume_optimization

# 2. 安装依赖（仅首次运行需要）
npm install

# 3. 启动开发服务器（这一步必须执行！）
npm run dev
```

> ⚠️ **重要**：`npm run dev` 必须保持运行，**不要关闭终端**。关闭终端后服务器就停了，浏览器将无法访问。

启动后终端会显示：

```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

**保持终端运行**，然后在浏览器地址栏输入 **http://localhost:5173/** 即可访问。

> 💡 如果端口 5173 被占用，Vite 会自动使用下一个可用端口（如 5174），请以终端实际显示的地址为准。

### 预览生产版本

```bash
# 构建
npm run build

# 本地预览构建产物
npm run preview
```

`preview` 命令启动后同样在浏览器访问终端显示的地址（默认 http://localhost:4173/）。

## API 配置

启动后在侧边栏点击「API 配置」，填入：

| 字段 | 说明 | 示例 |
|------|------|------|
| Endpoint | API 地址（开发环境使用 Vite 代理路径） | `/api/deepseek/v1/chat/completions` |
| API Key | 服务商提供的密钥 | `sk-xxxxxxxx` |
| 模型 | 模型名称 | `deepseek-chat` |

### 支持的 API 提供商

本项目通过 endpoint 自动识别 API 格式：

- **DeepSeek**（默认） — 在配置中填入 DeepSeek API Key + 模型名 `deepseek-chat`
- **Anthropic Claude** — endpoint 中包含 `anthropic` 时自动切换为 Anthropic 原生格式
- **OpenAI / 硅基流动 / 通义千问等** — 均使用 OpenAI 兼容格式

> 开发环境下，Vite 开发服务器会自动代理 `/api/deepseek` 到 `api.deepseek.com`，`/api/anthropic` 到 `api.anthropic.com`，以绕过浏览器 CORS 限制。生产部署时需要自行配置反向代理（如 Nginx）。

## 支持的文件格式

| 格式 | 解析方式 |
|------|----------|
| PDF | pdfjs-dist（客户端解析） |
| DOCX | mammoth.js（客户端解析） |
| 图片 | tesseract.js（OCR） |
| 纯文本 / Markdown | 直接读取 |

## 项目结构

```
src/
├── components/       # UI 组件
│   ├── ResumeUpload.tsx    # 简历上传（拖拽/文件选择）
│   ├── JobInput.tsx        # 岗位 JD 输入（文本/URL/图片）
│   ├── EvaluationPanel.tsx # 评估结果面板（四维度评分）
│   ├── OptimizePanel.tsx   # 优化面板（双栏对比 + 建议列表）
│   ├── InterviewPanel.tsx  # 面试题面板（分类折叠）
│   ├── Sidebar.tsx         # 侧边栏（历史记录/配置入口）
│   ├── ConfigDialog.tsx    # API 配置弹窗
│   └── PromptConfigDialog.tsx # Prompt 配置弹窗
├── services/
│   ├── ai.ts          # AI API 调用（多格式兼容）
│   └── demo.ts        # Demo 数据
├── db/
│   └── db.ts          # IndexedDB 封装（Dexie.js）
├── store/
│   └── useAppStore.ts # Zustand 全局状态
├── types/
│   └── index.ts       # TypeScript 类型定义
├── lib/
│   └── utils.ts       # 工具函数
├── App.tsx            # 主布局（四步流程）
└── main.tsx           # 入口
```

## 数据存储

- **API 配置 / Prompt 配置** — 浏览器 localStorage
- **历史记录** — 浏览器 IndexedDB（`resume-optimizer` 数据库）
- 所有数据仅存储在用户本地浏览器，不上传至任何服务器

## License

MIT
