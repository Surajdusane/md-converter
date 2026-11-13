import init from "@firecrawl/anydoc-wasm";
import {
  formatFromBytes,
  formatFromPath,
  toMarkdownBytes,
} from "@firecrawl/anydoc-wasm";
import type { ConvertErrorCode, Format } from "@firecrawl/anydoc-wasm";

export type { ConvertErrorCode, Format };

let initPromise: Promise<unknown> | null = null;

export function ensureWasm(): Promise<unknown> {
  initPromise ??= init();
  return initPromise;
}

export type ConvertOutcome = {
  markdown: string;
  /** Format read from the file's bytes. null for signature-less formats (CSV). */
  detectedFormat: Format | null;
  /** Format the conversion actually ran with. */
  usedFormat: Format | null;
  /** Format the filename claims. */
  extensionFormat: Format | null;
};

export function convertToMarkdown(
  bytes: Uint8Array,
  name: string,
): ConvertOutcome {
  const detectedFormat = formatFromBytes(bytes) ?? null;
  const extensionFormat = formatFromPath(name) ?? null;
  const usedFormat = detectedFormat ?? extensionFormat;
  const markdown = toMarkdownBytes(bytes, usedFormat);
  return { markdown, detectedFormat, usedFormat, extensionFormat };
}
