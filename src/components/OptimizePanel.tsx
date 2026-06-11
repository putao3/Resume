import { useState, useMemo } from "react";
import { Loader2, Download, Check, X, Wand2, Copy, Eye } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { optimizeResume } from "../services/ai";
import { demoOptimize } from "../services/demo";
import { db } from "../db/db";
import { cn } from "../lib/utils";

export default function OptimizePanel() {
  const {
    resumeText,
    resumeFileName,
    jobDescription,
    evaluation,
    apiConfig,
    promptConfig,
    currentHistoryId,
    setError,
    setOptimizedResume,
    setSuggestions,
    optimizedResume,
    suggestions,
    toggleSuggestion,
    setStep,
  } = useAppStore();

  const [loading, setLoading] = useState(false);
  const [optimizedInitialized, setOptimizedInitialized] = useState(!!optimizedResume);

  // 根据建议的接受/拒绝状态动态生成展示简历
  const displayResume = useMemo(() => {
    if (!optimizedResume || !suggestions) return optimizedResume ?? resumeText;

    let result = optimizedResume;
    for (const s of suggestions) {
      if (!s.accepted && result.includes(s.revised)) {
        result = result.replace(s.revised, s.original);
      }
    }
    return result;
  }, [optimizedResume, resumeText, suggestions]);

  async function startOptimize() {
    setLoading(true);
    setError(null);
    try {
      const evalText = evaluation
        ? evaluation.dimensions
            .map((d) => `${d.name}(${d.score}分): ${d.comment}；建议: ${d.suggestions.join("；")}`)
            .join("\n")
        : "";

      const result = await optimizeResume(apiConfig, promptConfig, resumeText, jobDescription, evalText);
      setOptimizedResume(result.optimizedResume);
      setSuggestions(result.suggestions);
      setOptimizedInitialized(true);
      setStep("interview");

      if (currentHistoryId) {
        await db.history.update(currentHistoryId, {
          optimizedResume: result.optimizedResume,
          suggestions: result.suggestions,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function runDemoOptimize() {
    setLoading(true);
    setError(null);
    try {
      const result = await demoOptimize();
      setOptimizedResume(result.optimizedResume);
      setSuggestions(result.suggestions);
      setOptimizedInitialized(true);
      setStep("interview");

      if (currentHistoryId) {
        await db.history.update(currentHistoryId, {
          optimizedResume: result.optimizedResume,
          suggestions: result.suggestions,
        });
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function downloadResume() {
    const blob = new Blob([displayResume], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `优化后_${resumeFileName || "简历"}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function acceptAll() {
    if (!suggestions) return;
    useAppStore.getState().setSuggestions(suggestions.map((s) => ({ ...s, accepted: true })));
  }

  function rejectAll() {
    if (!suggestions) return;
    useAppStore.getState().setSuggestions(suggestions.map((s) => ({ ...s, accepted: false })));
  }

  const acceptedCount = suggestions?.filter((s) => s.accepted).length ?? 0;
  const totalCount = suggestions?.length ?? 0;

  // === 还未优化：显示按钮 ===
  if (!optimizedInitialized && !loading) {
    return (
      <div className="flex flex-col items-center py-8 rounded-xl border-2 border-dashed border-muted-foreground/20">
        <div className="flex items-center gap-3">
          <button
            onClick={startOptimize}
            className="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-all text-lg shadow-sm"
          >
            <Wand2 size={22} />
            开始优化
          </button>
          <span className="text-sm text-muted-foreground">或</span>
          <button
            onClick={runDemoOptimize}
            className="inline-flex items-center gap-2 px-6 py-4 rounded-xl border-2 border-primary/30 text-primary font-semibold hover:bg-primary/5 transition-all text-lg"
          >
            <Eye size={22} />
            查看 Demo
          </button>
        </div>
        <p className="text-xs text-muted-foreground mt-3">
          点击按钮，AI 将根据评估意见自动优化简历
        </p>
      </div>
    );
  }

  // === Loading ===
  if (loading) {
    return (
      <div className="flex flex-col items-center py-14 gap-4 animate-fade-in rounded-xl border bg-card">
        <Loader2 size={40} className="animate-spin text-primary" />
        <p className="text-sm font-medium">AI 正在优化简历...</p>
        <p className="text-xs text-muted-foreground">优化表达、对齐JD、突出亮点</p>
      </div>
    );
  }

  // === 优化完成 ===
  return (
    <div className="space-y-5 animate-fade-in">

      {/* ===== 双栏对比：原始 vs 优化后 ===== */}
      <div className="grid grid-cols-2 gap-4">
        {/* 原始简历 */}
        <div className="rounded-xl border bg-card overflow-hidden">
          <div className="px-4 py-2.5 border-b bg-muted/30 flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">📄 原始简历</span>
            <button
              onClick={() => navigator.clipboard.writeText(resumeText)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <Copy size={12} /> 复制
            </button>
          </div>
          <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {resumeText}
          </div>
        </div>

        {/* 优化后简历 */}
        <div className="rounded-xl border bg-card overflow-hidden ring-2 ring-emerald-200">
          <div className="px-4 py-2.5 border-b bg-emerald-50/50 flex items-center justify-between">
            <span className="text-xs font-medium text-emerald-700">✨ 优化后简历</span>
            <button
              onClick={() => navigator.clipboard.writeText(displayResume)}
              className="flex items-center gap-1 text-xs text-emerald-700 hover:text-emerald-900 transition-colors"
            >
              <Copy size={12} /> 复制
            </button>
          </div>
          <div className="p-4 text-sm leading-relaxed whitespace-pre-wrap max-h-[500px] overflow-y-auto">
            {displayResume}
          </div>
        </div>
      </div>

      {/* ===== 修改建议列表 ===== */}
      {suggestions && suggestions.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">
              📋 修改建议（已接受 <span className="text-emerald-600">{acceptedCount}</span>/{totalCount}）
            </h4>
            <div className="flex gap-2">
              <button onClick={acceptAll} className="text-xs px-3 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 transition-colors">
                全部接受
              </button>
              <button onClick={rejectAll} className="text-xs px-3 py-1 rounded-md bg-red-50 text-red-700 hover:bg-red-100 transition-colors">
                全部拒绝
              </button>
            </div>
          </div>

          <div className="space-y-2">
            {suggestions.map((s) => (
              <div
                key={s.id}
                className={cn(
                  "p-3.5 rounded-xl border transition-all",
                  s.accepted
                    ? "border-emerald-200 bg-emerald-50/40"
                    : "border-muted bg-muted/20 opacity-60"
                )}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => toggleSuggestion(s.id)}
                    className={cn(
                      "mt-0.5 p-1 rounded-md shrink-0 transition-colors",
                      s.accepted
                        ? "bg-emerald-500 text-white"
                        : "bg-muted-foreground/20 text-muted-foreground hover:bg-muted-foreground/30"
                    )}
                  >
                    {s.accepted ? <Check size={13} /> : <X size={13} />}
                  </button>
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <span className="text-xs font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded">
                      {s.category}
                    </span>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">原文：</span>
                        <span className="text-muted-foreground line-through">{s.original}</span>
                      </div>
                      <div>
                        <span className="text-emerald-600">改为：</span>
                        <span className="text-emerald-700">{s.revised}</span>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">💡 {s.reason}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ===== 下载按钮 ===== */}
      <div className="flex justify-end">
        <button
          onClick={downloadResume}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all shadow-sm"
        >
          <Download size={16} />
          下载优化后简历
        </button>
      </div>
    </div>
  );
}
