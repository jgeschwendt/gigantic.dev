// The rail, the landing's cards and vercel.json's rewrites are three lists of the
// same thing; this keeps them one list. Sources are `/<name>/:path(.*)`, not
// `:path*`: with trailingSlash every page URL ends in `/`, and Vercel compiles
// `:path*` strict — `^/<name>(?:/(…))?$` never matches `/<name>/` itself.
import { getTransformedRoutes } from '@vercel/routing-utils';
import { afterEach, describe, expect, test } from 'bun:test';
import proxy, { inject, PROJECTS } from './api/proxy.ts';

type Rewrite = { destination: string; source: string };

const file = (path: string) => Bun.file(new URL(path, import.meta.url));
const config: { rewrites: Rewrite[] } = await file('vercel.json').json();
const rail = await file('public/rail.html').text();

const hrefs = async (path: string, selector: string) => {
  const out: string[] = [];
  await new HTMLRewriter()
    .on(selector, {
      element(el) {
        out.push(el.getAttribute('href')!);
      },
    })
    .transform(new Response(file(path)))
    .text();
  return out;
};

const name = (href: string) => /^\/([a-z0-9.-]+)\/$/.exec(href)?.[1];
const proxied = config.rewrites.map(
  ({ source }) => /^\/([a-z0-9.-]+)\/:path\(\.\*\)$/.exec(source)?.[1],
);
const carded = (await hrefs('public/index.html', 'a.card[href]')).map(name);
const railed = (await hrefs('public/rail.html', 'nav.rail a.listrow[href^="/"]')).map(name);

const NAV = /<nav class="rail"[\s\S]*?\n {4}<\/nav>/;

test('every rewrite source is /<name>/:path(.*)', () => {
  expect(proxied).not.toContain(undefined);
});

test('every card and rail docs link is /<name>/', () => {
  expect(carded).not.toContain(undefined);
  expect(railed).not.toContain(undefined);
});

test('proxied, carded and railed projects agree, both directions', () => {
  expect(new Set(carded)).toEqual(new Set(proxied));
  expect(new Set(railed)).toEqual(new Set(proxied));
  expect(new Set(PROJECTS)).toEqual(new Set(proxied));
  for (const list of [carded, proxied, railed]) expect(list.length).toBe(new Set(list).size);
});

test('rewrites are alpha-sorted', () => {
  expect(proxied).toEqual(proxied.toSorted());
});

test('every rewrite destination is the proxy function for that project', () => {
  for (const { destination, source } of config.rewrites) {
    const name = source.split('/')[1];
    expect(destination).toBe(`/api/proxy?project=${name}&path=:path`);
  }
});

test('proxied pages route to the proxy, never a redirect (cleanUrls 308s every *.html)', () => {
  const { routes } = getTransformedRoutes(config);
  for (const path of ['/stele/', '/sandman/plates/perpetual-shift/project/Main.dc.html']) {
    const hit = routes!.find((r) => 'src' in r && new RegExp(r.src).test(path));
    expect(hit).toMatchObject({ dest: expect.stringMatching(/^\/api\/proxy\?/) });
  }
});

test('rail.html is one <nav class="rail"> block', () => {
  const block = NAV.exec(rail)?.[0];
  expect(block).toBeDefined();
  expect(rail).toBe(`    ${block}\n`);
});

for (const page of ['public/index.html', 'public/404.html']) {
  test(`${page} carries the rail byte-identical to rail.html`, async () => {
    const html = await file(page).text();
    expect(NAV.exec(html)?.[0]).toBe(NAV.exec(rail)![0]);
    expect(html).toContain('<link rel="stylesheet" href="/rail.css" />');
    expect(html).toContain('<script src="/rail.js" defer></script>');
  });
}

describe('inject', () => {
  const page = '<html><head><title>t</title></head><body><p>x</p></body></html>';

  test('stylesheet before </head>, rail and script before </body>', () => {
    expect(inject(page, '<nav class="rail"></nav>\n')).toBe(
      '<html><head><title>t</title><link rel="stylesheet" href="/rail.css" />\n</head>' +
        '<body><p>x</p><nav class="rail"></nav>\n<script src="/rail.js" defer></script>\n' +
        '</body></html>',
    );
  });

  test('changes nothing else', () => {
    const out = inject(page, 'R');
    const stripped = out
      .replace('<link rel="stylesheet" href="/rail.css" />\n', '')
      .replace('R<script src="/rail.js" defer></script>\n', '');
    expect(stripped).toBe(page);
  });

  test('case-insensitive tags; injects once', () => {
    const upper = '<HEAD></HEAD><BODY></BODY>';
    const once = inject(upper, '<nav class="rail"></nav>');
    expect(once).toContain('rail.css" />\n</HEAD>');
    expect(once).toContain(
      '<nav class="rail"></nav><script src="/rail.js" defer></script>\n</BODY>',
    );
    expect(inject(once, '<nav class="rail"></nav>')).toBe(once);
  });

  test('a page without </head> or </body> passes through (ui/ redirect stub)', () => {
    const stub = '<!doctype html>\n<meta http-equiv="refresh" content="0; url=docs/" />\n';
    expect(inject(stub, rail)).toBe(stub);
  });

  test('non-HTML is not its job: css text passes through untouched', () => {
    const css = '.a { color: red }\n';
    expect(inject(css, rail)).toBe(css);
  });
});

describe('proxy handler', () => {
  const real = globalThis.fetch;
  const seen: string[] = [];
  const stub = (res: () => Response) => {
    globalThis.fetch = (async (input: URL | string) => {
      seen.push(String(input));
      return res();
    }) as typeof fetch;
  };
  const get = (q: string, method = 'GET') =>
    proxy.fetch(new Request(`https://gigantic.dev/api/proxy?${q}`, { method }));
  afterEach(() => {
    globalThis.fetch = real;
    seen.length = 0;
  });

  test('HTML gets the rail, upstream status and a CDN cache header', async () => {
    stub(
      () =>
        new Response('<head></head><body></body>', {
          headers: { 'content-type': 'text/html; charset=utf-8' },
        }),
    );
    const res = await get('project=stele&path=');
    expect(seen).toEqual(['https://jgeschwendt.github.io/stele/']);
    expect(res.status).toBe(200);
    expect(res.headers.get('cache-control')).toBe(
      'public, s-maxage=600, stale-while-revalidate=86400',
    );
    expect(await res.text()).toBe(inject('<head></head><body></body>', rail));
  });

  test('non-HTML streams through byte-identical', async () => {
    const css = '.x { color: red }</body>';
    stub(() => new Response(css, { headers: { 'content-type': 'text/css; charset=utf-8' } }));
    const res = await get('project=stele&path=ui.css');
    expect(res.headers.get('content-type')).toBe('text/css; charset=utf-8');
    expect(await res.text()).toBe(css);
  });

  test('upstream 404 serves our 404 page', async () => {
    stub(() => new Response('gh 404', { status: 404 }));
    const res = await get('project=stele&path=nope.html');
    expect(res.status).toBe(404);
    expect(await res.text()).toBe(await file('public/404.html').text());
  });

  test('redirects to Pages are re-homed onto this origin', async () => {
    stub(
      () =>
        new Response(null, {
          headers: { location: 'https://jgeschwendt.github.io/ui/docs/' },
          status: 301,
        }),
    );
    const res = await get('project=ui&path=docs');
    expect(res.status).toBe(301);
    expect(res.headers.get('location')).toBe('https://gigantic.dev/ui/docs/');
  });

  test('unknown projects and climbing paths 404 without a fetch', async () => {
    stub(() => new Response('should not be fetched'));
    for (const q of [
      'project=nope&path=',
      'project=stele&path=../ui/',
      'project=stele&path=a/%2e%2e/b',
    ]) {
      expect((await get(q)).status).toBe(404);
    }
    expect((await get('project=stele&path=', 'POST')).status).toBe(405);
    expect(seen).toEqual([]);
  });

  test('extra query parameters are forwarded', async () => {
    stub(() => new Response('', { headers: { 'content-type': 'text/plain' } }));
    await get('project=ui&path=docs/&v=2');
    expect(seen).toEqual(['https://jgeschwendt.github.io/ui/docs/?v=2']);
  });
});
