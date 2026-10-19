# gigantic.dev

Static landing (`public/`, no framework, no build step) plus one Vercel Function,
`api/proxy.ts`, that proxies each project's GitHub Pages site: `gigantic.dev/<name>/` is
`jgeschwendt.github.io/<name>/`, injected with the shared rail. Every page — landing, 404,
each proxied page — carries the one rail and looks like one site.

## Adding a project

- **Proxied (has a Pages site):** a `/<name>/` `.listrow` in the rail's docs list in
  `public/rail.html`, then paste its `<nav class="rail">` block over the copies in
  `index.html` and `404.html`; one `a.card` linking `/<name>/` in `public/index.html`; one
  rewrite in `vercel.json`; all three alpha-sorted. `bun test` fails until rail,
  cards, rewrites and the rail copies agree.
- **GitHub-only:** a `.listrow` linking its repo in the rail's source list and one in the
  landing's; no rewrite.

## The proxy

- `api/proxy.ts` (Node 24, Web `fetch` export) allows only the rail's `/<name>/` links —
  `rail.html` is the allowlist — and refuses `..`. It relays status and content-type.
- It reads `rail.html` and `404.html` at cold start; `vercel.json`'s
  `functions.includeFiles` ships them — keep the two in step if either moves.
- Caching: `s-maxage=600, stale-while-revalidate=86400`; Vercel's CDN keeps responses and
  sends browsers a bare `public`.
- HTML gets `rail.css` before `</head>` and the rail plus `rail.js` before `</body>`;
  anything else streams through untouched.
- Pages redirects are re-homed onto this host; an upstream 404 serves `public/404.html`.
- The Pages sites use relative asset hrefs, so a proxied page resolves its stylesheet and
  links under `/<name>/`.
- Rewrites: `/<name>/:path(.*)` → `/api/proxy?project=<name>&path=:path`, one per project.
  `:path(.*)`, never `:path*`: Vercel compiles `:path*` to `^/<name>(?:/(…))?$`, which
  never matches `/<name>/`, and `trailingSlash: true` ends every page URL in `/` (it sends
  `/<name>` to `/<name>/` before the rewrite sees it).

## The rail and styles

- `public/rail.html` is the partial; `index.html` and `404.html` embed its
  `<nav class="rail">` block byte for byte, and `bun test` enforces it. oxfmt ignores
  `rail.html`, stored at its in-`<body>` indentation so the formatted copies match.
- Desktop (≥ 900px): docked left, the page offset by `padding-inline-start`. Below: a
  fixed top strip, the panel a native `popover` drawer.
- `rail.js` marks the current project from the first path segment and runs the theme
  toggle, kept in step with a proxied page's own toggle.
- Stylesheets are linked, never copied: `index.html` and `404.html` link `/ui/ui.css` then
  `/ui/docs.css` (jgeschwendt/ui, proxied, latest) before `page.css`. Landing-only layout
  belongs in `public/page.css`; rail layout in `public/rail.css`, whose breakpoint cites
  docs.css's 900px constant.

## Develop

Setup: `mise install && bun install && hk install --mise --force`. Gates: `bun test`
(rail ⇔ cards ⇔ rewrites, and the proxy against a stubbed fetch) and `bun run fmt`. Pushes
to `main` deploy to production through `.github/workflows/deploy.yaml` (fmt check, tests,
then the Vercel CLI).
