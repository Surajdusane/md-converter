import type { ConvertErrorCode, Format } from "@/lib/wasm";
import type { WorkerResponse } from "@/workers/converter.worker";

export type WasmStatus = "idle" | "loading" | "ready";

export type ConvertResult =
  | {
      ok: true;
      markdown: string;
      detectedFormat: Format | null;
      usedFormat: Format | null;
      extensionFormat: Format | null;
    }
  | { ok: false; code: ConvertErrorCode; message: string };

let worker: Worker | null = null;
let wasmStatus: WasmStatus = "idle";
let nextId = 1;
const pending = new Map<number, (result: ConvertResult) => void>();
const statusListeners = new Set<(status: WasmStatus) => void>();

function setStatus(status: WasmStatus) {
  wasmStatus = status;
  for (const listener of statusListeners) {
    listener(status);
  }
}

function getWorker(): Worker {
  if (!worker) {
    worker = new Worker(new URL("../workers/converter.worker.ts", import.meta.url), {
      type: "module",
    });
    worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const data = event.data;
      if (data.type === "status") {
        setStatus(data.status);
        return;
      }
      const resolve = pending.get(data.id);
      if (resolve) {
        pending.delete(data.id);
        resolve(data);
      }
    };
  }
  return worker;
}

export function getWasmStatus(): WasmStatus {
  return wasmStatus;
}

export function subscribeWasmStatus(
  listener: (status: WasmStatus) => void,
): () => void {
  statusListeners.add(listener);
  return () => {
    statusListeners.delete(listener);
  };
}

export function convertFile(
  bytes: Uint8Array,
  name: string,
): Promise<ConvertResult> {
  return new Promise((resolve) => {
    const id = nextId++;
    pending.set(id, resolve);
    getWorker().postMessage({ id, bytes, name }, [bytes.buffer]);
  });
}
