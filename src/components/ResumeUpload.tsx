import { useState, useRef } from "react";
import { Upload, FileText, X, Loader2 } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/utils";

async function parseFile(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase();

  if (ext === "pdf") {
    const pdfjsLib = await import("pdfjs-dist");
    pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs`;
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const content = await page.getTextContent();
      text += content.items.map((item: any) => item.str).join(" ") + "\n";
    }
    return text.trim();
  }

  if (ext === "docx") {
    const mammoth = await import("mammoth");
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value.trim();
  }

  if (["png", "jpg", "jpeg", "webp"].includes(ext ?? "")) {
    const Tesseract = await import("tesseract.js");
    const imageUrl = URL.createObjectURL(file);
    const result = await Tesseract.recognize(imageUrl, "chi_sim+eng");
    URL.revokeObjectURL(imageUrl);
    return result.data.text.trim();
  }

  // 纯文本文件
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve((reader.result as string).trim());
    reader.onerror = () => reject(new Error("文件读取失败"));
    reader.readAsText(file);
  });
}

const ACCEPTED_FORMATS = ".pdf,.docx,.txt,.png,.jpg,.jpeg,.webp";

export default function ResumeUpload() {
  const { resumeFileName, setResumeFileName, resumeText, setResumeText, setError } =
    useAppStore();
  const [parsing, setParsing] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setResumeFileName(file.name);
    setParsing(true);
    try {
      const text = await parseFile(file);
      if (!text) throw new Error("未能解析出文字内容，请确认文件可读");
      setResumeText(text);
    } catch (e: any) {
      setError(`文件解析失败: ${e.message}`);
    } finally {
      setParsing(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function clear() {
    setResumeFileName("");
    setResumeText("");
    if (inputRef.current) inputRef.current.value = "";
  }

  if (resumeText) {
    return (
      <div className="rounded-xl border bg-card p-4 animate-fade-in">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2 text-sm font-medium">
            <FileText size={16} className="text-primary" />
            {resumeFileName}
          </div>
          <button
            onClick={clear}
            className="p-1 rounded hover:bg-muted transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="text-xs text-muted-foreground line-clamp-3 bg-muted rounded-lg p-3 whitespace-pre-wrap">
          {resumeText.slice(0, 300)}
          {resumeText.length > 300 && "..."}
        </div>
      </div>
    );
  }

  return (
    <div
      onDrop={handleDrop}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={() => setDragOver(false)}
      onClick={() => inputRef.current?.click()}
      className={cn(
        "relative rounded-xl border-2 border-dashed p-8 text-center cursor-pointer transition-all",
        dragOver
          ? "border-primary bg-primary/5 scale-[1.01]"
          : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
      )}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_FORMATS}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
      {parsing ? (
        <div className="flex flex-col items-center gap-2">
          <Loader2 size={28} className="animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">正在解析文件...</span>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
            <Upload size={20} className="text-primary" />
          </div>
          <div>
            <span className="text-sm font-medium text-primary">上传简历</span>
            <span className="text-sm text-muted-foreground"> — 拖拽或点击选择</span>
          </div>
          <span className="text-xs text-muted-foreground">
            支持 PDF / Word / TXT / 图片
          </span>
        </div>
      )}
    </div>
  );
}
