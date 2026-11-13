import { CardFrame } from "@/components/ui/card";
import { ScanSearchIcon, ShieldCheckIcon, ZapIcon } from "lucide-react";

const FEATURES = [
  {
    icon: ShieldCheckIcon,
    title: "Everything stays in your browser",
    body: "Conversion happens locally - files are never uploaded, stored, or seen by a server. Close the tab and nothing was ever sent.",
  },
  {
    icon: ScanSearchIcon,
    title: "Detection reads the file, not the name",
    body: "A .txt that is really a .docx gets caught: the format is detected from the bytes, so the right converter is always picked.",
  },
  {
    icon: ZapIcon,
    title: "Convert a whole batch at once",
    body: "Queue any number of files, convert them together, and download each output individually or as a single .zip.",
  },
] as const;

export function FeaturesSection() {
  return (
    <section className="border-y bg-muted/40">
      <div className="mx-auto w-full max-w-6xl px-4 py-16 sm:px-6 md:py-20">
        <div className="mb-8">
          <h2 className="font-heading text-2xl font-semibold tracking-tight md:text-3xl">
            Why this page
          </h2>
          <p className="mt-2 max-w-xl text-muted-foreground">
            Built for the moment your document needs to become markdown -
            without leaving the browser.
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <CardFrame className="gap-0 p-6" key={title}>
              <span className="mb-4 flex size-9 items-center justify-center rounded-md border bg-muted/60 text-foreground [&_svg]:size-4.5">
                <Icon />
              </span>
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {body}
              </p>
            </CardFrame>
          ))}
        </div>
      </div>
    </section>
  );
}