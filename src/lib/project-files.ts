/**
 * 项目材料文件操作工具
 *
 * 使用 File System Access API 让用户选择一个项目材料文件夹，
 * 支持读取 .docx / .pdf / .txt / .md / .pptx 文件，
 * 在简历优化时作为上下文提供给 AI。
 */

import { getSetting, setSetting, deleteSetting } from "../db/db";
import mammoth from "mammoth";
import * as pdfjsLib from "pdfjs-dist";
import JSZip from "jszip";

// ====== 类型 ======

export interface ParsedFile {
  name: string;
  content: string;
}

// ====== pdfjs worker ======

pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/6.0.227/pdf.worker.min.mjs";

// ====== 浏览器兼容检测 ======

export function isFileSystemAccessSupported(): boolean {
  return "showDirectoryPicker" in window;
}

// ====== 持久化 ======

const SETTINGS_KEY = "projectFolderHandle";

/** 将目录句柄存入 IndexedDB */
export async function saveProjectFolderHandle(
  handle: FileSystemDirectoryHandle
): Promise<void> {
  await setSetting(SETTINGS_KEY, handle);
}

/** 从 IndexedDB 加载目录句柄 */
export async function loadProjectFolderHandle(): Promise<FileSystemDirectoryHandle | null> {
  try {
    const handle = (await getSetting(SETTINGS_KEY)) as
      | FileSystemDirectoryHandle
      | undefined;
    if (!handle) return null;

    // 重新请求权限
    const permission =
      (await handle.queryPermission({ mode: "read" })) === "granted";
    if (!permission) {
      const requested =
        (await handle.requestPermission({ mode: "read" })) === "granted";
      if (!requested) return null;
    }

    return handle;
  } catch {
    // 句柄失效（文件夹被删除/移动），清除存储
    await clearProjectFolderHandle();
    return null;
  }
}

/** 清除已存储的目录句柄 */
export async function clearProjectFolderHandle(): Promise<void> {
  await deleteSetting(SETTINGS_KEY);
}

// ====== 文件解析 ======

/** 根据扩展名选择解析器 */
export async function parseFileByType(file: File): Promise<string> {
  const ext = file.name.split(".").pop()?.toLowerCase() ?? "";

  switch (ext) {
    case "txt":
    case "md":
      return readTextFile(file);

    case "docx":
      return parseDocx(file);

    case "pdf":
      return parsePdf(file);

    case "pptx":
      return parsePptx(file);

    case "ppt":
      return `[跳过: ${file.name} — .ppt 二进制格式不支持，请转换为 .pptx 格式]`;

    default:
      return `[跳过: ${file.name} — 不支持的格式 .${ext}]`;
  }
}

/** 纯文本 / Markdown */
function readTextFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error(`读取 ${file.name} 失败`));
    reader.readAsText(file);
  });
}

/** DOCX → mammoth */
async function parseDocx(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

/** PDF → pdfjs-dist */
async function parsePdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const texts: string[] = [];

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items
      .map((item: any) => item.str ?? "")
      .join(" ");
    texts.push(pageText);
  }

  return texts.join("\n");
}

/** PPTX → JSZip + XML 文本提取 */
async function parsePptx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const zip = await JSZip.loadAsync(arrayBuffer);

    // PPTX 幻灯片文件在 ppt/slides/slide*.xml
    const slideFiles = Object.keys(zip.files).filter(
      (name) =>
        name.startsWith("ppt/slides/slide") && name.endsWith(".xml")
    );

    if (slideFiles.length === 0) {
      return `[${file.name}: 未找到幻灯片内容]`;
    }

    // 按页码排序
    slideFiles.sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)/)?.[1] ?? "0", 10);
      const numB = parseInt(b.match(/slide(\d+)/)?.[1] ?? "0", 10);
      return numA - numB;
    });

    const slideTexts: string[] = [];

    for (const slidePath of slideFiles) {
      const xmlContent = await zip.files[slidePath].async("text");
      // 提取所有 <a:t> 标签中的文本（PPTX 文本节点）
      const textMatches = xmlContent.matchAll(/<a:t[^>]*>([^<]*)<\/a:t>/g);
      const texts: string[] = [];
      for (const match of textMatches) {
        const text = match[1].trim();
        if (text) texts.push(text);
      }
      if (texts.length > 0) {
        slideTexts.push(texts.join("\n"));
      }
    }

    return slideTexts.length > 0
      ? slideTexts.join("\n\n---\n\n")
      : `[${file.name}: 无法提取文本]`;
  } catch (e: any) {
    return `[解析 ${file.name} 失败: ${e.message}]`;
  }
}

// ====== 批量读取 ======

/** 读取文件夹下所有支持的文件 */
export async function readProjectFiles(
  handle: FileSystemDirectoryHandle
): Promise<ParsedFile[]> {
  const results: ParsedFile[] = [];
  const supportedExts = ["txt", "md", "docx", "pdf", "pptx"];

  for await (const [name, entry] of handle.entries()) {
    if (entry.kind !== "file") continue;

    const ext = name.split(".").pop()?.toLowerCase() ?? "";
    if (!supportedExts.includes(ext)) continue;

    try {
      const fileHandle = entry as FileSystemFileHandle;
      const file = await fileHandle.getFile();
      const content = await parseFileByType(file);
      results.push({ name, content });
    } catch (e: any) {
      results.push({ name, content: `[读取 ${name} 失败: ${e.message}]` });
    }
  }

  // 按文件名排序
  results.sort((a, b) => a.name.localeCompare(b.name));
  return results;
}

/** 汇总项目材料为一段文本，用于 AI prompt */
export function formatProjectMaterials(files: ParsedFile[]): string {
  if (files.length === 0) return "";

  return files
    .map((f) => {
      const ext = f.name.split(".").pop()?.toLowerCase();
      const label =
        ext === "pdf"
          ? `📕 ${f.name}`
          : ext === "docx"
            ? `📘 ${f.name}`
            : ext === "pptx"
              ? `📊 ${f.name}`
              : `📄 ${f.name}`;
      return `### ${label}\n\n${f.content}`;
    })
    .join("\n\n");
}
