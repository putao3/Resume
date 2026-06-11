import { useState } from "react";
import { Loader2, Brain, Eye, ChevronDown, ChevronUp, Target, Lightbulb, MessageSquare } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { generateInterview } from "../services/ai";
import { demoInterview } from "../services/demo";
import { db } from "../db/db";
import { cn } from "../lib/utils";
import type { InterviewQuestion } from "../types";

const CATEGORY_COLORS: Record<string, string> = {
  "技术能力": "border-blue-300 bg-blue-50/60",
  "项目经验": "border-emerald-300 bg-emerald-50/60",
  "行为面试": "border-amber-300 bg-amber-50/60",
  "综合素养": "border-violet-300 bg-violet-50/60",
};

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  "技术能力": <Target size={14} />,
  "项目经验": <Lightbulb size={14} />,
  "行为面试": <MessageSquare size={14} />,
  "综合素养": <Brain size={14} />,
};

function QuestionCard({ q, defaultOpen = false }: { q: InterviewQuestion; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div
      className={cn(
        "rounded-xl border transition-all",
        CATEGORY_COLORS[q.category] ?? "border-muted bg-card"
      )}
    >
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-start gap-3 p-4 text-left"
      >
        {/* Category icon */}
        <span className="shrink-0 mt-0.5 text-muted-foreground">
          {CATEGORY_ICONS[q.category] ?? <Target size={14} />}
        </span>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {q.category}
            </span>
          </div>
          <p className="text-sm font-medium leading-relaxed">{q.question}</p>
        </div>

        <span className="shrink-0 text-muted-foreground mt-1">
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </span>
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3 animate-fade-in border-t pt-3 mx-4">
          {/* 考核要点 */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              🎯 考核要点
            </h5>
            <ul className="space-y-0.5">
              {q.keyPoints.map((kp, i) => (
                <li key={i} className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <span className="text-primary font-bold shrink-0">{i + 1}.</span>
                  {kp}
                </li>
              ))}
            </ul>
          </div>

          {/* 参考答案 */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-1.5 flex items-center gap-1">
              💬 参考答案要点
            </h5>
            <p className="text-xs leading-relaxed text-muted-foreground bg-muted/40 rounded-lg p-3">
              {q.modelAnswer}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

export default function InterviewPanel() {
  const {
    resumeText,
    jobDescription,
    apiConfig,
    promptConfig,
    currentHistoryId,
    setError,
    interview,
    setInterview,
    setStep,
  } = useAppStore();

  const [loading, setLoading] = useState(false);

  async function startInterview() {
    setLoading(true);
    setError(null);
    try {
      const result = await generateInterview(apiConfig, promptConfig, jobDescription, resumeText);
      setInterview(result);
      setStep("interview");

      if (currentHistoryId) {
        await db.history.update(currentHistoryId, { interview: result });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runDemoInterview() {
    setLoading(true);
    setError(null);
    try {
      const result = await demoInterview();
      setInterview(result);
      setStep("interview");

      if (currentHistoryId) {
        await db.history.update(currentHistoryId, { interview: result });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  // === 未生成：显示按钮 ===
  if (!interview && !loading) {
    return (
      <div className="flex flex-col items-center py-8 rounded-xl border-2 border-dashed border-muted-foreground/20">
        <div className="flex items-center gap-3">
          <button
            onClick={startInterview}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-lg shadow-sm"
          >
            <Brain size={22} />
            生成面试题
          </button>
          <span className="text-sm text-muted-foreground">或</span>
          <button
            onClick={runDemoInterview}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-all text-lg"
          >
            <Eye size={22} />
            查看 Demo
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          AI 将根据岗位 JD 生成专业面试题，涵盖技术、项目、行为、素养四个维度
        </p>
      </div>
    );
  }

  // === Loading ===
  if (loading) {
    return (
      <div className="flex flex-col items-center py-14 gap-4 animate-fade-in rounded-xl border bg-card">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-sm font-medium">AI 正在生成面试题...</p>
        <p className="text-xs text-muted-foreground">分析 JD 要求，定制面试考核方案</p>
      </div>
    );
  }

  if (!interview) return null;

  // 按类别分组
  const questions = interview.questions;
  const categories = Array.from(new Set(questions.map((q) => q.category)));

  // === 面试题展示 ===
  return (
    <div className="space-y-4 animate-fade-in">
      {/* 统计条 */}
      <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-gradient-to-r from-violet-50 to-blue-50 border">
        <span className="text-sm font-medium">📋 共 <span className="text-primary font-bold">{questions.length}</span> 道面试题</span>
        <span className="text-xs text-muted-foreground">
          覆盖 {categories.length} 个维度：
        </span>
        <span className="text-xs text-muted-foreground">
          {categories.join(" · ")}
        </span>
      </div>

      {/* 题目列表 */}
      <div className="space-y-2.5">
        {questions.map((q, i) => (
          <QuestionCard key={q.id} q={q} defaultOpen={i === 0} />
        ))}
      </div>
    </div>
  );
}
