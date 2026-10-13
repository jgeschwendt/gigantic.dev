# gigantic.dev

Joshua Geschwendt's project home: one domain in front of every project's docs.

- A static landing page in `public/`, served by Vercel — no framework, no build.
- Each Pages-backed project is proxied, not linked out: `gigantic.dev/<name>/` is
  `jgeschwendt.github.io/<name>/`, fetched by a Vercel Function.
- One navigation rail (`public/rail.html`) on every page: the landing, the 404, and
  each proxied page, which gets it injected on the way through.
- Every page shares jgeschwendt/ui's `ui.css`, so the proxied docs and the landing look
  like one site.

```
.
├── api/
│   └── proxy.ts        # fetches a Pages site, injects the rail into HTML
├── public/
│   ├── 404.html        # served for any unmatched path and any upstream 404
│   ├── index.html      # the landing: project cards + source list
│   ├── rail.css        # rail layout and the page offset it needs
│   ├── rail.html       # the rail partial — the one list of projects
│   ├── rail.js         # current-project mark + theme toggle
│   ├── site.css        # landing layout only
│   └── ui.css          # byte-synced from jgeschwendt/ui — never edit
├── site.test.ts        # rail ⇔ cards ⇔ rewrites; the proxy, against a stubbed fetch
└── vercel.json         # trailingSlash, one rewrite per proxied project
```

## How proxying works

- `vercel.json` carries one rewrite per project:
  `/<name>/:path(.*)` → `/api/proxy?project=<name>&path=:path`.
- `:path(.*)`, not `:path*`: Vercel compiles `:path*` to `^/<name>(?:/(…))?$`,
  which never matches `/<name>/` — and with `trailingSlash` every page URL ends in `/`.
- `api/proxy.ts` (Node 24, Web `fetch` export) allows only the rail's `/<name>/`
  links and refuses `..`. It relays status and content-type.
- HTML gets `rail.css` before `</head>` and the rail plus `rail.js` before `</body>`;
  anything else streams through untouched.
- An upstream 404 serves `public/404.html`; Pages redirects are re-homed onto this host.
- Responses carry `s-maxage=600, stale-while-revalidate=86400`; Vercel's CDN keeps
  them and sends browsers a bare `public`.
- The Pages sites use relative asset hrefs, so a proxied page resolves its
  stylesheet and links under `/<name>/` too.
- `trailingSlash: true` sends `/<name>` to `/<name>/` before the rewrite sees it.

## The rail

- `public/rail.html` is the partial; `index.html` and `404.html` carry the same
  `<nav class="rail">` block byte for byte, and `bun test` enforces it.
- oxfmt skips `rail.html`, which is stored at its in-`<body>` indentation so the
  formatted copies match it.
- Desktop (≥ 900px): docked left, the page offset by `padding-inline-start`.
  Below: a fixed top strip, and the panel opens as a native `popover` drawer.
- `rail.js` marks the current project from the first path segment and runs the theme
  toggle, kept in step with a proxied page's own toggle.

## Adding a project

1. Add a `/<name>/` `.listrow` to the rail's docs list in `public/rail.html`, then
   paste the `<nav class="rail">` block over the one in `index.html` and `404.html`.
2. Add an `a.card` linking `/<name>/` to `public/index.html`, alpha-sorted.
3. Add the matching rewrite to `vercel.json`, alpha-sorted.
4. `bun test` — it fails until the rail, the cards and the rewrites agree.

A project without a Pages site goes in the rail's source list and gets a `.listrow` in
the landing's, both linking its repo; no rewrite.

## Develop

```sh
mise install && bun install && hk install --mise --force
bun test
bun run fmt
```

Pushes to `main` deploy to production through `.github/workflows/deploy.yaml`.

## License

Copyright Joshua Geschwendt. Licensed under the
[PolyForm Noncommercial License 1.0.0](https://polyformproject.org/licenses/noncommercial/1.0.0)
— full text in [LICENSE.md](LICENSE.md). Commercial use requires a separate
license from the author.

External contributions are not accepted.
