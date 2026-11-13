import { useCallback, useEffect, useRef, useState } from "react";
import {
  convertFile,
  getWasmProgress,
  getWasmStatus,
  subscribeWasmProgress,
  subscribeWasmStatus,
} from "@/lib/converter-client";
import type { WasmProgress, WasmStatus } from "@/lib/converter-client";
import type { ConversionErrorCode, Format } from "@/lib/wasm";

export type FileStatus = "queued" | "converting" | "done" | "error";

export type QueueItem = {
  id: string;
  file: File;
  status: FileStatus;
  markdown?: string;
  detectedFormat: Format | null;
  usedFormat: Format | null;
  extensionFormat: Format | null;
  errorCode?: ConversionErrorCode;
  errorMessage?: string;
};

export type BatchState = {
  running: boolean;
  total: number;
  completed: number;
  failed: number;
};

const ERROR_MESSAGES: Record<ConversionErrorCode, string> = {
  encrypted: "Password-protected file. Remove the password and try again.",
  unsupported: "No converter for this file (it may be a scanned PDF).",
  malformed: "File is broken or empty.",
  resourceLimit: "Too large or complex for in-browser conversion.",
  missingPart: "Missing required content.",
  needsOcr:
    "Scanned or image-only PDF. OCR isn't available in this in-browser converter.",
  init: "Couldn't load the in-browser converter. Check your connection and retry.",
  unknown: "Conversion failed unexpectedly. Try again.",
};

export function errorMessageFor(code: ConversionErrorCode): string {
  return ERROR_MESSAGES[code] ?? ERROR_MESSAGES.unknown;
}

function dedupeKey(file: File): string {
  // Same name and size is not enough: two exports can collide.
  return `${file.name}|${file.size}|${file.lastModified}`;
}

const EMPTY_BATCH: BatchState = {
  running: false,
  total: 0,
  completed: 0,
  failed: 0,
};

export function useConverter() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [batch, setBatch] = useState<BatchState>(EMPTY_BATCH);
  const [wasmStatus, setWasmStatus] = useState<WasmStatus>(getWasmStatus());
  const [wasmProgress, setWasmProgress] =
    useState<WasmProgress | null>(getWasmProgress());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const runningRef = useRef(false);
  const pendingRef = useRef<QueueItem[]>([]);

  useEffect(() => subscribeWasmStatus(setWasmStatus), []);
  useEffect(() => subscribeWasmProgress(setWasmProgress), []);

  const setItem = useCallback((id: string, patch: Partial<QueueItem>) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  }, []);

  const drainQueue = useCallback(async () => {
    if (runningRef.current) {
      return;
    }
    runningRef.current = true;

    try {
      while (pendingRef.current.length > 0) {
        const item = pendingRef.current.shift();
        if (!item) {
          break;
        }

        // Skip files removed from the queue while they waited.
        if (!itemsRef.current.some((candidate) => candidate.id === item.id)) {
          continue;
        }

        setItem(item.id, { status: "converting" });

        let outcome;
        try {
          const bytes = new Uint8Array(await item.file.arrayBuffer());
          outcome = await convertFile(bytes, item.file.name);
        } catch (error) {
          outcome = {
            ok: false as const,
            code: "unknown" as const,
            message: error instanceof Error ? error.message : String(error),
          };
        }

        if (outcome.ok) {
          setItem(item.id, {
            status: "done",
            markdown: outcome.markdown,
            detectedFormat: outcome.detectedFormat,
            usedFormat: outcome.usedFormat,
            extensionFormat: outcome.extensionFormat,
            errorCode: undefined,
            errorMessage: undefined,
          });
          setBatch((prev) => ({
            ...prev,
            completed: prev.completed + 1,
          }));
          setSelectedId((current) =>
            current && itemsRef.current.some((entry) => entry.id === current)
              ? current
              : item.id,
          );
        } else {
          if (outcome.code === "init") {
            console.error("Converter failed to start:", outcome.message);
          }
          setItem(item.id, {
            status: "error",
            markdown: undefined,
            errorCode: outcome.code,
            errorMessage:
              outcome.code === "init" && outcome.message
                ? `Couldn't load the in-browser converter: ${outcome.message}`
                : errorMessageFor(outcome.code),
          });
          setBatch((prev) => ({
            ...prev,
            completed: prev.completed + 1,
            failed: prev.failed + 1,
          }));
        }
      }
    } finally {
      runningRef.current = false;
      setBatch((prev) => ({ ...prev, running: false }));
    }
  }, [setItem]);

  const enqueue = useCallback(
    (targets: QueueItem[]) => {
      if (targets.length === 0) {
        return;
      }
      pendingRef.current.push(...targets);
      setBatch((prev) =>
        prev.running
          ? { ...prev, total: prev.total + targets.length }
          : {
              running: true,
              total: targets.length,
              completed: 0,
              failed: 0,
            },
      );
      void drainQueue();
    },
    [drainQueue],
  );

  const addFiles = useCallback(
    (files: File[]): number => {
      const existing = new Set(
        itemsRef.current.map((item) => dedupeKey(item.file)),
      );
      const additions: QueueItem[] = files
        .filter((file) => !existing.has(dedupeKey(file)))
        .map((file) => ({
          id: crypto.randomUUID(),
          file,
          status: "queued" as const,
          detectedFormat: null,
          usedFormat: null,
          extensionFormat: null,
        }));

      if (additions.length === 0) {
        return 0;
      }

      const next = [...itemsRef.current, ...additions];
      itemsRef.current = next;
      setItems(next);
      enqueue(additions);
      return additions.length;
    },
    [enqueue],
  );

  const removeItem = useCallback((id: string) => {
    const next = itemsRef.current.filter((item) => item.id !== id);
    itemsRef.current = next;
    pendingRef.current = pendingRef.current.filter((item) => item.id !== id);
    setItems(next);
    setSelectedId((current) => {
      if (current !== id) {
        return current;
      }
      return next.find((item) => item.status === "done")?.id ?? null;
    });
  }, []);

  const clear = useCallback(() => {
    if (runningRef.current) {
      return;
    }
    pendingRef.current = [];
    itemsRef.current = [];
    setItems([]);
    setSelectedId(null);
    setBatch(EMPTY_BATCH);
  }, []);

  const requeue = useCallback(
    (id: string) => {
      const target = itemsRef.current.find((item) => item.id === id);
      if (!target) {
        return;
      }
      if (target.status === "converting" || target.status === "queued") {
        // Already being worked on; nothing to requeue.
        return;
      }
      setItem(id, {
        status: "queued",
        markdown: undefined,
        errorCode: undefined,
        errorMessage: undefined,
      });
      enqueue([{ ...target, status: "queued" }]);
    },
    [enqueue, setItem],
  );

  const selectItem = useCallback((id: string) => {
    setSelectedId(id);
  }, []);

  const selectedItem =
    items.find((item) => item.id === selectedId && item.status === "done") ??
    items.find((item) => item.status === "done") ??
    null;

  return {
    items,
    batch,
    wasmStatus,
    wasmProgress,
    selectedId: selectedItem?.id ?? null,
    selectedItem,
    addFiles,
    removeItem,
    clear,
    requeue,
    selectItem,
  };
}
