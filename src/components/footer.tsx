export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto flex w-full max-w-6xl flex-col items-start justify-between gap-3 px-4 py-8 sm:flex-row sm:items-center sm:px-6">
        <p className="text-sm text-muted-foreground">
          Doc → Markdown · conversions happen locally in your browser. Your
          files are not uploaded, stored, or shared.
        </p>
        <p className="font-mono text-xs text-muted-foreground/70">
          .md in, .md out - nothing else leaves this tab
        </p>
      </div>
    </footer>
  );
}