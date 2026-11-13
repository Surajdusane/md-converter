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
