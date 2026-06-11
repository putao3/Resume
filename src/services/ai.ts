import type { EvaluationResult, ApiConfig, InterviewResult, PromptConfig } from "../types";

// ====== 默认提示词（可被用户配置覆盖） ======

export const DEFAULT_SYSTEM_PROMPT = `你是一位专业的职业发展顾问，擅长简历评估、简历优化和面试辅导。`;

export const DEFAULT_EVALUATION_PROMPT = `你是一位拥有10年经验的资深职业规划师和HR总监。请根据以下岗位JD，对候选人的简历进行专业评估。

请从以下四个维度打分（0-100分），并对每个维度给出具体不足和修改建议：

1. **岗位匹配度**：简历与JD的整体匹配程度
2. **项目经验**：项目描述的深度、成果量化、与JD的相关性
3. **工作经验**：工作经历的年限、晋升路径、职责描述的完整度
4. **个人简介**：自我评价的亮点突出、语言表达、专业度

请同时给出：综合评语、整体评分（四维度平均分取整）、以及逐条具体修改建议。

请严格按照以下JSON格式返回，不要有其他内容：

{
  "dimensions": [
    {
      "name": "岗位匹配度",
      "score": 85,
      "comment": "具体评价...",
      "suggestions": ["建议1", "建议2"]
    }
  ],
  "overallComment": "综合评语...",
  "overallScore": 82,
  "suggestions": [
    {
      "id": "1",
      "category": "项目经验",
      "original": "原文片段...",
      "revised": "修改后...",
      "reason": "修改原因",
      "accepted": true
    }
  ]
}`;

export const DEFAULT_OPTIMIZE_PROMPT = `你是一位专业的简历优化师。请根据以下岗位JD和评估建议，对简历进行优化修改。

要求：
1. 保持所有事实信息不变（公司名、职位名、时间等）
2. 优化语言表达，使用更专业的动词和成果量化
3. 根据JD需求调整技能和经验的呈现重点
4. 保持简洁有力，不添加虚假信息

请严格按照以下JSON格式返回，不要有其他内容：

{
  "optimizedResume": "优化后的完整简历全文...",
  "suggestions": [
    {
      "id": "1",
      "category": "项目经验",
      "original": "原文片段...",
      "revised": "修改后的文本...",
      "reason": "修改原因",
      "accepted": true
    }
  ]
}`;

export const DEFAULT_INTERVIEW_PROMPT = `你是一位拥有10年经验的资深面试官和HR总监。请根据以下岗位JD，为候选人准备一套完整的面试题。

请从以下类别出题（每类2-3题，共8-12题）：

1. **技术能力**：考察岗位所需的硬技能和专业知识
2. **项目经验**：深挖项目细节、决策过程、问题解决能力
3. **行为面试**：团队协作、冲突处理、领导力等软技能
4. **综合素养**：职业规划、学习能力、抗压能力等

每道题需包含：
- 题目本身
- 考核要点（面试官想通过这道题了解什么）
- 参考答案要点（理想的回答方向，不是标准答案）

请严格按照以下JSON格式返回，不要有其他内容：

{
  "questions": [
    {
      "id": "1",
      "category": "技术能力",
      "question": "题目...",
      "keyPoints": ["考核点1", "考核点2"],
      "modelAnswer": "参考答案要点..."
    }
  ]
}`;

// ====== 工具函数 ======

/** 合并系统提示词和具体任务提示词 */
function mergeSystemPrompt(promptConfig: PromptConfig | undefined, specificPrompt: string): string {
  if (!promptConfig || !promptConfig.systemPrompt.trim()) return specificPrompt;
  return `${promptConfig.systemPrompt}\n\n---\n\n${specificPrompt}`;
}

/**
 * 根据 endpoint URL 自动检测 API 类型。
 * DeepSeek、OpenAI 及大多数国产模型使用 OpenAI 兼容格式；
 * Anthropic 使用自有格式。
 */
function detectApiType(endpoint: string): "anthropic" | "openai" {
  const lower = endpoint.toLowerCase();
  if (lower.includes("anthropic") || lower.includes("claude")) {
    return "anthropic";
  }
  // 默认当作 OpenAI 兼容格式（DeepSeek / OpenAI / 硅基流动 / 通义千问 等）
  return "openai";
}

/**
 * 统一 AI API 调用入口。
 * 根据 endpoint 自动选择 Anthropic 或 OpenAI 兼容格式。
 */
async function callAI(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiType = detectApiType(config.endpoint);

  if (import.meta.env.DEV) {
    console.log(
      `[API] → ${config.endpoint} | type=${apiType} | model=${config.model} | key=${config.apiKey ? config.apiKey.slice(0, 8) + "..." : "(empty)"}`
    );
  }

  if (apiType === "anthropic") {
    return callAnthropicAPI(config, systemPrompt, userMessage);
  }
  return callOpenAICompatibleAPI(config, systemPrompt, userMessage);
}

// ====== Anthropic 原生格式 ======

async function callAnthropicAPI(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "x-api-key": config.apiKey,
    "anthropic-version": "2023-06-01",
  };

  const body = {
    model: config.model,
    max_tokens: 8192,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const resp = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "Unknown error");
      if (resp.status === 401) throw new Error("API Key 无效，请在 API 配置中检查");
      if (resp.status === 429) throw new Error("API 请求频率过高，请稍后重试");
      if (resp.status >= 500) throw new Error(`API 服务器错误 (${resp.status})，请稍后重试`);
      throw new Error(`API 请求失败 (${resp.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await resp.json();

    if (data.stop_reason === "max_tokens") {
      console.warn("AI 响应因 token 限制被截断");
    }

    const text = data.content?.[0]?.text;
    if (!text || !text.trim()) {
      throw new Error("AI 返回了空内容，请重试");
    }
    return text;
  } catch (e: any) {
    if (e.name === "AbortError") {
      throw new Error("API 请求超时（120秒），请检查网络或稍后重试");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ====== OpenAI 兼容格式（DeepSeek / OpenAI / 硅基流动 / 通义千问 等） ======

async function callOpenAICompatibleAPI(
  config: ApiConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${config.apiKey}`,
  };

  const body = {
    model: config.model,
    max_tokens: 8192,
    temperature: 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
  };

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 120_000);

  try {
    const resp = await fetch(config.endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    if (!resp.ok) {
      const errBody = await resp.text().catch(() => "Unknown error");
      if (resp.status === 401) {
        throw new Error("API Key 无效，请在 API 配置中检查");
      }
      if (resp.status === 429) {
        throw new Error("API 请求频率过高，请稍后重试");
      }
      if (resp.status >= 500) {
        throw new Error(`API 服务器错误 (${resp.status})，请稍后重试`);
      }
      // 404 常见于 endpoint 路径写错
      if (resp.status === 404) {
        throw new Error(`API 端点不存在 (404)，请检查 Endpoint 配置是否正确。\n当前: ${config.endpoint}\n响应: ${errBody.slice(0, 300)}`);
      }
      throw new Error(`API 请求失败 (${resp.status}): ${errBody.slice(0, 200)}`);
    }

    const data = await resp.json();

    // 检查 finish_reason
    if (data.choices?.[0]?.finish_reason === "length") {
      console.warn("AI 响应因 token 限制被截断");
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text || !text.trim()) {
      throw new Error("AI 返回了空内容，请重试");
    }
    return text;
  } catch (e: any) {
    if (e.name === "AbortError") {
      throw new Error("API 请求超时（120秒），请检查网络或稍后重试");
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 从 AI 原始响应中提取 JSON 字符串。
 * 支持：
 * 1. Markdown ```json ... ``` 代码块
 * 2. 直接的大括号 JSON
 * 3. 夹带少量解释文本的 JSON
 */
function extractJson(text: string): string {
  // 1) 尝试匹配 markdown 代码块
  const codeBlockMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch) {
    const inner = codeBlockMatch[1].trim();
    // 内部再次尝试定位大括号
    const innerBraceStart = inner.indexOf("{");
    const innerBraceEnd = inner.lastIndexOf("}");
    if (innerBraceStart !== -1 && innerBraceEnd > innerBraceStart) {
      return inner.slice(innerBraceStart, innerBraceEnd + 1);
    }
  }

  // 2) 定位最外层大括号
  const braceStart = text.indexOf("{");
  const braceEnd = text.lastIndexOf("}");
  if (braceStart !== -1 && braceEnd > braceStart) {
    return text.slice(braceStart, braceEnd + 1);
  }

  // 3) fallback: 返回原始文本
  return text.trim();
}

/**
 * 安全 JSON 解析，带详细错误信息
 */
function safeJsonParse<T>(raw: string, label: string): T {
  let json: string;
  try {
    json = extractJson(raw);
  } catch {
    throw new Error(`${label}: 无法从响应中提取 JSON`);
  }

  if (!json) {
    throw new Error(`${label}: AI 返回内容为空`);
  }

  try {
    return JSON.parse(json) as T;
  } catch (e: any) {
    // 截取 JSON 前后各 300 字符方便排查
    const preview = json.length > 600
      ? json.slice(0, 300) + "\n...\n" + json.slice(-300)
      : json;
    throw new Error(`${label}: JSON 解析失败 — ${e.message}\n原始内容预览:\n${preview}`);
  }
}

// ====== 对外 API ======

export async function evaluateResume(
  config: ApiConfig,
  promptConfig: PromptConfig | undefined,
  resumeText: string,
  jobDescription: string
): Promise<EvaluationResult> {
  const taskPrompt = promptConfig?.evaluationPrompt?.trim() || DEFAULT_EVALUATION_PROMPT;
  const systemPrompt = mergeSystemPrompt(promptConfig, taskPrompt);
  const userMessage = `【岗位JD】\n${jobDescription}\n\n【简历内容】\n${resumeText}`;

  const raw = await callAI(config, systemPrompt, userMessage);
  const result = safeJsonParse<EvaluationResult>(raw, "简历评估");

  // 若 AI 未返回 overallScore，从维度计算
  const computedScore = result.dimensions?.length
    ? Math.round(result.dimensions.reduce((sum, d) => sum + d.score, 0) / result.dimensions.length)
    : 0;

  return {
    ...result,
    overallScore: result.overallScore || computedScore,
    suggestions: (result.suggestions || []).map((s: any, i: number) => ({
      ...s,
      id: s.id || String(i + 1),
      accepted: s.accepted ?? true,
    })),
  };
}

export async function optimizeResume(
  config: ApiConfig,
  promptConfig: PromptConfig | undefined,
  resumeText: string,
  jobDescription: string,
  evaluationText: string
): Promise<{ optimizedResume: string; suggestions: any[] }> {
  const taskPrompt = promptConfig?.optimizePrompt?.trim() || DEFAULT_OPTIMIZE_PROMPT;
  const systemPrompt = mergeSystemPrompt(promptConfig, taskPrompt);
  const userMessage = `【岗位JD】\n${jobDescription}\n\n【原始简历】\n${resumeText}\n\n【评估建议】\n${evaluationText}`;

  const raw = await callAI(config, systemPrompt, userMessage);
  const result = safeJsonParse<{ optimizedResume: string; suggestions: any[] }>(raw, "简历优化");

  return {
    optimizedResume: result.optimizedResume || "",
    suggestions: (result.suggestions || []).map((s: any, i: number) => ({
      ...s,
      id: s.id || String(i + 1),
      accepted: s.accepted ?? true,
    })),
  };
}

export async function generateInterview(
  config: ApiConfig,
  promptConfig: PromptConfig | undefined,
  jobDescription: string,
  resumeText: string
): Promise<InterviewResult> {
  const taskPrompt = promptConfig?.interviewPrompt?.trim() || DEFAULT_INTERVIEW_PROMPT;
  const systemPrompt = mergeSystemPrompt(promptConfig, taskPrompt);
  const userMessage = `【岗位JD】\n${jobDescription}\n\n【候选人简历】\n${resumeText}`;

  const raw = await callAI(config, systemPrompt, userMessage);
  const result = safeJsonParse<InterviewResult>(raw, "面试模拟");

  return {
    questions: (result.questions || []).map((q: any, i: number) => ({
      id: q.id || String(i + 1),
      category: q.category || "综合素养",
      question: q.question || "",
      keyPoints: q.keyPoints || [],
      modelAnswer: q.modelAnswer || "",
    })),
  };
}
