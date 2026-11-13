import {
  formatFromBytes,
  formatFromPath,
  initSync,
  toMarkdownBytes,
} from "@firecrawl/anydoc-wasm";
import wasmUrl from "@firecrawl/anydoc-wasm/anydoc_wasm_bg.wasm?url";
import type {
  ConversionErrorCode,
  Format,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/wasm";

/**
 * We run conversions in a dedicated worker so the 6.7 MB WebAssembly module
 * never touches the main thread. This file is lazily loaded by the app on the
 * first conversion (or an intent hint), and the .wasm itself is a separate,
 * content-hashed asset that Cloudflare caches immutably.
 */
type WorkerScope = {
  postMessage: (message: WorkerResponse) => void;
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null;
};

const scope = self as unknown as WorkerScope;

let readyPromise: Promise<void> | null = null;

function fail(error: unknown): { code: ConversionErrorCode; message: string } {
  if (error instanceof Error) {
    const code = (error as Error & { code?: unknown }).code;
    if (typeof code === "string") {
      return { code: code as ConversionErrorCode, message: error.message };
    }
    return { code: "unknown", message: error.message };
  }
  return { code: "unknown", message: String(error) };
}

async function downloadWasm(): Promise<Uint8Array> {
  const response = await fetch(wasmUrl, {
    credentials: "same-origin",
    // The asset name contains a content hash, so a cached copy is always valid.
    cache: "default",
  });

  if (!response.ok) {
    throw new Error(
      `Could not download the converter (HTTP ${response.status}).`,
    );
  }

  const declared = Number(response.headers.get("content-length") ?? 0);
  if (!response.body || !Number.isFinite(declared) || declared <= 0) {
    return new Uint8Array(await response.arrayBuffer());
  }

  const reader = response.body.getReader();
  const bytes = new Uint8Array(declared);
  let loaded = 0;
  let lastReported = 0;
  const reportEvery = Math.max(declared / 50, 65536);

  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    // A misreported length would otherwise silently truncate the module.
    if (loaded + value.byteLength > bytes.byteLength) {
      const grown = new Uint8Array(loaded + value.byteLength);
      grown.set(bytes.subarray(0, loaded));
      return concat(grown, loaded, value, reader, declared);
    }
    bytes.set(value, loaded);
    loaded += value.byteLength;
    if (loaded - lastReported >= reportEvery) {
      lastReported = loaded;
      scope.postMessage({ type: "progress", loaded, total: declared });
    }
  }

  scope.postMessage({ type: "progress", loaded, total: loaded });
  return loaded === bytes.byteLength ? bytes : bytes.subarray(0, loaded);
}

async function concat(
  buffer: Uint8Array,
  offset: number,
  first: Uint8Array,
  reader: ReadableStreamDefaultReader<Uint8Array>,
  total: number,
): Promise<Uint8Array> {
  const chunks: Uint8Array[] = [buffer.subarray(0, offset), first];
  let loaded = offset + first.byteLength;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    chunks.push(value);
    loaded += value.byteLength;
    scope.postMessage({ type: "progress", loaded, total: Math.max(total, loaded) });
  }
  const bytes = new Uint8Array(loaded);
  let written = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, written);
    written += chunk.byteLength;
  }
  return bytes;
}

async function loadConverter(): Promise<void> {
  scope.postMessage({ type: "status", status: "loading" });

  try {
    const bytes = await downloadWasm();
    // Compile asynchronously, then instantiate synchronously: the worker is
    // dedicated to this, so blocking it for a few milliseconds is free.
    const module = await WebAssembly.compile(bytes);
    initSync({ module });
    scope.postMessage({ type: "status", status: "ready" });
  } catch (error) {
    // Allow a later retry to start from scratch instead of caching failure.
    readyPromise = null;
    scope.postMessage({ type: "status", status: "idle" });
    throw error;
  }
}

function ensureConverter(): Promise<void> {
  readyPromise ??= loadConverter();
  return readyPromise;
}

function safeDetect(bytes: Uint8Array): Format | null {
  try {
    return formatFromBytes(bytes) ?? null;
  } catch {
    // Detection is best-effort; the extension is a fine fallback.
    return null;
  }
}

function safeExtension(name: string): Format | null {
  try {
    return formatFromPath(name) ?? null;
  } catch {
    return null;
  }
}

async function convert(request: Extract<WorkerRequest, { type: "convert" }>) {
  const { id, name, bytes } = request;

  try {
    await ensureConverter();
  } catch (error) {
    const problem = fail(error);
    scope.postMessage({
      type: "result",
      id,
      ok: false,
      code: "init",
      message: problem.message,
    });
    return;
  }

  const detectedFormat = safeDetect(bytes);
  const extensionFormat = safeExtension(name);
  const usedFormat = detectedFormat ?? extensionFormat;

  try {
    // `null` lets anydoc detect from content when we have no name to go on.
    const markdown = toMarkdownBytes(bytes, usedFormat ?? null);
    scope.postMessage({
      type: "result",
      id,
      ok: true,
      markdown,
      detectedFormat,
      usedFormat,
      extensionFormat,
    });
  } catch (error) {
    const problem = fail(error);
    scope.postMessage({
      type: "result",
      id,
      ok: false,
      code: problem.code,
      message: problem.message,
    });
  }
}

scope.onmessage = (event) => {
  const request = event.data;

  if (request.type === "warmup") {
    void ensureConverter().catch(() => {
      // Status already reported; the next real conversion reports the error.
    });
    return;
  }

  void convert(request);
};
