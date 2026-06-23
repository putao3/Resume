import { useState, useEffect } from "react";
import {
  X,
  Check,
  FolderOpen,
  RefreshCw,
  Trash2,
  AlertTriangle,
} from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import {
  isFileSystemAccessSupported,
  saveProjectFolderHandle,
  clearProjectFolderHandle,
} from "../lib/project-files";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase();
  switch (ext) {
    case "pdf":
      return "📕";
    case "docx":
      return "📘";
    case "pptx":
      return "📊";
    case "txt":
    case "md":
      return "📄";
    default:
      return "📁";
  }
}

export default function ProjectFilesDialog() {
  const { projectFolderName, projectFileList, setProjectFolder, clearProjectFolder } =
    useAppStore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saved, setSaved] = useState(false);
  const [browserSupported] = useState(isFileSystemAccessSupported);

  useEffect(() => {
    function handler() {
      setOpen(true);
    }
    window.addEventListener("open-project-files", handler);
    return () => window.removeEventListener("open-project-files", handler);
  }, []);

  function close() {
    setOpen(false);
  }

  /** 选择文件夹并枚举文件 */
  async function selectFolder() {
    if (!browserSupported) return;

    setLoading(true);
    try {
      const handle = await window.showDirectoryPicker({ mode: "read" });
      await saveProjectFolderHandle(handle);

      // 枚举文件信息
      const fileList: { name: string; size: number }[] = [];
      for await (const [name, entry] of handle.entries()) {
        if (entry.kind === "file") {
          const fileHandle = entry as FileSystemFileHandle;
          const file = await fileHandle.getFile();
          fileList.push({ name, size: file.size });
        }
      }
      fileList.sort((a, b) => a.name.localeCompare(b.name));

      setProjectFolder(handle.name, fileList);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (e: any) {
      // 用户取消选择不报错
      if (e.name !== "AbortError") {
        console.error("选择文件夹失败:", e);
      }
    } finally {
      setLoading(false);
    }
  }

  /** 清除已配置的文件夹 */
  async function handleClear() {
    await clearProjectFolderHandle();
    clearProjectFolder();
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-lg mx-4 bg-card rounded-2xl border shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <FolderOpen size={18} className="text-primary" />
            <h3 className="font-semibold">项目材料配置</h3>
          </div>
          <button onClick={close} className="p-1 rounded-md hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          {/* 说明文字 */}
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-sm text-blue-800 leading-relaxed">
            💡 您可以将做过的<strong>项目PPT、Word文档、PDF</strong>等材料放入一个文件夹，
            然后在此处选择该文件夹。AI在评估和优化简历时会读取这些项目材料，
            使优化结果更贴合您的实际项目经历，突出亮点。
          </div>

          {/* 浏览器不支持提示 */}
          {!browserSupported && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">浏览器不支持</p>
                <p className="mt-0.5">
                  您的浏览器不支持 File System Access API，请使用
                  <strong> Chrome 86+</strong> 或 <strong>Edge 86+</strong>。
                </p>
              </div>
            </div>
          )}

          {/* 选择文件夹按钮 */}
          <button
            onClick={selectFolder}
            disabled={!browserSupported || loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border-2 border-dashed border-primary/30 text-primary font-medium hover:bg-primary/5 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                正在读取文件夹...
              </>
            ) : (
              <>
                <FolderOpen size={18} />
                {projectFolderName ? "重新选择文件夹" : "选择文件夹"}
              </>
            )}
          </button>

          {/* 已选文件夹信息 */}
          {projectFolderName && (
            <div className="rounded-xl border bg-card overflow-hidden">
              {/* 文件夹头部 */}
              <div className="px-4 py-3 border-b bg-muted/20 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <FolderOpen size={16} className="text-primary shrink-0" />
                  <span className="text-sm font-medium truncate">
                    {projectFolderName}
                  </span>
                </div>
                <button
                  onClick={handleClear}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10"
                >
                  <Trash2 size={12} />
                  清除
                </button>
              </div>

              {/* 文件列表 */}
              <div className="max-h-48 overflow-y-auto">
                {projectFileList.length === 0 ? (
                  <div className="px-4 py-6 text-center text-sm text-muted-foreground">
                    文件夹为空，请放入项目材料文件
                  </div>
                ) : (
                  <div className="divide-y">
                    {projectFileList.map((f) => (
                      <div
                        key={f.name}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-muted/30 transition-colors"
                      >
                        <span className="text-base">{getFileIcon(f.name)}</span>
                        <span className="flex-1 truncate">{f.name}</span>
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatSize(f.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="px-4 py-2 border-t bg-muted/10 text-xs text-muted-foreground">
                共 {projectFileList.length} 个文件
                {projectFileList.length > 0 && (
                  <span className="ml-2">
                    （支持 .txt / .md / .docx / .pdf / .pptx）
                  </span>
                )}
              </div>
            </div>
          )}

          {/* 没有文件夹但有项目材料时的空状态 */}
          {!projectFolderName && !loading && (
            <p className="text-xs text-muted-foreground text-center">
              尚未配置项目材料文件夹，点击上方按钮选择
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            配置保存在浏览器本地
          </p>
          <button
            onClick={close}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-all"
          >
            {saved ? <Check size={16} /> : null}
            {saved ? "已保存" : "完成"}
          </button>
        </div>
      </div>
    </div>
  );
}
