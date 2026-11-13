import { useCallback, useEffect, useRef, useState } from "react";
import {
  convertFile,
  getWasmStatus,
  subscribeWasmStatus,
} from "@/lib/converter-client";
import type { ConvertErrorCode, Format } from "@/lib/wasm";
import type { WasmStatus } from "@/lib/converter-client";

export type FileStatus = "queued" | "converting" | "done" | "error";

export type QueueItem = {
  id: string;
  file: File;
  status: FileStatus;
  markdown?: string;
  detectedFormat: Format | null;
  usedFormat: Format | null;
  extensionFormat: Format | null;
  errorCode?: ConvertErrorCode;
  errorMessage?: string;
};

export type BatchState = {
  running: boolean;
  total: number;
  completed: number;
  failed: number;
};

const ERROR_MESSAGES: Record<ConvertErrorCode, string> = {
  encrypted: "Password-protected file. Remove the password and try again.",
  unsupported: "No converter for this file (image-only PDF?).",
  malformed: "File is broken or empty.",
  resourceLimit: "Too large or complex for in-browser conversion.",
  missingPart: "Missing required content.",
};

export function errorMessageFor(code: ConvertErrorCode): string {
  return ERROR_MESSAGES[code];
}

function dedupeKey(file: File): string {
  return `${file.name}|${file.size}`;
}

export function useConverter() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [batch, setBatch] = useState<BatchState>({
    running: false,
    total: 0,
    completed: 0,
    failed: 0,
  });
  const [wasmStatus, setWasmStatus] = useState<WasmStatus>(getWasmStatus());
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const itemsRef = useRef(items);
  useEffect(() => {
    itemsRef.current = items;
  }, [items]);
  const runningRef = useRef(false);
  const pendingItemsRef = useRef<QueueItem[]>([]);

  useEffect(() => subscribeWasmStatus(setWasmStatus), []);

  const setItem = useCallback(
    (id: string, patch: Partial<QueueItem>) => {
      setItems((prev) =>
        prev.map((item) => (item.id === id ? { ...item, ...patch } : item)),
      );
    },
    [],
  );

  const drainQueue = async () => {
    while (!runningRef.current && pendingItemsRef.current.length > 0) {
      const targets = pendingItemsRef.current;
      pendingItemsRef.current = [];

      runningRef.current = true;
      setBatch({
        running: true,
        total: targets.length,
        completed: 0,
        failed: 0,
      });

      for (const item of targets) {
        setItem(item.id, { status: "converting" });
        const bytes = new Uint8Array(await item.file.arrayBuffer());
        const result = await convertFile(bytes, item.file.name);
        if (result.ok) {
          setItem(item.id, {
            status: "done",
            markdown: result.markdown,
            detectedFormat: result.detectedFormat,
            usedFormat: result.usedFormat,
            extensionFormat: result.extensionFormat,
          });
          setBatch((prev) => ({ ...prev, completed: prev.completed + 1 }));
          setSelectedId((current) => current ?? item.id);
        } else {
          setItem(item.id, {
            status: "error",
            errorCode: result.code,
            errorMessage: ERROR_MESSAGES[result.code] ?? result.message,
          });
          setBatch((prev) => ({
            ...prev,
            completed: prev.completed + 1,
            failed: prev.failed + 1,
          }));
        }
      }

      runningRef.current = false;
      setBatch((prev) => ({ ...prev, running: false }));
    }
  };

  const enqueue = (targets: QueueItem[]) => {
    pendingItemsRef.current.push(...targets);
    void drainQueue();
  };

  const addFiles = (files: File[]): number => {
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
  };

  const removeItem = useCallback(
    (id: string) => {
      const next = itemsRef.current.filter((item) => item.id !== id);
      setItems(next);
      if (id === selectedId) {
        setSelectedId(next.find((item) => item.status === "done")?.id ?? null);
      }
    },
    [selectedId],
  );

  const clear = useCallback(() => {
    if (runningRef.current) {
      return;
    }
    setItems([]);
    setSelectedId(null);
    setBatch({ running: false, total: 0, completed: 0, failed: 0 });
  }, []);

  const requeue = (id: string) => {
    const target = itemsRef.current.find((item) => item.id === id);
    if (!target) {
      return;
    }
    setItem(id, {
      status: "queued",
      markdown: undefined,
      errorCode: undefined,
      errorMessage: undefined,
    });
    enqueue([target]);
  };

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
    selectedId: selectedItem?.id ?? null,
    selectedItem,
    addFiles,
    removeItem,
    clear,
    requeue,
    selectItem,
  };
}