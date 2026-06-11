import { useState, useEffect } from "react";
import { X, Check, FileText, RotateCcw } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  DEFAULT_SYSTEM_PROMPT,
  DEFAULT_EVALUATION_PROMPT,
  DEFAULT_OPTIMIZE_PROMPT,
  DEFAULT_INTERVIEW_PROMPT,
} from "../services/ai";

const PROMPT_FIELDS = [
  {
    key: "systemPrompt" as const,
    label: "系统提示词",
    icon: "⚙️",
    description: "全局系统级指令，会与各模块提示词合并",
    defaultPrompt: DEFAULT_SYSTEM_PROMPT,
    rows: 3,
  },
  {
    key: "evaluationPrompt" as const,
    label: "简历评估提示词",
    icon: "📊",
    description: "用于简历四维度评分和修改建议生成",
    defaultPrompt: DEFAULT_EVALUATION_PROMPT,
    rows: 6,
  },
  {
    key: "optimizePrompt" as const,
    label: "简历优化提示词",
    icon: "✨",
    description: "用于一键优化简历，控制改写风格和质量",
    defaultPrompt: DEFAULT_OPTIMIZE_PROMPT,
    rows: 6,
  },
  {
    key: "interviewPrompt" as const,
    label: "面试模拟提示词",
    icon: "🎯",
    description: "用于生成面试题、考核要点和参考答案",
    defaultPrompt: DEFAULT_INTERVIEW_PROMPT,
    rows: 6,
  },
];

export default function PromptConfigDialog() {
  const { promptConfig, setPromptConfig } = useAppStore();
  const [open, setOpen] = useState(false);
  const [local, setLocal] = useState(promptConfig);
  const [saved, setSaved] = useState(false);
  const [activeTab, setActiveTab] = useState(0);

  useEffect(() => {
    function handler() {
      setOpen(true);
      setLocal(useAppStore.getState().promptConfig);
    }
    window.addEventListener("open-prompt-config", handler);
    return () => window.removeEventListener("open-prompt-config", handler);
  }, []);

  useEffect(() => {
    setLocal(promptConfig);
  }, [promptConfig, open]);

  function save() {
    setPromptConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function close() {
    setOpen(false);
  }

  function resetField(key: keyof typeof local) {
    const defaults: Record<string, string> = {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      evaluationPrompt: DEFAULT_EVALUATION_PROMPT,
      optimizePrompt: DEFAULT_OPTIMIZE_PROMPT,
      interviewPrompt: DEFAULT_INTERVIEW_PROMPT,
    };
    setLocal({ ...local, [key]: defaults[key] });
  }

  if (!open) return null;

  const currentField = PROMPT_FIELDS[activeTab];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-3xl mx-4 bg-card rounded-2xl border shadow-2xl animate-slide-up max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b shrink-0">
          <div className="flex items-center gap-2">
            <FileText size={18} className="text-primary" />
            <h3 className="font-semibold">Prompt 配置</h3>
          </div>
          <button onClick={close} className="p-1 rounded-md hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b shrink-0 overflow-x-auto">
          {PROMPT_FIELDS.map((f, i) => (
            <button
              key={f.key}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium whitespace-nowrap border-b-2 transition-colors ${
                i === activeTab
                  ? "border-primary text-primary"
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <span>{f.icon}</span>
              {f.label}
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">{currentField.description}</p>
            <button
              onClick={() => resetField(currentField.key)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <RotateCcw size={12} />
              恢复默认
            </button>
          </div>

          <textarea
            value={local[currentField.key]}
            onChange={(e) => setLocal({ ...local, [currentField.key]: e.target.value })}
            rows={currentField.rows}
            className="w-full rounded-xl border bg-background px-4 py-3 text-sm font-mono leading-relaxed focus:outline-none focus:ring-2 focus:ring-ring resize-y min-h-[200px]"
            style={{ minHeight: currentField.rows * 40 }}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between shrink-0">
          <p className="text-xs text-muted-foreground">
            提示词配置保存在浏览器本地，实时生效
          </p>
          <button
            onClick={save}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
          >
            {saved ? <Check size={16} /> : null}
            {saved ? "已保存" : "保存配置"}
          </button>
        </div>
      </div>
    </div>
  );
}
