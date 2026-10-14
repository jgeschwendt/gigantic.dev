# gigantic.dev

Static landing (`public/`) plus one Vercel Function, `api/proxy.ts`, that proxies each
project's GitHub Pages site at `/<name>/` and injects the shared rail into its HTML. No
build step; CI deploys through the Vercel CLI.

- **The rail partial `public/rail.html` is the one place to add a project.** Its `/<name>/`
  links are the proxy's allowlist. `index.html` and `404.html` embed the same
  `<nav class="rail">` block byte-identical — edit `rail.html`, then paste the block over
  both (oxfmt ignores `rail.html`; it is stored at in-`<body>` indentation).
- **Add a proxied project:** a `/<name>/` `.listrow` in the rail's docs list, one `a.card`
  in `public/index.html`, and one rewrite `/<name>/:path(.*)` →
  `/api/proxy?project=<name>&path=:path` in `vercel.json`, all alpha-sorted. `bun test`
  fails until rail, cards, rewrites and the rail copies agree.
- **Add a GitHub-only project:** a `.listrow` in the rail's source list and one in the
  landing's; no rewrite.
- **The stylesheets are linked, never copied:** `index.html` and `404.html` link
  `/ui/ui.css` then `/ui/docs.css` (jgeschwendt/ui, proxied, latest) before `page.css`.
  Landing-only layout belongs in `public/page.css`; rail layout in `public/rail.css`, whose
  breakpoint cites docs.css's 900px constant.
- `api/proxy.ts` reads `rail.html` and `404.html` at cold start; `vercel.json`'s
  `functions.includeFiles` ships them — keep the two in step if either moves.
