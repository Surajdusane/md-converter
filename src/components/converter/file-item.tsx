import {
  CheckIcon,
  DownloadIcon,
  FileQuestionIcon,
  LoaderCircleIcon,
  RefreshCwIcon,
  TriangleAlertIcon,
  XIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipPopup,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { formatMeta } from "@/lib/formats";
import { formatBytes } from "@/lib/download";
import { cn } from "@/lib/utils";
import type { QueueItem } from "@/hooks/use-converter";

const ERROR_LABELS: Record<string, string> = {
  needsOcr: "Needs OCR",
  resourceLimit: "Too large",
  encrypted: "Encrypted",
  malformed: "Broken",
  missingPart: "Incomplete",
  init: "Not loaded",
  unknown: "Failed",
  unsupported: "Unsupported",
};

function errorLabel(code: string | undefined): string {
  if (!code) {
    return "Failed";
  }
  return ERROR_LABELS[code] ?? "Failed";
}

type FileItemProps = {
  item: QueueItem;
  selected: boolean;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
  onDownload: (item: QueueItem) => void;
  onRetry: (id: string) => void;
};

function extensionOf(name: string): string {
  const match = name.match(/\.([^.]+)$/);
  return match?.[1]?.toLowerCase() ?? "";
}

export function FileItem({
  item,
  selected,
  onSelect,
  onRemove,
  onDownload,
  onRetry,
}: FileItemProps) {
  const meta = formatMeta(item.usedFormat);
  const Icon = meta?.icon ?? FileQuestionIcon;
  const mismatched =
    item.detectedFormat !== null &&
    item.detectedFormat !== item.extensionFormat;
  const claimedExtension = extensionOf(item.file.name);

  return (
    <div
      className={cn(
        "group relative flex items-start gap-3 rounded-xl border bg-card p-3 transition-colors",
        selected
          ? "border-primary/60 ring-1 ring-primary/30"
          : "border-border",
        item.status === "done" && "cursor-pointer hover:bg-accent/40",
      )}
      onClick={() => {
        if (item.status === "done") {
          onSelect(item.id);
        }
      }}
    >
      <div className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-foreground [&_svg]:size-4.5">
        <Icon />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium">{item.file.name}</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {formatBytes(item.file.size)}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-1.5">
            {item.usedFormat && (
              <Tooltip>
                <TooltipTrigger
                  render={<Badge variant={mismatched ? "info" : "outline"} />}
                >
                  {item.usedFormat.toUpperCase()}
                </TooltipTrigger>
                <TooltipPopup>
                  {mismatched
                    ? `Detected .${item.detectedFormat} from content - the filename says .${claimedExtension}`
                    : meta
                      ? meta.label
                      : "Format"}
                </TooltipPopup>
              </Tooltip>
            )}
            {item.status === "converting" && (
              <LoaderCircleIcon className="size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        <div className="mt-1.5 flex items-center gap-2">
          {item.status === "queued" && (
            <span className="text-xs text-muted-foreground">Queued</span>
          )}
          {item.status === "converting" && (
            <span className="text-xs text-muted-foreground">Converting…</span>
          )}
          {item.status === "done" && (
            <Badge variant="success" className="gap-1">
              <CheckIcon />
              Done
            </Badge>
          )}
          {item.status === "error" && (
            <Badge variant="warning" className="gap-1">
              <TriangleAlertIcon />
              {errorLabel(item.errorCode)}
            </Badge>
          )}
          {item.status === "done" && (
            <span className="ml-auto text-xs text-muted-foreground">
              {item.markdown?.trim()
                ? `${item.markdown.trim().split(/\s+/).length} words`
                : ""}
            </span>
          )}
        </div>

        {item.status === "error" && item.errorMessage && (
          <p className="mt-1.5 text-xs text-warning-foreground">
            {item.errorMessage}
          </p>
        )}
      </div>

      <div className="flex shrink-0 flex-col gap-1">
        {item.status === "done" && (
          <Button
            aria-label={`Download ${item.file.name} as markdown`}
            onClick={(event) => {
              event.stopPropagation();
              onDownload(item);
            }}
            size="icon-sm"
            variant="ghost"
          >
            <DownloadIcon />
          </Button>
        )}
        {item.status === "error" && (
          <Button
            aria-label={`Retry ${item.file.name}`}
            onClick={(event) => {
              event.stopPropagation();
              onRetry(item.id);
            }}
            size="icon-sm"
            variant="ghost"
          >
            <RefreshCwIcon />
          </Button>
        )}
        <Button
          aria-label={`Remove ${item.file.name}`}
          disabled={item.status === "converting"}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(item.id);
          }}
          size="icon-sm"
          variant="ghost"
        >
          <XIcon />
        </Button>
      </div>
    </div>
  );
}