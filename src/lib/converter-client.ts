import type {
  ConversionErrorCode,
  Format,
  WasmProgress,
  WasmStatus,
  WorkerRequest,
  WorkerResponse,
} from "@/lib/wasm";

export type { WasmProgress, WasmStatus };

export type ConvertResult =
  | {
      ok: true;
      markdown: string;
      detectedFormat: Format | null;
      usedFormat: Format | null;
      extensionFormat: Format | null;
    }
  | { ok: false; code: ConversionErrorCode; message: string };

type Pending = {
  resolve: (result: ConvertResult) => void;
  timer: ReturnType<typeof setTimeout>;
};

/** Conversions should never take this long; if one does, fail it loudly. */
const CONVERSION_TIMEOUT_MS = 5 * 60 * 1000;

let worker: Worker | null = null;
let wasmStatus: WasmStatus = "idle";
let progress: WasmProgress | null = null;
let nextId = 1;

const pending = new Map<number, Pending>();
const statusListeners = new Set<(status: WasmStatus) => void>();
const progressListeners = new Set<(progress: WasmProgress | null) => void>();

function setStatus(status: WasmStatus) {
  if (wasmStatus === status) {
    return;
  }
  wasmStatus = status;
  if (status !== "loading") {
    progress = null;
    for (const listener of progressListeners) {
      listener(null);
    }
  }
  for (const listener of statusListeners) {
    listener(status);
  }
}

function setProgress(next: WasmProgress | null) {
  progress = next;
  for (const listener of progressListeners) {
    listener(next);
  }
}

function settle(id: number, result: ConvertResult) {
  const entry = pending.get(id);
  if (!entry) {
    return;
  }
  pending.delete(id);
  clearTimeout(entry.timer);
  entry.resolve(result);
}

function failEverything(message: string) {
  // Drop the worker so the next attempt starts with a clean slate.
  worker?.terminate();
  worker = null;
  setStatus("idle");
  for (const id of [...pending.keys()]) {
    settle(id, { ok: false, code: "init", message });
  }
}

function handleMessage(event: MessageEvent<WorkerResponse>) {
  const data = event.data;

  switch (data.type) {
    case "status":
      setStatus(data.status);
      return;
    case "progress":
      setProgress({ loaded: data.loaded, total: data.total });
      return;
    case "result":
      if (data.ok) {
        settle(data.id, {
          ok: true,
          markdown: data.markdown,
          detectedFormat: data.detectedFormat,
          usedFormat: data.usedFormat,
          extensionFormat: data.extensionFormat,
        });
      } else {
        settle(data.id, {
          ok: false,
          code: data.code,
          message: data.message,
        });
      }
      return;
  }
}

function getWorker(): Worker {
  if (worker) {
    return worker;
  }

  const created = new Worker(
    new URL("../workers/converter.worker.ts", import.meta.url),
    { type: "module", name: "md-converter" },
  );
  created.onmessage = handleMessage;
  created.onerror = (event) => {
    event.preventDefault();
    failEverything(event.message || "The converter worker crashed.");
  };
  created.onmessageerror = () => {
    failEverything("The converter sent an unreadable message.");
  };
  worker = created;
  return created;
}

function send(request: WorkerRequest, transfer: Transferable[] = []) {
  getWorker().postMessage(request, transfer);
}

export function getWasmStatus(): WasmStatus {
  return wasmStatus;
}

export function getWasmProgress(): WasmProgress | null {
  return progress;
}

export function subscribeWasmStatus(
  listener: (status: WasmStatus) => void,
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function subscribeWasmProgress(
  listener: (progress: WasmProgress | null) => void,
): () => void {
  progressListeners.add(listener);
  return () => {
    progressListeners.delete(listener);
  };
}

/**
 * Start downloading and compiling the WASM before the first file finishes
 * being read. Call it on drag-enter / picker click so the one-time cost hides
 * behind the user's own action instead of delaying the conversion.
 */
export function prewarmConverter(): void {
  if (wasmStatus === "ready" || wasmStatus === "loading") {
    return;
  }
  try {
    send({ type: "warmup" });
  } catch {
    // A failed worker is reported through status/result handling.
  }
}

export function convertFile(bytes: Uint8Array, name: string): Promise<ConvertResult> {
  return new Promise((resolve) => {
    const id = nextId++;
    const timer = setTimeout(() => {
      settle(id, {
        ok: false,
        code: "unknown",
        message: "The conversion timed out.",
      });
    }, CONVERSION_TIMEOUT_MS);

    pending.set(id, { resolve, timer });

    try {
      // Transfer the buffer instead of cloning it: large PDFs stay cheap.
      send({ type: "convert", id, name, bytes }, [bytes.buffer]);
    } catch (error) {
      settle(id, {
        ok: false,
        code: "init",
        message: error instanceof Error ? error.message : String(error),
      });
    }
  });
}
