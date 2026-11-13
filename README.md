# Doc → Markdown

Convert Word, PowerPoint, Excel, PDF, OpenDocument, RTF and EPUB files to
GitHub-Flavored Markdown **in the browser**. Files are read locally, converted
by [anydoc](https://github.com/firecrawl/anydoc) compiled to WebAssembly, and
never uploaded.

- Batch conversions with a queue, retry, copy, download `.md`, and download a
  `.zip` of every converted file.
- Format detection from the file's **bytes**, falling back to the extension for
  signature-less formats such as CSV.
- Everything runs in a dedicated Web Worker, so the UI stays responsive.

## Stack

- React 19 + TypeScript + Vite 8
- Tailwind CSS 4 + shadcn/Base UI components
- `@firecrawl/anydoc-wasm` (conversion)
- `react-markdown` + `remark-gfm` (preview, lazy-loaded)
- `jszip` (batch download, lazy-loaded)

## Development

```bash
bun install        # or npm install
bun run dev        # http://localhost:5173
bun run build      # type-check + production build into dist/
bun run preview    # serve the production build
```

Requires Node 20.11+ (see `.nvmrc`).

## Deploy to Cloudflare Pages

### Option A — Git integration

1. Push the repository to GitHub/GitLab.
2. Cloudflare Dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**.
3. Build settings:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
4. Deploy. `wrangler.jsonc` already declares `pages_build_output_dir`, and
   `public/_headers` ships with the build.

### Option B — Wrangler CLI

```bash
bunx wrangler login
bun run deploy            # builds, then `wrangler pages deploy`
# preview the exact Pages output locally (applies _headers):
bun run pages:dev
```

### Headers and caching

`public/_headers` is copied into `dist/` and gives:

- `/assets/*` → `Cache-Control: public, max-age=31536000, immutable`. Vite
  content-hashes every JS/CSS/font/wasm file, so these never need revalidation.
- The app shell → `max-age=0, must-revalidate`, so a new deploy is picked up
  immediately.
- A strict CSP scoped to the HTML shell, including `'wasm-unsafe-eval'` (needed
  to compile WebAssembly). Workers inherit it, and it is deliberately **not**
  set on hashed assets so a policy change can never be pinned by an immutable
  cache entry.
- `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`,
  `Permissions-Policy`, and `Cross-Origin-Opener-Policy`.

## Why the WASM setup is fast and cheap

The anydoc module is ~6.7 MB uncompressed, so it is treated as the expensive
asset it is:

1. **Lazy** — the worker (and therefore the wasm) is only created when a file
   is actually added. Visitors who never convert download none of it.
2. **Intent prefetch** — dragging a file over the drop zone or opening the file
   picker starts the download early, hiding the one-time cost behind the user's
   own action.
3. **Content-hashed + immutable** — the wasm is emitted as
   `/assets/anydoc_wasm_bg-<hash>.wasm`, cached for a year by Cloudflare and the
   browser. Repeat conversions download zero bytes.
4. **Compressed by Cloudflare** — `application/wasm` is on Cloudflare's
   compression list, so the transfer is roughly 2–3 MB (Zstd on the free plan,
   Brotli on paid plans) instead of 6.7 MB. Pages bandwidth is unmetered.
5. **Streaming progress** — the worker reads the response with a stream and
   reports real progress; when `Content-Length` is unavailable (compressed
   responses), it falls back to an indeterminate bar.
6. **Split bundles** — markdown rendering and JSZip are dynamic imports, and the
   worker is its own chunk, keeping the initial JS small.

## Notes

- Scanned/image-only PDFs need OCR, which anydoc does not do in the browser.
  They surface a `Needs OCR` error instead of failing silently.
- Conversion is sequential: one WASM instance handles the queue, which keeps
  memory bounded on low-end devices.
