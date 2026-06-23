/**
 * 将优化后的简历文本转换为自包含的 HTML 文档（可直接浏览器打开或打印）。
 * 纯客户端生成，完整处理 Markdown 标记，输出干净排版的 HTML。
 */

// ---- HTML 转义 ----
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 对已转义 HTML 的文本应用行内 Markdown 转换。
 * 必须在 escapeHtml() 之后调用。
 */
function formatInline(escaped: string): string {
  let result = escaped;

  // **粗体** / __粗体__
  result = result.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  result = result.replace(/__(.+?)__/g, "<strong>$1</strong>");

  // *斜体* / _斜体_（注意不要和列表符冲突——列表符已在结构层处理掉）
  result = result.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, "<em>$1</em>");
  result = result.replace(/(?<!_)_(?!_)(.+?)(?<!_)_(?!_)/g, "<em>$1</em>");

  // ~~删除线~~
  result = result.replace(/~~(.+?)~~/g, "<del>$1</del>");

  // `行内代码`
  result = result.replace(/`(.+?)`/g, "<code>$1</code>");

  // 将 URL 自动转为链接
  result = result.replace(
    /(https?:\/\/[^\s<>\[\]]+)/g,
    '<a href="$1" target="_blank" rel="noopener">$1</a>'
  );

  return result;
}

/**
 * 判断一行是否为章节标题。
 * 支持：纯文本标题（如 "个人简介"）、Markdown ## 标题、数字+标题（如 "一、工作经历"）
 */
function isSectionHeaderLine(trimmed: string): string | null {
  // 跳过空行
  if (!trimmed) return null;

  // Markdown ## / ### 标题 → 提取标题文本
  const mdHeader = trimmed.match(/^#{1,4}\s+(.+)/);
  if (mdHeader) return mdHeader[1];

  // 中文数字标题：一、xxx / 二. xxx
  const cnNum = trimmed.match(/^[一二三四五六七八九十]+[、.．]\s*(.+)/);
  if (cnNum) return cnNum[1];

  // 英文数字标题：1. xxx / 1、xxx
  const enNum = trimmed.match(/^\d+[、.．)]\s*(.+)/);
  if (enNum) return enNum[1];

  // 已知章节关键词精确匹配
  const exactKeywords = [
    "个人简介", "个人总结", "自我介绍", "自我评价", "求职意向",
    "核心竞争力", "核心能力", "专业技能", "技能特长", "技术栈",
    "工作经历", "工作经验", "工作履历",
    "项目经验", "项目经历", "项目", "项目成果",
    "教育背景", "教育经历", "学历",
    "证书", "获奖", "荣誉", "语言能力", "其他",
    "联系方式", "基本信息",
  ];
  if (exactKeywords.includes(trimmed)) return trimmed;

  // 关键词开头（如 "核心竞争力总结"）
  for (const kw of exactKeywords) {
    if (trimmed.startsWith(kw) && trimmed.length <= kw.length + 6) return trimmed;
  }

  return null;
}

/**
 * 解析简历文本为结构化 HTML 片段。
 */
function parseResumeToHtml(text: string): string {
  const lines = text.split(/\r?\n/);
  const htmlLines: string[] = [];
  let i = 0;

  // ---- 跳过开头空行 ----
  while (i < lines.length && lines[i].trim() === "") i++;

  // ---- 第一非空行 → 姓名 ----
  if (i < lines.length) {
    const name = formatInline(escapeHtml(lines[i].trim()));
    htmlLines.push(`<h1 class="name">${name}</h1>`);
    i++;
  }

  // ---- 跳过空行 ----
  while (i < lines.length && lines[i].trim() === "") i++;

  // ---- 下一行若包含 | 或 电话/邮箱 → 联系方式 ----
  if (i < lines.length) {
    const contactLine = lines[i].trim();
    if (
      contactLine.includes("|") ||
      /电话|邮箱|所在地|手机|地址|Email|email|LinkedIn|GitHub/i.test(contactLine)
    ) {
      const parts = contactLine
        .split("|")
        .map((p) => formatInline(escapeHtml(p.trim())))
        .filter(Boolean);
      htmlLines.push(
        `<div class="contact">${parts.map((p) => `<span>${p}</span>`).join("")}</div>`
      );
      i++;
    }
  }

  // ---- 逐行处理剩余内容 ----
  let inList = false;
  let listType: "ul" | "ol" = "ul";
  let sectionDivOpen = false;

  function closeList(): void {
    if (inList) {
      htmlLines.push(listType === "ol" ? "</ol>" : "</ul>");
      inList = false;
      listType = "ul";
    }
  }

  function closeSectionDiv(): void {
    if (sectionDivOpen) {
      htmlLines.push("</div>");
      sectionDivOpen = false;
    }
  }

  while (i < lines.length) {
    const raw = lines[i];
    const trimmed = raw.trim();

    // 空行 → 关闭列表 + 关闭小节
    if (trimmed === "") {
      closeList();
      closeSectionDiv();
      htmlLines.push('<div class="spacer"></div>');
      i++;
      continue;
    }

    // 水平分隔线
    if (/^[-*_]{3,}\s*$/.test(trimmed) && trimmed.length >= 3) {
      closeList();
      closeSectionDiv();
      htmlLines.push('<hr class="section-divider">');
      i++;
      continue;
    }

    // 章节标题
    const sectionTitle = isSectionHeaderLine(trimmed);
    if (sectionTitle) {
      closeList();
      closeSectionDiv();
      htmlLines.push(
        `<h2 class="section-title">${formatInline(escapeHtml(sectionTitle))}</h2>`
      );
      htmlLines.push('<div class="section-content">');
      sectionDivOpen = true;
      i++;
      continue;
    }

    // 无序列表项：- / * / • 开头
    if (/^[-•▪▸►●○·–—＊]\s/.test(trimmed)) {
      if (!inList || listType !== "ul") {
        closeList();
        htmlLines.push('<ul class="resume-list">');
        inList = true;
        listType = "ul";
      }
      const content = formatInline(escapeHtml(trimmed.replace(/^[-•▪▸►●○·–—＊]\s*/, "")));
      htmlLines.push(`<li>${content}</li>`);
      i++;
      continue;
    }

    // 有序列表项：1. / 1) / 1、
    const olMatch = trimmed.match(/^(\d+)[.)、]\s(.+)/);
    if (olMatch) {
      if (!inList || listType !== "ol") {
        closeList();
        htmlLines.push('<ol class="resume-list resume-list-ol">');
        inList = true;
        listType = "ol";
      }
      const content = formatInline(escapeHtml(olMatch[2]));
      htmlLines.push(`<li>${content}</li>`);
      i++;
      continue;
    }

    // 引用行（少数简历会用 > 标注）
    if (trimmed.startsWith(">")) {
      closeList();
      const quoteContent = trimmed.replace(/^>\s*/, "");
      htmlLines.push(
        `<blockquote class="resume-quote">${formatInline(escapeHtml(quoteContent))}</blockquote>`
      );
      i++;
      continue;
    }

    // 包含 | 的结构化行（职位 | 公司 | 时间）
    if (trimmed.includes("|") && trimmed.split("|").filter(Boolean).length >= 2) {
      closeList();
      const parts = trimmed.split("|").map((p) => formatInline(escapeHtml(p.trim())));
      htmlLines.push(
        `<div class="structured-line"><span class="structured-primary">${parts[0]}</span>${parts
          .slice(1)
          .map((p) => `<span>${p}</span>`)
          .join("")}</div>`
      );
      i++;
      continue;
    }

    // 普通段落文本
    closeList();
    htmlLines.push(`<p class="text-line">${formatInline(escapeHtml(trimmed))}</p>`);
    i++;
  }

  closeList();
  closeSectionDiv();

  return htmlLines.join("\n");
}

/**
 * 生成完整自包含 HTML 文档，直接可用浏览器打开或打印为 PDF。
 */
export function generateResumeHTML(resumeText: string): string {
  const bodyHtml = parseResumeToHtml(resumeText);

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>优化后简历</title>
<style>
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans SC", sans-serif;
    font-size: 14px;
    line-height: 1.8;
    color: #1a1a2e;
    background: #f0f2f5;
    display: flex;
    justify-content: center;
    padding: 40px 20px;
  }

  .resume-container {
    width: 794px;
    min-height: 1123px;
    background: #fff;
    border-radius: 6px;
    box-shadow: 0 2px 24px rgba(0,0,0,.08);
    padding: 56px 64px;
  }

  /* ---- 姓名 ---- */
  .name {
    font-size: 28px;
    font-weight: 700;
    letter-spacing: 2px;
    color: #0f172a;
    text-align: center;
    margin-bottom: 8px;
  }

  /* ---- 联系方式 ---- */
  .contact {
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
    gap: 6px 20px;
    font-size: 13px;
    color: #475569;
    padding-bottom: 18px;
    margin-bottom: 24px;
    border-bottom: 2px solid #e2e8f0;
  }
  .contact span { white-space: nowrap; }
  .contact span:not(:last-child)::after {
    content: "|";
    margin-left: 18px;
    color: #cbd5e1;
  }

  /* ---- 章节标题 ---- */
  .section-title {
    font-size: 16px;
    font-weight: 700;
    color: #1e293b;
    margin-top: 22px;
    margin-bottom: 10px;
    padding-left: 10px;
    border-left: 3px solid #3b82f6;
    letter-spacing: 1px;
  }
  .section-title:first-of-type { margin-top: 0; }

  .section-content { padding-left: 6px; }

  /* ---- 分隔线 ---- */
  .section-divider {
    border: none;
    border-top: 1px dashed #d1d5db;
    margin: 16px 0;
  }

  /* ---- 无序列表 ---- */
  .resume-list {
    list-style: none;
    padding-left: 0;
  }
  .resume-list li {
    position: relative;
    padding-left: 18px;
    margin-bottom: 4px;
    color: #334155;
  }
  .resume-list li::before {
    content: "▸";
    position: absolute;
    left: 0;
    top: 0;
    color: #3b82f6;
    font-size: 11px;
    line-height: 1.8;
  }

  /* ---- 有序列表 ---- */
  .resume-list-ol { counter-reset: resume-ol; }
  .resume-list-ol li { padding-left: 24px; }
  .resume-list-ol li::before {
    counter-increment: resume-ol;
    content: counter(resume-ol) ".";
    color: #3b82f6;
    font-weight: 600;
    font-size: 13px;
    left: 0;
  }

  /* ---- 引用 ---- */
  .resume-quote {
    border-left: 3px solid #93c5fd;
    padding: 6px 14px;
    margin: 8px 0;
    color: #64748b;
    background: #f8fafc;
    border-radius: 0 4px 4px 0;
  }

  /* ---- 结构化行 ---- */
  .structured-line {
    display: flex;
    flex-wrap: wrap;
    align-items: baseline;
    gap: 4px 0;
    margin: 12px 0 6px;
    font-size: 14px;
  }
  .structured-line .structured-primary {
    font-weight: 700;
    color: #0f172a;
  }
  .structured-line span:not(.structured-primary) {
    color: #64748b;
    font-size: 13px;
  }
  .structured-line span:not(.structured-primary):not(:last-child)::after {
    content: "|";
    margin: 0 10px;
    color: #cbd5e1;
  }

  /* ---- 普通文本 ---- */
  .text-line {
    color: #334155;
    margin-bottom: 2px;
  }

  /* ---- 行内格式 ---- */
  strong { color: #0f172a; font-weight: 700; }
  em { font-style: italic; color: #475569; }
  del { text-decoration: line-through; color: #94a3b8; }
  code {
    font-family: "SF Mono", "Fira Code", "Consolas", monospace;
    font-size: 0.9em;
    background: #f1f5f9;
    padding: 1px 5px;
    border-radius: 3px;
    color: #1e293b;
  }
  a { color: #2563eb; text-decoration: none; }
  a:hover { text-decoration: underline; }

  .spacer { height: 4px; }

  /* ---- 打印 ---- */
  @media print {
    body {
      background: #fff;
      padding: 0;
    }
    .resume-container {
      width: 100%;
      min-height: auto;
      box-shadow: none;
      border-radius: 0;
      padding: 40px 48px;
    }
    @page {
      size: A4;
      margin: 0;
    }
  }
</style>
</head>
<body>
<div class="resume-container">
${bodyHtml}
</div>
</body>
</html>`;
}

/**
 * 触发浏览器下载 HTML 文件。
 */
export function downloadResumeHTML(resumeText: string, fileName?: string): void {
  const html = generateResumeHTML(resumeText);
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `优化后_${fileName || "简历"}.html`;
  a.click();
  URL.revokeObjectURL(url);
}
