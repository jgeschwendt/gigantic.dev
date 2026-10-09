# gigantic.dev

Static landing (`public/`) plus `vercel.json` rewrites that proxy each project's GitHub
Pages site at `/<name>/`. No build step; CI deploys `public/` through the Vercel CLI.

- **Add a proxied project:** one `a.card` linking `/<name>/` in `public/index.html` and one
  rewrite `/<name>/:path(.*)` → `https://jgeschwendt.github.io/<name>/:path` in `vercel.json`,
  both alpha-sorted. `bun test` fails until the two agree.
- **Add a GitHub-only project:** one `.listrow` in the source list; no rewrite.
- **`public/ui.css` is byte-synced from jgeschwendt/ui — never edit it here.** To sync, copy
  ui's `ui.css` over it and bump the sha in the provenance comment in both HTML pages.
  Layout belongs in `public/site.css`.
