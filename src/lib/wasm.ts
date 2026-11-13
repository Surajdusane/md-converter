import type { ConvertErrorCode, Format } from "@firecrawl/anydoc-wasm";

export type { ConvertErrorCode, Format };

/**
 * Codes surfaced to the UI. `needsOcr` comes from anydoc; the last two are
 * ours: the converter failed to load, or something unexpected happened.
 */
export type ConversionErrorCode = ConvertErrorCode | "init" | "unknown";

export type WasmStatus = "idle" | "loading" | "ready";

export type WasmProgress = {
  loaded: number;
  total: number;
};

export type ConversionOutcome = {
  markdown: string;
  /** Format read from the file's bytes. null for signature-less formats (CSV). */
  detectedFormat: Format | null;
  /** Format the conversion actually ran with. */
  usedFormat: Format | null;
  /** Format the filename claims. */
  extensionFormat: Format | null;
};

/** Every extension anydoc can read. Container variants map onto a base format. */
export const ACCEPTED_EXTENSIONS = [
  ".doc",
  ".docm",
  ".docx",
  ".odt",
  ".rtf",
  ".epub",
  ".pdf",
  ".ppt",
  ".pps",
  ".pot",
  ".pptm",
  ".pptx",
  ".ppsx",
  ".ppsm",
  ".odp",
  ".xls",
  ".xlsm",
  ".xlsx",
  ".xlsb",
  ".ods",
  ".csv",
] as const;

export const ACCEPT_ATTRIBUTE = ACCEPTED_EXTENSIONS.join(",");

export type WorkerRequest =
  | { type: "warmup" }
  | { type: "convert"; id: number; name: string; bytes: Uint8Array };

export type WorkerResponse =
  | { type: "status"; status: WasmStatus }
  | { type: "progress"; loaded: number; total: number }
  | {
      type: "result";
      id: number;
      ok: true;
      markdown: string;
      detectedFormat: Format | null;
      usedFormat: Format | null;
      extensionFormat: Format | null;
    }
  | {
      type: "result";
      id: number;
      ok: false;
      code: ConversionErrorCode;
      message: string;
    };
