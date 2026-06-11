import { AlertTriangle, X } from "lucide-react";
import Sidebar from "./components/Sidebar";
import ResumeUpload from "./components/ResumeUpload";
import JobInput from "./components/JobInput";
import EvaluationPanel from "./components/EvaluationPanel";
import OptimizePanel from "./components/OptimizePanel";
import InterviewPanel from "./components/InterviewPanel";
import ConfigDialog from "./components/ConfigDialog";
import PromptConfigDialog from "./components/PromptConfigDialog";
import { useAppStore } from "./store/useAppStore";

function Toast() {
  const { error, setError } = useAppStore();
  if (!error) return null;

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 animate-slide-up">
      <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-sm shadow-lg max-w-lg">
        <AlertTriangle size={16} className="shrink-0" />
        <span className="flex-1">{error}</span>
        <button
          onClick={() => setError(null)}
          className="p-0.5 rounded hover:bg-destructive/20 shrink-0"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

function MainContent() {
  const { step, evaluation } = useAppStore();

  return (
    <div className="flex-1 flex flex-col min-h-0">
      {/* Header */}
      <header className="px-6 py-4 border-b bg-card/50 backdrop-blur-sm">
        <h1 className="text-lg font-semibold tracking-tight">简历对比优化</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          上传简历 + 岗位JD → AI 评估 → 一键优化 → 对比下载
        </p>
      </header>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-6 py-6 space-y-6">

          {/* ===== Step 1: 简历上传 + JD 输入（同行双列） ===== */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">1</span>
              <h2 className="font-medium">输入信息</h2>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium mb-2 block">简历上传</label>
                <ResumeUpload />
              </div>
              <div>
                <label className="text-sm font-medium mb-2 block">岗位 JD</label>
                <JobInput />
              </div>
            </div>
          </section>

          {/* ===== Step 2: 简历评估 ===== */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">2</span>
              <h2 className="font-medium">简历评估</h2>
            </div>
            <EvaluationPanel />
          </section>

          {/* ===== Step 3: 优化结果 + 原始简历对比（双列） ===== */}
          {(step === "optimize" || step === "interview") && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">3</span>
                <h2 className="font-medium">优化对比</h2>
              </div>
              <OptimizePanel />
            </section>
          )}

          {/* ===== Step 4: 面试模拟 ===== */}
          {(step === "optimize" || step === "interview") && (
            <section className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center font-medium">4</span>
                <h2 className="font-medium">面试模拟</h2>
              </div>
              <InterviewPanel />
            </section>
          )}

          {/* 底部留白 */}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <MainContent />
      <ConfigDialog />
      <PromptConfigDialog />
      <Toast />
    </div>
  );
}
