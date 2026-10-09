// The landing's project cards and vercel.json's rewrites are two lists of the
// same thing; this keeps them one list. Sources are `/<name>/:path(.*)`, not
// `:path*`: with trailingSlash every page URL ends in `/`, and Vercel compiles
// `:path*` strict — `^/<name>(?:/(…))?$` never matches `/<name>/` itself.
import { expect, test } from 'bun:test';

const PAGES = 'https://jgeschwendt.github.io';

type Rewrite = { destination: string; source: string };

const config: { rewrites: Rewrite[] } = await Bun.file(
  new URL('vercel.json', import.meta.url),
).json();

const cardHrefs: string[] = [];
await new HTMLRewriter()
  .on('a.card[href]', {
    element(el) {
      cardHrefs.push(el.getAttribute('href')!);
    },
  })
  .transform(new Response(Bun.file(new URL('public/index.html', import.meta.url))))
  .text();

const proxied = config.rewrites.map(
  ({ source }) => /^\/([a-z0-9.-]+)\/:path\(\.\*\)$/.exec(source)?.[1],
);
const carded = cardHrefs.map((href) => /^\/([a-z0-9.-]+)\/$/.exec(href)?.[1]);

test('every rewrite source is /<name>/:path(.*)', () => {
  expect(proxied).not.toContain(undefined);
});

test('every card href is /<name>/', () => {
  expect(carded).not.toContain(undefined);
});

test('proxied projects equal carded projects, both directions', () => {
  expect(new Set(carded)).toEqual(new Set(proxied));
  expect(carded.length).toBe(new Set(carded).size);
  expect(proxied.length).toBe(new Set(proxied).size);
});

test('every rewrite destination is that project on GitHub Pages', () => {
  for (const { destination, source } of config.rewrites) {
    const name = source.split('/')[1];
    expect(destination).toBe(`${PAGES}/${name}/:path`);
  }
});
