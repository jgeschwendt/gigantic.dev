# gigantic.dev

Joshua Geschwendt's project home: one domain in front of every project's docs.

- A static landing page in `public/`, served by Vercel — no framework, no build.
- Each Pages-backed project is proxied, not linked out: `gigantic.dev/<name>/` is
  `jgeschwendt.github.io/<name>/`, rewritten at Vercel's edge.
- Every page shares jgeschwendt/ui's `ui.css`, so the proxied docs and the landing look
  like one site.

```
.
├── public/
│   ├── 404.html        # served for any unmatched path
│   ├── index.html      # the landing: project cards + source list
│   ├── site.css        # page layout only
│   └── ui.css          # byte-synced from jgeschwendt/ui — never edit
├── site.test.ts        # cards ⇔ rewrites
└── vercel.json         # trailingSlash, cleanUrls, one rewrite per proxied project
```

## How proxying works

- `vercel.json` carries one external rewrite per project:
  `/<name>/:path(.*)` → `https://jgeschwendt.github.io/<name>/:path`.
- `:path(.*)`, not `:path*`: Vercel compiles `:path*` to `^/<name>(?:/(…))?$`,
  which never matches `/<name>/` — and with `trailingSlash` every page URL ends in `/`.
- The Pages sites use relative asset hrefs, so a proxied page resolves its
  stylesheet and links under `/<name>/` too.
- `trailingSlash: true` sends `/<name>` to `/<name>/` before the rewrite sees it.

## Adding a project

1. Add an `a.card` linking `/<name>/` to `public/index.html`, alpha-sorted.
2. Add the matching rewrite to `vercel.json`, alpha-sorted.
3. `bun test` — it fails until the cards and the rewrites name the same projects.

A project without a Pages site gets a `.listrow` linking its repo instead, and no rewrite.

## Develop

```sh
mise install && bun install && lefthook install
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
