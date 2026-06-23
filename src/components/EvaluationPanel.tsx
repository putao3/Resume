import { Loader2, Zap, AlertTriangle, Eye } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { evaluateResume } from "../services/ai";
import { demoEvaluate, DEMO_RESUME, DEMO_JD } from "../services/demo";
import { putHistory } from "../db/db";
import { nanoid } from "nanoid";
import { cn } from "../lib/utils";
import type { ScoreDimension } from "../types";
import {
  loadProjectFolderHandle,
  readProjectFiles,
  formatProjectMaterials,
} from "../lib/project-files";

const DIMENSION_COLORS: Record<string, string> = {
  "岗位匹配度": "bg-blue-500",
  "项目经验": "bg-emerald-500",
  "工作经验": "bg-amber-500",
  "个人简介": "bg-violet-500",
};

const DIMENSION_TEXT_COLORS: Record<string, string> = {
  "岗位匹配度": "text-blue-600",
  "项目经验": "text-emerald-600",
  "工作经验": "text-amber-600",
  "个人简介": "text-violet-600",
};

function ScoreBar({ dim }: { dim: ScoreDimension }) {
  const color = DIMENSION_COLORS[dim.name] ?? "bg-primary";
  const textColor = DIMENSION_TEXT_COLORS[dim.name] ?? "text-primary";

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{dim.name}</span>
        <span className={cn("text-lg font-bold", textColor)}>{dim.score}<span className="text-xs font-normal text-muted-foreground">/100</span></span>
      </div>
      <div className="h-2.5 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full rounded-full transition-all duration-700 ease-out", color)}
          style={{ width: `${dim.score}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{dim.comment}</p>
    </div>
  );
}

export default function EvaluationPanel() {
  const {
    resumeText,
    resumeFileName,
    jobDescription,
    apiConfig,
    promptConfig,
    status,
    setStatus,
    evaluation,
    setEvaluation,
    setError,
    setStep,
    setSuggestions,
    setCurrentHistoryId,
  } = useAppStore();

  async function startEvaluation() {
    if (!resumeText || !jobDescription) return;
    setStatus("analyzing");
    setError(null);
    try {
      // 尝试读取项目材料
      let projectMaterials: string | undefined;
      try {
        const handle = await loadProjectFolderHandle();
        if (handle) {
          const files = await readProjectFiles(handle);
          projectMaterials = formatProjectMaterials(files) || undefined;
        }
      } catch {
        console.warn("读取项目材料失败，将跳过");
      }

      const result = await evaluateResume(
        apiConfig, promptConfig, resumeText, jobDescription, projectMaterials
      );
      setEvaluation(result);
      setSuggestions(result.suggestions);
      setStatus("done");
      setStep("optimize");

      const historyId = nanoid();
      setCurrentHistoryId(historyId);
      await putHistory({
        id: historyId,
        createdAt: Date.now(),
        resumeFileName,
        resumeText,
        jobDescription,
        evaluation: result,
        optimizedResume: null,
        suggestions: result.suggestions,
        interview: null,
      });
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  async function runDemo() {
    setStatus("analyzing");
    setError(null);
    // Inject demo data if user hasn't uploaded anything
    if (!resumeText) useAppStore.getState().setResumeText(DEMO_RESUME);
    if (!resumeFileName) useAppStore.getState().setResumeFileName("示例简历_张三.md");
    if (!jobDescription) useAppStore.getState().setJobDescription(DEMO_JD);
    try {
      const result = await demoEvaluate();
      setEvaluation(result);
      setSuggestions(result.suggestions);
      setStatus("done");
      setStep("optimize");

      const historyId = nanoid();
      setCurrentHistoryId(historyId);
      await putHistory({
        id: historyId,
        createdAt: Date.now(),
        resumeFileName: resumeFileName || "示例简历_张三.md",
        resumeText: resumeText || DEMO_RESUME,
        jobDescription: jobDescription || DEMO_JD,
        evaluation: result,
        optimizedResume: null,
        suggestions: result.suggestions,
        interview: null,
      });
    } catch (e: any) {
      setError(e.message);
      setStatus("error");
    }
  }

  // === Idle: 显示开始按钮 ===
  if (status === "idle") {
    return (
      <div className="flex flex-col items-center py-8 rounded-xl border-2 border-dashed border-muted-foreground/20">
        <div className="flex items-center gap-3">
          <button
            onClick={startEvaluation}
            disabled={!resumeText || !jobDescription}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 disabled:opacity-30 transition-all text-lg shadow-sm"
          >
            <Zap size={22} />
            开始分析
          </button>
          <span className="text-sm text-muted-foreground">或</span>
          <button
            onClick={runDemo}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-all text-lg"
          >
            <Eye size={22} />
            查看 Demo
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          {!resumeText || !jobDescription
            ? "👆 请先上传简历并输入岗位 JD，或点击「查看 Demo」体验完整流程"
            : "点击按钮，AI 将进行四维度评估"}
        </p>
      </div>
    );
  }

  // === Loading ===
  if (status === "analyzing") {
    return (
      <div className="flex flex-col items-center py-14 gap-4 animate-fade-in rounded-xl border bg-card">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-sm font-medium">AI 正在分析简历...</p>
        <p className="text-xs text-muted-foreground">四维度评估中，预计 10-30 秒</p>
      </div>
    );
  }

  // === Error ===
  if (status === "error") {
    return (
      <div className="flex flex-col items-center py-10 gap-3 rounded-xl border border-destructive/30 bg-destructive/5">
        <AlertTriangle size={32} className="text-destructive" />
        <p className="text-sm font-medium text-destructive">分析出错，请重试</p>
        <button onClick={startEvaluation} className="text-sm text-primary hover:underline">
          重新分析
        </button>
      </div>
    );
  }

  if (!evaluation) return null;

  // === Done: 展示评估结果 ===
  return (
    <div className="space-y-5 animate-fade-in">
      {/* 总分环 */}
      <div className="flex items-center gap-5 p-5 rounded-xl bg-gradient-to-br from-primary/5 to-primary/10 border">
        <div className="relative w-20 h-20 shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/30" />
            <circle
              cx="40" cy="40" r="34" fill="none" stroke="currentColor" strokeWidth="6"
              strokeLinecap="round"
              className="text-primary"
              strokeDasharray={`${(evaluation.overallScore / 100) * 213.6} 213.6`}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-2xl font-bold">{evaluation.overallScore}</span>
          </div>
        </div>
        <div>
          <h3 className="font-semibold text-base">综合评估</h3>
          <p className="text-sm text-muted-foreground leading-relaxed mt-1">{evaluation.overallComment}</p>
        </div>
      </div>

      {/* 四维度评分 */}
      <div className="grid grid-cols-2 gap-4">
        {evaluation.dimensions.map((dim) => (
          <div key={dim.name} className="p-4 rounded-xl border bg-card">
            <ScoreBar dim={dim} />
          </div>
        ))}
      </div>

      {/* 修改思路概览 */}
      <div className="p-4 rounded-xl border bg-muted/30">
        <h4 className="text-sm font-medium mb-3">修改思路</h4>
        <div className="grid grid-cols-2 gap-3">
          {evaluation.dimensions.map((dim) => (
            <div key={dim.name} className="space-y-1">
              <span className="text-xs font-medium text-muted-foreground">{dim.name}</span>
              {dim.suggestions.length > 0 ? (
                <ul className="space-y-0.5">
                  {dim.suggestions.map((s, i) => (
                    <li key={i} className="text-xs text-muted-foreground flex items-start gap-1">
                      <span className="text-primary shrink-0 mt-0.5">•</span>
                      {s}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">无明显问题</p>
              )}
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
