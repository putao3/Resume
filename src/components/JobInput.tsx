import { useState } from "react";
import { Link, Image, FileText, Loader2, Globe } from "lucide-react";
import { useAppStore } from "../store/useAppStore";
import { cn } from "../lib/utils";

type JdTab = "text" | "url" | "image";

const TABS: { key: JdTab; label: string; icon: React.ReactNode }[] = [
  { key: "text", label: "文本粘贴", icon: <FileText size={14} /> },
  { key: "url", label: "URL 链接", icon: <Globe size={14} /> },
  { key: "image", label: "图片上传", icon: <Image size={14} /> },
];

export default function JobInput() {
  const { jobDescription, setJobDescription, setError } = useAppStore();
  const [tab, setTab] = useState<JdTab>("text");
  const [url, setUrl] = useState("");
  const [fetching, setFetching] = useState(false);
  const [ocrLoading, setOcrLoading] = useState(false);

  async function handleUrlFetch() {
    if (!url.trim()) return;
    setFetching(true);
    try {
      // 使用一个 CORS 代理或直接 fetch（受 CORS 限制时提示）
      const resp = await fetch(url.trim());
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      const html = await resp.text();
      // 简单提取文本：去除标签，取 body 内容
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
        .replace(/<[^>]+>/g, "\n")
        .replace(/&nbsp;/g, " ")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&amp;/g, "&")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
      if (text.length < 50) throw new Error("未能提取到足够的文字内容，建议手动粘贴");
      setJobDescription(text.slice(0, 8000));
    } catch (e: any) {
      if (e.message.includes("Failed to fetch") || e.message.includes("CORS")) {
        setError("URL 抓取受 CORS 限制，建议手动复制 JD 内容粘贴");
      } else {
        setError(`URL 抓取失败: ${e.message}`);
      }
    } finally {
      setFetching(false);
    }
  }

  async function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setOcrLoading(true);
    try {
      const Tesseract = await import("tesseract.js");
      const imageUrl = URL.createObjectURL(file);
      const result = await Tesseract.recognize(imageUrl, "chi_sim+eng");
      URL.revokeObjectURL(imageUrl);
      const text = result.data.text.trim();
      if (text.length < 10) throw new Error("图片中未识别到文字");
      setJobDescription(text);
    } catch (e: any) {
      setError(`图片识别失败: ${e.message}`);
    } finally {
      setOcrLoading(false);
    }
  }

  return (
    <div className="rounded-xl border bg-card p-4">
      {/* Tabs */}
      <div className="flex gap-1 bg-muted rounded-lg p-0.5 mb-3">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md text-xs font-medium transition-all",
              tab === t.key
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "text" && (
        <textarea
          value={jobDescription}
          onChange={(e) => setJobDescription(e.target.value)}
          placeholder="在此粘贴岗位 JD 内容..."
          rows={8}
          className="w-full rounded-lg border bg-background px-3 py-2 text-sm resize-y focus:outline-none focus:ring-2 focus:ring-ring min-h-[160px]"
        />
      )}

      {tab === "url" && (
        <div className="space-y-3">
          <div className="flex gap-2">
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="粘贴招聘页面 URL..."
              className="flex-1 rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              onKeyDown={(e) => e.key === "Enter" && handleUrlFetch()}
            />
            <button
              onClick={handleUrlFetch}
              disabled={fetching || !url.trim()}
              className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 disabled:opacity-50 transition-opacity flex items-center gap-1.5"
            >
              {fetching && <Loader2 size={14} className="animate-spin" />}
              抓取
            </button>
          </div>
          {jobDescription && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {jobDescription.slice(0, 500)}
              {jobDescription.length > 500 && "..."}
            </div>
          )}
        </div>
      )}

      {tab === "image" && (
        <div className="space-y-3">
          <label className="flex flex-col items-center gap-2 p-6 rounded-lg border-2 border-dashed border-muted-foreground/25 hover:border-primary/50 cursor-pointer transition-colors">
            <Image size={24} className="text-muted-foreground" />
            <span className="text-sm text-muted-foreground">点击上传 JD 截图</span>
            <input
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
          {ocrLoading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 size={14} className="animate-spin" />
              正在识别图片文字...
            </div>
          )}
          {jobDescription && (
            <div className="text-xs text-muted-foreground bg-muted rounded-lg p-3 max-h-32 overflow-y-auto whitespace-pre-wrap">
              {jobDescription.slice(0, 500)}
              {jobDescription.length > 500 && "..."}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
