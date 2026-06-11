import { useState, useEffect } from "react";
import { X, Check, Key, Globe, Cpu, Eye, EyeOff } from "lucide-react";
import { useAppStore } from "../store/useAppStore";

export default function ConfigDialog() {
  const { apiConfig, setApiConfig } = useAppStore();
  const [open, setOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [local, setLocal] = useState(apiConfig);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    function handler() {
      setOpen(true);
      setLocal(useAppStore.getState().apiConfig);
    }
    window.addEventListener("open-config", handler);
    return () => window.removeEventListener("open-config", handler);
  }, []);

  useEffect(() => {
    setLocal(apiConfig);
  }, [apiConfig, open]);

  function save() {
    setApiConfig(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  }

  function close() {
    setOpen(false);
    setShowKey(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={close} />
      <div className="relative w-full max-w-md mx-4 bg-card rounded-2xl border shadow-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b">
          <div className="flex items-center gap-2">
            <Key size={18} className="text-primary" />
            <h3 className="font-semibold">API 配置</h3>
          </div>
          <button onClick={close} className="p-1 rounded-md hover:bg-muted">
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <Globe size={12} />
              API Endpoint
            </label>
            <input
              type="text"
              value={local.endpoint}
              onChange={(e) => setLocal({ ...local, endpoint: e.target.value })}
              placeholder="/api/deepseek/v1/chat/completions"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <Key size={12} />
              API Key
            </label>
            <div className="relative">
              <input
                type={showKey ? "text" : "password"}
                value={local.apiKey}
                onChange={(e) => setLocal({ ...local, apiKey: e.target.value })}
                placeholder="sk-..."
                className="w-full rounded-lg border bg-background px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <button
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-muted"
              >
                {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium flex items-center gap-1">
              <Cpu size={12} />
              模型名称
            </label>
            <input
              type="text"
              value={local.model}
              onChange={(e) => setLocal({ ...local, model: e.target.value })}
              placeholder="deepseek-chat"
              className="w-full rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t flex items-center justify-between">
          <p className="text-xs text-muted-foreground">
            配置保存在浏览器本地
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
