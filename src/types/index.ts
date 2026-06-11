// 简历分析状态
export type AnalysisStatus = "idle" | "uploading" | "analyzing" | "done" | "error";

// 评分维度
export interface ScoreDimension {
  name: string;
  score: number; // 0-100
  comment: string;
  suggestions: string[];
}

// 评估结果
export interface EvaluationResult {
  dimensions: ScoreDimension[];
  overallComment: string;
  overallScore: number;
  suggestions: SuggestionItem[];
}

// 单条修改建议
export interface SuggestionItem {
  id: string;
  category: string;
  original: string;
  revised: string;
  reason: string;
  accepted: boolean;
}

// 历史记录条目
export interface HistoryRecord {
  id: string;
  createdAt: number;
  resumeFileName: string;
  resumeText: string;
  jobDescription: string;
  evaluation: EvaluationResult | null;
  optimizedResume: string | null;
  suggestions: SuggestionItem[] | null;
  interview: InterviewResult | null;
}

// API 配置
export interface ApiConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

// 面试题
export interface InterviewQuestion {
  id: string;
  category: string;          // 如：技术能力、项目经验、行为面试、综合素养
  question: string;           // 面试题目
  keyPoints: string[];        // 考核要点
  modelAnswer: string;        // 参考答案
}

// 面试结果
export interface InterviewResult {
  questions: InterviewQuestion[];
}

// Prompt 配置
export interface PromptConfig {
  systemPrompt: string;         // 系统级别提示词
  evaluationPrompt: string;     // 简历评估提示词
  optimizePrompt: string;       // 简历优化提示词
  interviewPrompt: string;      // 面试模拟提示词
}

// Step 流程
export type Step = "input" | "evaluation" | "optimize" | "interview";
