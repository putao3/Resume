import { useEffect } from "react";
import {
  FileText,
  History,
  Settings,
  PlusCircle,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FileEdit,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { db } from "../db/db";
import type { HistoryRecord } from "../types";

function formatDate(ts: number) {
  const d = new Date(ts);
  return `${d.getMonth() + 1}/${d.getDate()} ${d.getHours().toString().padStart(2, "0")}:${d.getMinutes().toString().padStart(2, "0")}`;
}

export default function Sidebar() {
  const {
    sidebarOpen,
    setSidebarOpen,
    historyList,
    setHistoryList,
    reset,
    setStep,
    setResumeText,
    setResumeFileName,
    setJobDescription,
    setEvaluation,
    setCurrentHistoryId,
    setOptimizedResume,
    setSuggestions,
    setInterview,
  } = useAppStore();

  useEffect(() => {
    db.history.orderBy("createdAt").reverse().toArray().then(setHistoryList);
  }, [setHistoryList]);

  async function loadRecord(r: HistoryRecord) {
    reset();
    setCurrentHistoryId(r.id);
    setResumeFileName(r.resumeFileName);
    setResumeText(r.resumeText);
    setJobDescription(r.jobDescription);
    if (r.evaluation) {
      setEvaluation(r.evaluation);
      // 关键：设置 status 为 done，否则 EvaluationPanel 会因为 status="idle" 而不展示结果
      useAppStore.getState().setStatus("done");
      if (r.interview) {
        setInterview(r.interview);
      }
      if (r.optimizedResume) {
        setOptimizedResume(r.optimizedResume);
        setSuggestions(r.suggestions);
      }
      if (r.interview) {
        setStep("interview");
      } else if (r.optimizedResume) {
        setStep("optimize");
      } else {
        setStep("evaluation");
      }
    } else {
      setStep("input");
    }
  }

  async function deleteRecord(id: string) {
    await db.history.delete(id);
    const list = await db.history.orderBy("createdAt").reverse().toArray();
    setHistoryList(list);
  }

  function handleNew() {
    reset();
  }

  return (
    <aside
      className="flex flex-col border-r bg-card transition-all duration-300"
      style={{ width: sidebarOpen ? 260 : 52 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-4 border-b">
        {sidebarOpen && (
          <span className="font-semibold text-sm tracking-tight">简历优化助手</span>
        )}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-1.5 rounded-md hover:bg-muted transition-colors"
        >
          {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
        </button>
      </div>

      {/* New */}
      <button
        onClick={handleNew}
        className="mx-2 mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity text-sm"
      >
        <PlusCircle size={16} />
        {sidebarOpen && "新建对比"}
      </button>

      {/* History */}
      <div className="flex-1 overflow-y-auto mt-3 px-2">
        {sidebarOpen && (
          <div className="flex items-center gap-1.5 px-1 mb-2 text-xs text-muted-foreground">
            <History size={12} />
            历史记录
          </div>
        )}
        {sidebarOpen &&
          historyList.map((r) => (
            <div
              key={r.id}
              className="group flex items-center gap-2 px-2 py-2 rounded-md hover:bg-muted cursor-pointer transition-colors text-sm"
              onClick={() => loadRecord(r)}
            >
              <FileText size={14} className="shrink-0 text-muted-foreground" />
              <span className="truncate flex-1">{r.resumeFileName || "未命名"}</span>
              <span className="text-xs text-muted-foreground">{formatDate(r.createdAt)}</span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  deleteRecord(r.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-0.5 text-muted-foreground hover:text-destructive transition-all"
              >
                <Trash2 size={12} />
              </button>
            </div>
          ))}
        {sidebarOpen && historyList.length === 0 && (
          <p className="text-xs text-muted-foreground text-center mt-4">暂无记录</p>
        )}
      </div>

      {/* Config */}
      <div className="px-2 pb-3 space-y-1">
        <button
          onClick={() => {
            const event = new CustomEvent("open-prompt-config");
            window.dispatchEvent(event);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <FileEdit size={16} />
          {sidebarOpen && "Prompt 配置"}
        </button>
        <button
          onClick={() => {
            const event = new CustomEvent("open-config");
            window.dispatchEvent(event);
          }}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-muted transition-colors text-sm"
        >
          <Settings size={16} />
          {sidebarOpen && "API 配置"}
        </button>
      </div>
    </aside>
  );
}
