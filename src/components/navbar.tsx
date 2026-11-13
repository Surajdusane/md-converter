import { useTheme } from "@/components/theme-provider";
import { Button } from "@/components/ui/button";
import { MoonIcon, SunIcon } from "lucide-react";

export function Navbar() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6">
        <a
          className="flex items-center gap-2.5 font-heading text-sm font-semibold tracking-tight"
          href="#"
        >
          <img src="/logo.png" alt="mdx logo" width="32" height="32" />
          <span>
            Doc <span className="text-muted-foreground">→</span> Markdown
          </span>
        </a>
        <Button
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          onClick={() => setTheme(isDark ? "light" : "dark")}
          size="icon-sm"
          variant="outline"
        >
          {isDark ? <SunIcon /> : <MoonIcon />}
        </Button>
      </div>
    </header>
  );
}