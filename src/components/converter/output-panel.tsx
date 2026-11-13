import { useMemo, useState } from "react";
import {
  ArrowDownToLineIcon,
  CopyIcon,
  EyeIcon,
  FileCode2Icon,
  FileTextIcon,
  Maximize2Icon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardFrame } from "@/components/ui/card";
import {
  Dialog,
  DialogClose,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogPanel,
  DialogPopup,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs";
import { MarkdownPreview } from "@/components/converter/markdown-preview";
import { formatMeta } from "@/lib/formats";
import { markdownStats } from "@/lib/download";
import type { QueueItem } from "@/hooks/use-converter";

type OutputPanelProps = {
  item: QueueItem | null;
  onCopy: (markdown: string) => void;
  onDownload: (item: QueueItem) => void;
};

function StatsRow({ markdown }: { markdown: string }) {
  const stats = useMemo(() => markdownStats(markdown), [markdown]);
  return (
    <div className="flex items-center gap-4 font-mono text-xs text-muted-foreground">
      <span>
        {stats.words.toLocaleString()}{" "}
        <span className="text-muted-foreground/70">words</span>
      </span>
      <span>
        {stats.chars.toLocaleString()}{" "}
        <span className="text-muted-foreground/70">chars</span>
      </span>
      <span>
        ~{stats.tokens.toLocaleString()}{" "}
        <span className="text-muted-foreground/70">tokens</span>
      </span>
    </div>
  );
}

function PreviewTabs({
  markdown,
  tab,
  onTabChange,
  scrollClassName,
}: {
  markdown: string;
  tab: string;
  onTabChange: (value: string) => void;
  scrollClassName: string;
}) {
  return (
    <Tabs
      className="flex min-h-0 flex-1 flex-col gap-3"
      onValueChange={onTabChange}
      value={tab}
    >
      <TabsList variant="underline">
        <TabsTab value="preview">
          <EyeIcon />
          Preview
        </TabsTab>
        <TabsTab value="raw">
          <FileTextIcon />
          Raw
        </TabsTab>
      </TabsList>
      <TabsPanel className="min-h-0 flex-1" value="preview">
        <div className={scrollClassName}>
          <MarkdownPreview markdown={markdown} />
        </div>
      </TabsPanel>
      <TabsPanel className="min-h-0 flex-1" value="raw">
        <div className={scrollClassName}>
          <pre className="whitespace-pre-wrap wrap-break-word rounded-lg bg-(--code) p-4 font-mono text-[13px] leading-relaxed text-(--code-foreground)">
            {markdown}
          </pre>
        </div>
      </TabsPanel>
    </Tabs>
  );
}

function ExpandDialog({
  item,
  tab,
  onTabChange,
  onCopy,
  onDownload,
}: {
  item: QueueItem;
  tab: string;
  onTabChange: (value: string) => void;
  onCopy: (markdown: string) => void;
  onDownload: (item: QueueItem) => void;
}) {
  const meta = formatMeta(item.usedFormat);
  const stats = useMemo(
    () => markdownStats(item.markdown ?? ""),
    [item.markdown],
  );

  return (
    <Dialog>
      <DialogTrigger
        render={<Button aria-label="Expand preview" size="icon-sm" variant="ghost" />}
      >
        <Maximize2Icon />
      </DialogTrigger>
      <DialogPopup className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>{item.file.name}</DialogTitle>
          <DialogDescription>
            {meta?.label ?? "Markdown"} · {stats.words.toLocaleString()} words ·{" "}
            {stats.chars.toLocaleString()} chars · ~
            {stats.tokens.toLocaleString()} tokens
          </DialogDescription>
        </DialogHeader>
        <DialogPanel className="flex min-h-0 flex-col">
          <PreviewTabs
            markdown={item.markdown ?? ""}
            onTabChange={onTabChange}
            scrollClassName="max-h-[55svh] min-h-64 overflow-auto rounded-lg bg-(--code)"
            tab={tab}
          />
        </DialogPanel>
        <DialogFooter>
          <DialogClose render={<Button variant="ghost" />}>Close</DialogClose>
          <Button
            onClick={() => onCopy(item.markdown ?? "")}
            size="sm"
            variant="outline"
          >
            <CopyIcon />
            Copy
          </Button>
          <Button onClick={() => onDownload(item)} size="sm">
            <ArrowDownToLineIcon />
            Download .md
          </Button>
        </DialogFooter>
      </DialogPopup>
    </Dialog>
  );
}

export function OutputPanel({ item, onCopy, onDownload }: OutputPanelProps) {
  const [tab, setTab] = useState("preview");
  const meta = formatMeta(item?.usedFormat);

  if (!item?.markdown) {
    return (
      <Card className="min-h-80 justify-center">
        <Empty className="py-16 md:py-24">
          <EmptyMedia variant="icon" className="mb-4">
            <FileCode2Icon className="size-5" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>Your markdown will appear here</EmptyTitle>
            <EmptyDescription className="mt-1">
              Convert a file above, then select it to preview, copy, or
              download the output.
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </Card>
    );
  }

  return (
    <CardFrame className="flex min-h-0 flex-col overflow-hidden p-0 lg:h-[calc(100svh-5.5rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <p className="truncate text-sm font-medium">{item.file.name}</p>
            {meta && (
              <Badge variant="outline" className="shrink-0">
                {meta.short.toUpperCase()}
              </Badge>
            )}
          </div>
          <div className="mt-1.5">
            <StatsRow markdown={item.markdown} />
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => onCopy(item.markdown ?? "")}
            size="sm"
            variant="outline"
          >
            <CopyIcon />
            Copy
          </Button>
          <Button onClick={() => onDownload(item)} size="sm">
            <ArrowDownToLineIcon />
            Download .md
          </Button>
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col p-4 pt-3">
        <Tabs
          className="flex min-h-0 flex-1 flex-col gap-3"
          onValueChange={setTab}
          value={tab}
        >
          <div className="flex items-center justify-between gap-2">
            <TabsList variant="underline">
              <TabsTab value="preview">
                <EyeIcon />
                Preview
              </TabsTab>
              <TabsTab value="raw">
                <FileTextIcon />
                Raw
              </TabsTab>
            </TabsList>
            <ExpandDialog
              item={item}
              onCopy={onCopy}
              onDownload={onDownload}
              onTabChange={setTab}
              tab={tab}
            />
          </div>
          <TabsPanel className="flex min-h-0 flex-1 flex-col" value="preview">
            <div className="min-h-64 flex-1 overflow-y-auto rounded-lg bg-(--code)">
              <MarkdownPreview markdown={item.markdown} />
            </div>
          </TabsPanel>
          <TabsPanel className="flex min-h-0 flex-1 flex-col" value="raw">
            <div className="min-h-64 flex-1 overflow-y-auto rounded-lg bg-(--code) p-4 font-mono text-[13px] leading-relaxed text-(--code-foreground)">
              <pre className="whitespace-pre-wrap wrap-break-word">{item.markdown}</pre>
            </div>
          </TabsPanel>
        </Tabs>
      </div>
    </CardFrame>
  );
}