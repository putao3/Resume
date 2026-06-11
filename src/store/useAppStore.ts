import { create } from "zustand";
import type {
  AnalysisStatus,
  EvaluationResult,
  HistoryRecord,
  ApiConfig,
  Step,
  SuggestionItem,
  InterviewResult,
  PromptConfig,
} from "../types";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EVALUATION_PROMPT,
  DEFAULT_OPTIMIZE_PROMPT,
  DEFAULT_INTERVIEW_PROMPT,
} from "../services/ai";

const DEFAULT_CONFIG: ApiConfig = {
  // 开发环境通过 Vite proxy 转发到 api.deepseek.com，解决 CORS
  // 生产部署时需替换为实际 API 地址或自建代理
  endpoint: "/api/deepseek/v1/chat/completions",
  apiKey: "",
  model: "deepseek-chat",
};

function loadConfig(): ApiConfig {
  try {
    const raw = localStorage.getItem("resume-api-config");
    if (raw) {
      const saved = JSON.parse(raw);
      let migrated = false;
      // 自动迁移旧的直连 URL 到代理路径（解决 CORS）
      if (
        saved.endpoint === "https://api.anthropic.com/v1/messages" ||
        saved.endpoint === "https://api.anthropic.com/v1/messages/" ||
        saved.endpoint === "/api/anthropic/v1/messages"
      ) {
        saved.endpoint = DEFAULT_CONFIG.endpoint;
        saved.model = saved.model?.startsWith("claude-") ? DEFAULT_CONFIG.model : saved.model;
        migrated = true;
      }
      // DeepSeek 直连 URL 也迁移到代理路径
      if (
        saved.endpoint === "https://api.deepseek.com/v1/chat/completions" ||
        saved.endpoint === "https://api.deepseek.com/v1/chat/completions/"
      ) {
        saved.endpoint = DEFAULT_CONFIG.endpoint;
        migrated = true;
      }
      if (migrated) {
        localStorage.setItem("resume-api-config", JSON.stringify(saved));
      }
      return { ...DEFAULT_CONFIG, ...saved };
    }
  } catch { /* ignore */ }
  return DEFAULT_CONFIG;
}

function saveConfig(cfg: ApiConfig) {
  localStorage.setItem("resume-api-config", JSON.stringify(cfg));
}

const DEFAULT_PROMPT_CONFIG: PromptConfig = {
  systemPrompt: DEFAULT_SYSTEM_PROMPT,
  evaluationPrompt: DEFAULT_EVALUATION_PROMPT,
  optimizePrompt: DEFAULT_OPTIMIZE_PROMPT,
  interviewPrompt: DEFAULT_INTERVIEW_PROMPT,
};

function loadPromptConfig(): PromptConfig {
  try {
    const raw = localStorage.getItem("resume-prompt-config");
    if (raw) return { ...DEFAULT_PROMPT_CONFIG, ...JSON.parse(raw) };
  } catch { /* ignore */ }
  return DEFAULT_PROMPT_CONFIG;
}

function savePromptConfig(cfg: PromptConfig) {
  localStorage.setItem("resume-prompt-config", JSON.stringify(cfg));
}

interface AppState {
  // 流程步骤
  step: Step;
  setStep: (step: Step) => void;

  // 状态
  status: AnalysisStatus;
  setStatus: (status: AnalysisStatus) => void;
  error: string | null;
  setError: (err: string | null) => void;

  // 简历内容
  resumeFileName: string;
  setResumeFileName: (name: string) => void;
  resumeText: string;
  setResumeText: (text: string) => void;

  // JD 内容
  jobDescription: string;
  setJobDescription: (text: string) => void;

  // 评估结果
  evaluation: EvaluationResult | null;
  setEvaluation: (result: EvaluationResult | null) => void;

  // 当前历史记录 ID（评估时创建，优化/面试时更新同一条）
  currentHistoryId: string | null;
  setCurrentHistoryId: (id: string | null) => void;

  // 优化结果
  optimizedResume: string | null;
  setOptimizedResume: (text: string | null) => void;
  suggestions: SuggestionItem[] | null;
  setSuggestions: (items: SuggestionItem[] | null) => void;
  toggleSuggestion: (id: string) => void;

  // 面试模拟
  interview: InterviewResult | null;
  setInterview: (data: InterviewResult | null) => void;

  // API 配置
  apiConfig: ApiConfig;
  setApiConfig: (cfg: Partial<ApiConfig>) => void;

  // Prompt 配置
  promptConfig: PromptConfig;
  setPromptConfig: (cfg: PromptConfig) => void;

  // 历史列表
  historyList: HistoryRecord[];
  setHistoryList: (list: HistoryRecord[]) => void;

  // 侧边栏
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;

  // 重置
  reset: () => void;
}

export const useAppStore = create<AppState>((set) => ({
  step: "input",
  setStep: (step) => set({ step }),

  status: "idle",
  setStatus: (status) => set({ status }),
  error: null,
  setError: (error) => set({ error }),

  resumeFileName: "",
  setResumeFileName: (name) => set({ resumeFileName: name }),
  resumeText: "",
  setResumeText: (text) => set({ resumeText: text }),

  jobDescription: "",
  setJobDescription: (text) => set({ jobDescription: text }),

  evaluation: null,
  setEvaluation: (evaluation) => set({ evaluation }),

  currentHistoryId: null,
  setCurrentHistoryId: (id) => set({ currentHistoryId: id }),

  optimizedResume: null,
  setOptimizedResume: (optimizedResume) => set({ optimizedResume }),
  suggestions: null,
  setSuggestions: (suggestions) => set({ suggestions }),
  toggleSuggestion: (id) =>
    set((state) => ({
      suggestions: state.suggestions?.map((s) =>
        s.id === id ? { ...s, accepted: !s.accepted } : s
      ) ?? null,
    })),

  interview: null,
  setInterview: (interview) => set({ interview }),

  apiConfig: loadConfig(),
  setApiConfig: (partial) =>
    set((state) => {
      const next = { ...state.apiConfig, ...partial };
      saveConfig(next);
      return { apiConfig: next };
    }),

  promptConfig: loadPromptConfig(),
  setPromptConfig: (cfg) => {
    savePromptConfig(cfg);
    set({ promptConfig: cfg });
  },

  historyList: [],
  setHistoryList: (historyList) => set({ historyList }),

  sidebarOpen: true,
  setSidebarOpen: (sidebarOpen) => set({ sidebarOpen }),

  reset: () =>
    set({
      step: "input",
      status: "idle",
      error: null,
      resumeFileName: "",
      resumeText: "",
      jobDescription: "",
      evaluation: null,
      currentHistoryId: null,
      optimizedResume: null,
      suggestions: null,
      interview: null,
    }),
}));
