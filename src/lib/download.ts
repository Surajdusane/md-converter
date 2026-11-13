import { createElement } from "react";

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.rel = "noopener";
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking synchronously can cancel the download in some browsers.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function markdownFileName(name: string): string {
  return name.replace(/\.[^.]+$/, "") + ".md";
}

function uniqueName(name: string, used: Set<string>): string {
  if (!used.has(name)) {
    used.add(name);
    return name;
  }
  const base = name.replace(/\.md$/i, "");
  let index = 2;
  let candidate = `${base}-${index}.md`;
  while (used.has(candidate)) {
    index += 1;
    candidate = `${base}-${index}.md`;
  }
  used.add(candidate);
  return candidate;
}

export function downloadMarkdown(name: string, markdown: string) {
  triggerDownload(
    new Blob([markdown], { type: "text/markdown;charset=utf-8" }),
    markdownFileName(name),
  );
}

export async function downloadMarkdownZip(
  files: Array<{ name: string; markdown: string }>,
  zipName = "markdown-bundle.zip",
) {
  // JSZip is only needed here, so keep it out of the initial bundle.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const used = new Set<string>();

  for (const file of files) {
    zip.file(uniqueName(markdownFileName(file.name), used), file.markdown);
  }

  const blob = await zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });
  triggerDownload(blob, zipName);
}

export async function copyText(text: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

export type CopyFormat = "plain" | "rich" | "html";

export const COPY_FORMAT_OPTIONS = [
  { value: "plain", label: "Plain text" },
  { value: "rich", label: "Rich text" },
  { value: "html", label: "HTML" },
] as const satisfies ReadonlyArray<{ value: CopyFormat; label: string }>;

export const COPY_FORMAT_LABELS: Record<CopyFormat, string> = {
  plain: "plain text",
  rich: "rich text",
  html: "HTML",
};

async function markdownToHtml(markdown: string): Promise<string> {
  // Keep these out of the initial bundle until a copy actually needs them.
  const [{ default: Markdown }, { default: remarkGfm }, { renderToStaticMarkup }] =
    await Promise.all([
      import("react-markdown"),
      import("remark-gfm"),
      import("react-dom/server"),
    ]);

  return renderToStaticMarkup(
    createElement(Markdown, { remarkPlugins: [remarkGfm] }, markdown),
  );
}

function copyRichTextFallback(html: string): void {
  const container = document.createElement("div");
  container.contentEditable = "true";
  container.innerHTML = html;
  container.style.position = "fixed";
  container.style.left = "-9999px";
  container.style.top = "0";
  container.style.opacity = "0";
  document.body.appendChild(container);

  const selection = window.getSelection();
  const range = document.createRange();
  range.selectNodeContents(container);
  selection?.removeAllRanges();
  selection?.addRange(range);

  const copied = document.execCommand("copy");

  selection?.removeAllRanges();
  container.remove();

  if (!copied) {
    throw new Error("Rich text copy is not supported");
  }
}

async function copyRichText(markdown: string, html: string): Promise<void> {
  if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": new Blob([html], { type: "text/html" }),
          "text/plain": new Blob([markdown], { type: "text/plain" }),
        }),
      ]);
      return;
    } catch {
      // Fall through to the selection-based copy below.
    }
  }

  copyRichTextFallback(html);
}

export async function copyMarkdown(
  markdown: string,
  format: CopyFormat,
): Promise<void> {
  if (format === "plain") {
    await copyText(markdown);
    return;
  }

  const html = await markdownToHtml(markdown);

  if (format === "html") {
    await copyText(html);
    return;
  }

  await copyRichText(markdown, html);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function markdownStats(markdown: string) {
  const words = markdown.trim() ? markdown.trim().split(/\s+/).length : 0;
  const chars = markdown.length;
  const tokens = Math.round(words * 1.3);
  return { words, chars, tokens };
}
