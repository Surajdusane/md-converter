import { useCallback, useEffect, useRef, useState } from "react";
import { ClipboardPasteIcon, FileUpIcon, FolderOpenIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { toastManager } from "@/components/ui/toast";
import { prewarmConverter } from "@/lib/converter-client";
import { SAMPLES } from "@/lib/samples";
import { ACCEPT_ATTRIBUTE } from "@/lib/wasm";
import { cn } from "@/lib/utils";

type DropzoneProps = {
  onFiles: (files: File[]) => void;
};

export function Dropzone({ onFiles }: DropzoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dragDepth = useRef(0);
  const [dragging, setDragging] = useState(false);

  const handleFiles = useCallback(
    (fileList: FileList | File[]) => {
      const files = Array.from(fileList).filter((file) => file.size > 0);
      if (files.length > 0) {
        onFiles(files);
      }
    },
    [onFiles],
  );

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = Array.from(event.clipboardData?.files ?? []).filter(
        (file) => file.size > 0,
      );
      if (files.length > 0) {
        onFiles(files);
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => {
      window.removeEventListener("paste", handlePaste);
    };
  }, [onFiles]);

  return (
    <div
      className={cn(
        "relative flex min-h-72 flex-col items-center justify-center rounded-2xl border-2 border-dashed bg-card/40 px-6 py-10 text-center transition-colors sm:min-h-80",
        dragging
          ? "border-primary bg-accent/50"
          : "border-input hover:border-muted-foreground/50",
      )}
      onDragEnter={(event) => {
        event.preventDefault();
        dragDepth.current += 1;
        setDragging(true);
        // The WASM download is the slow part; start it while the user is still
        // dragging so the conversion begins the moment they drop.
        prewarmConverter();
      }}
      onDragOver={(event) => {
        event.preventDefault();
      }}
      onDragLeave={(event) => {
        event.preventDefault();
        dragDepth.current -= 1;
        if (dragDepth.current <= 0) {
          dragDepth.current = 0;
          setDragging(false);
        }
      }}
      onDrop={(event) => {
        event.preventDefault();
        dragDepth.current = 0;
        setDragging(false);
        handleFiles(event.dataTransfer.files);
      }}
    >
      <input
        ref={inputRef}
        className="sr-only"
        type="file"
        multiple
        accept={ACCEPT_ATTRIBUTE}
        onChange={(event) => {
          handleFiles(event.target.files ?? []);
          event.target.value = "";
        }}
      />

      <Empty className="gap-5 py-0 md:py-0">
        <EmptyMedia variant="icon" className="mb-4">
          <FileUpIcon className="size-5" />
        </EmptyMedia>
        <EmptyHeader>
          <EmptyTitle className="text-2xl">Drop documents</EmptyTitle>
          <EmptyDescription className="mt-1 max-w-sm">
            Word, PowerPoint, Excel, PDF, and more - converted to markdown
            right here. Files never leave this page.
          </EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <Button
              onClick={() => {
                prewarmConverter();
                inputRef.current?.click();
              }}
              variant="outline"
            >
              <FolderOpenIcon />
              Browse files
            </Button>
            <Button
              onClick={() => {
                toastManager.add({
                  title: "Paste a file",
                  description: "Copy a file, then press Ctrl+V (⌘V) anywhere on this page.",
                  type: "info",
                });
              }}
              variant="ghost"
            >
              <ClipboardPasteIcon />
              Paste from clipboard
            </Button>
          </div>
          <p className="text-muted-foreground">
            No files handy? Try a sample:{" "}
            {SAMPLES.map((sample, index) => (
              <span key={sample.name}>
                <button
                  className="cursor-pointer text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground"
                  onClick={() => onFiles([sample.file()])}
                  type="button"
                >
                  {sample.label}
                </button>
                {index < SAMPLES.length - 1 ? " · " : ""}
              </span>
            ))}
          </p>
        </EmptyContent>
      </Empty>
    </div>
  );
}