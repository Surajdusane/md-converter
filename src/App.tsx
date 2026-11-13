import { useEffect, useRef } from "react";
import { ArrowDownToLineIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress, ProgressIndicator, ProgressTrack } from "@/components/ui/progress";
import { toastManager } from "@/components/ui/toast";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Dropzone } from "@/components/converter/dropzone";
import { FileItem } from "@/components/converter/file-item";
import { OutputPanel } from "@/components/converter/output-panel";
import { FormatsSection } from "@/components/sections/formats";
import { FeaturesSection } from "@/components/sections/features";
import { FaqSection } from "@/components/sections/faq";
import { useConverter } from "@/hooks/use-converter";
import { copyText, downloadMarkdown, downloadMarkdownZip } from "@/lib/download";

export function App() {
  const {
    items,
    batch,
    wasmStatus,
    wasmProgress,
    selectedItem,
    addFiles,
    removeItem,
    clear,
    requeue,
    selectItem,
  } = useConverter();

  const doneItems = items.filter(
    (item) => item.status === "done" && item.markdown,
  );

  const wasmPercent =
    wasmProgress && wasmProgress.total > 0
      ? Math.min(
          100,
          Math.max(1, Math.round((wasmProgress.loaded / wasmProgress.total) * 100)),
        )
      : null;

  const prevCountRef = useRef(0);
  useEffect(() => {
    if (items.length > prevCountRef.current) {
      document
        .getElementById("workspace")
        ?.scrollIntoView({ block: "start" });
    }
    prevCountRef.current = items.length;
  }, [items.length]);

  const wasRunningRef = useRef(false);
  useEffect(() => {
    if (wasRunningRef.current && !batch.running && batch.total > 0) {
      if (batch.failed > 0) {
        toastManager.add({
          title: `${batch.failed} ${batch.failed === 1 ? "file" : "files"} couldn't be converted`,
          description: "Check the cards for details.",
          type: "warning",
        });
      } else {
        toastManager.add({
          title: `Converted ${batch.completed} ${batch.completed === 1 ? "file" : "files"}`,
          type: "success",
        });
      }
    }
    wasRunningRef.current = batch.running;
  }, [batch]);

  const handleCopy = async (markdown: string) => {
    try {
      await copyText(markdown);
      toastManager.add({
        title: "Copied to clipboard",
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Couldn't copy",
        description: "Select the text manually instead.",
        type: "error",
      });
    }
  };

  const handleDownloadZip = async () => {
    try {
      await downloadMarkdownZip(
        doneItems.map((item) => ({
          name: item.file.name,
          markdown: item.markdown ?? "",
        })),
      );
      toastManager.add({
        title: "Downloaded .zip",
        description: `${doneItems.length} markdown files bundled.`,
        type: "success",
      });
    } catch {
      toastManager.add({
        title: "Couldn't build the .zip",
        description: "Download the files individually instead.",
        type: "error",
      });
    }
  };

  return (
    <div className="min-h-svh bg-background text-foreground">
      <Navbar />
      <main>
        <section className="mx-auto w-full max-w-6xl px-4 pt-10 pb-6 sm:px-6 md:pt-16">
          <div className="mb-8">
            <h1 className="font-heading text-3xl font-semibold tracking-tight md:text-5xl">
              Drop documents.
              <br />
              Get markdown.
            </h1>
            <p className="mt-3 max-w-xl text-muted-foreground">
              Word, PowerPoint, Excel, PDF, and more - converted in your
              browser. Batch files in, markdown out.
            </p>
          </div>

          <Dropzone onFiles={addFiles} />

          {items.length > 0 && (
            <div
              className="mt-6 grid scroll-mt-20 gap-6 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]"
              id="workspace"
            >
              <div className="min-w-0 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-sm text-muted-foreground">
                    {items.length} {items.length === 1 ? "file" : "files"}
                    {batch.completed > 0 && !batch.running
                      ? ` · ${batch.completed - batch.failed} converted`
                      : ""}
                    {batch.failed > 0 && !batch.running
                      ? ` · ${batch.failed} failed`
                      : ""}
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {doneItems.length >= 2 && (
                      <Button
                        onClick={() => void handleDownloadZip()}
                        size="sm"
                        variant="outline"
                      >
                        <ArrowDownToLineIcon />
                        Download .zip
                      </Button>
                    )}
                    <Button
                      disabled={batch.running}
                      onClick={clear}
                      size="sm"
                      variant="ghost"
                    >
                      <Trash2Icon />
                      Clear
                    </Button>
                  </div>
                </div>

                {wasmStatus === "loading" && (
                  <Progress
                    aria-label="Loading converter"
                    className="gap-1.5"
                    value={wasmPercent}
                  >
                    <ProgressTrack>
                      <ProgressIndicator
                        className={wasmPercent === null ? "w-1/3 animate-pulse" : ""}
                      />
                    </ProgressTrack>
                    <p className="text-xs text-muted-foreground">
                      {wasmPercent === null
                        ? "Loading the converter (one-time download, then cached)…"
                        : `Loading the converter… ${wasmPercent}% (one-time download, then cached)`}
                    </p>
                  </Progress>
                )}

                {batch.running && (
                  <Progress
                    aria-label="Conversion progress"
                    className="gap-1.5"
                    value={
                      batch.total > 0
                        ? Math.round((batch.completed / batch.total) * 100)
                        : 0
                    }
                  >
                    <ProgressTrack>
                      <ProgressIndicator />
                    </ProgressTrack>
                    <p className="text-xs text-muted-foreground">
                      {batch.completed} of {batch.total} converted
                      {batch.failed > 0
                        ? ` · ${batch.failed} failed`
                        : ""}
                    </p>
                  </Progress>
                )}

                <div className="space-y-2">
                  {items.map((item) => (
                    <FileItem
                      item={item}
                      key={item.id}
                      onDownload={(queueItem) =>
                        downloadMarkdown(
                          queueItem.file.name,
                          queueItem.markdown ?? "",
                        )
                      }
                      onRemove={removeItem}
                      onRetry={requeue}
                      onSelect={selectItem}
                      selected={item.id === selectedItem?.id}
                    />
                  ))}
                </div>
              </div>

              <div className="min-w-0 lg:sticky lg:top-16 lg:self-start">
                <OutputPanel
                  item={selectedItem}
                  onCopy={(markdown) => void handleCopy(markdown)}
                  onDownload={(queueItem) =>
                    downloadMarkdown(
                      queueItem.file.name,
                      queueItem.markdown ?? "",
                    )
                  }
                />
              </div>
            </div>
          )}
        </section>

        <FormatsSection />
        <FeaturesSection />
        <FaqSection />
      </main>
      <Footer />
    </div>
  );
}

export default App