import { Badge } from "@/components/ui/badge";
import { SUPPORTED_FORMATS } from "@/lib/formats";

export function FormatsSection() {
  return (
    <section className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
      <div className="mb-8">
        <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
          Formats
        </h2>
        <p className="mt-2 max-w-xl text-muted-foreground">
          Documents, presentations, spreadsheets, and more - the converter
          reads the content, not just the extension.
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {SUPPORTED_FORMATS.map(({ format, label, icon: Icon }) => (
          <div
            className="flex items-center gap-3 rounded-xl border bg-card p-4"
            key={format}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-foreground [&_svg]:size-4.5">
              <Icon />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-medium">{label}</p>
              <Badge className="mt-1" variant="outline" size="sm">
                .{format}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}