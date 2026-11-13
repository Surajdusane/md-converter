import { lazy, Suspense } from "react";

/**
 * react-markdown + remark-gfm are a meaningful chunk of JS that only matters
 * once a file has actually been converted. Loading them lazily keeps the first
 * paint (and anyone who never converts) at a much smaller payload.
 */
const MarkdownPreview = lazy(() =>
  import("@/components/converter/markdown-preview").then((module) => ({
    default: module.MarkdownPreview,
  })),
);

export function LazyMarkdownPreview({ markdown }: { markdown: string }) {
  return (
    <Suspense
      fallback={
        <div className="space-y-3 p-4" aria-label="Loading preview">
          <div className="h-4 w-1/3 animate-pulse rounded bg-muted" />
          <div className="h-3 w-full animate-pulse rounded bg-muted" />
          <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
        </div>
      }
    >
      <MarkdownPreview markdown={markdown} />
    </Suspense>
  );
}
