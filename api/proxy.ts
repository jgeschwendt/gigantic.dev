// Runtime: Node.js 24 (the project's nodeVersion) with the Web-standard `fetch` export.
// Bun is still Beta on Vercel Functions ("The Bun runtime (Beta) is available on all
// plans" — https://vercel.com/docs/functions/runtimes/bun), so not chosen; the Node
// runtime takes `export default { fetch }` natively:
// https://vercel.com/docs/functions/runtimes/node-js
//
// Every `/<project>/:path(.*)` rewrite in vercel.json lands here. The page is fetched
// from GitHub Pages; HTML gets the shared rail injected, everything else streams through.
import { readFileSync } from 'node:fs';

const PAGES = 'https://jgeschwendt.github.io';
const CACHE = 'public, s-maxage=600, stale-while-revalidate=86400';
const RAIL_CSS = '<link rel="stylesheet" href="/rail.css" />\n';
const RAIL_JS = '<script src="/rail.js" defer></script>\n';

// Read at cold start. vercel.json's `functions.includeFiles` ships both files beside
// the bundle, at the same repo-relative path this URL resolves to.
const read = (name: string) => readFileSync(new URL(`../public/${name}`, import.meta.url), 'utf8');
const RAIL = read('rail.html');
const NOT_FOUND = read('404.html');

// The rail is the one list of proxied projects: its `/<name>/` links are the allowlist.
export const PROJECTS: ReadonlySet<string> = new Set(
  Array.from(RAIL.matchAll(/href="\/([a-z0-9.-]+)\/"/g), (m) => m[1]!),
);

/** Insert the rail's stylesheet before `</head>` and the rail plus its script before
 * `</body>`. A page missing either tag (ui's meta-refresh stub) or already carrying a
 * rail is returned unchanged. */
export function inject(html: string, rail: string): string {
  const lower = html.toLowerCase();
  const head = lower.indexOf('</head>');
  const body = lower.lastIndexOf('</body>');
  if (head < 0 || body < head || html.includes('<nav class="rail"')) return html;
  return (
    html.slice(0, head) + RAIL_CSS + html.slice(head, body) + rail + RAIL_JS + html.slice(body)
  );
}

/** `path` as URL segments, or null if it tries to climb out of the project. */
function segments(path: string): string[] | null {
  const parts = path.split('/');
  return parts.some((p) => p === '..' || p === '.' || p.includes('\\')) ? null : parts;
}

function notFound(method: string): Response {
  return new Response(method === 'HEAD' ? null : NOT_FOUND, {
    headers: { 'cache-control': CACHE, 'content-type': 'text/html; charset=utf-8' },
    status: 404,
  });
}

export default {
  async fetch(request: Request): Promise<Response> {
    const { method } = request;
    if (method !== 'GET' && method !== 'HEAD') {
      return new Response(null, { headers: { allow: 'GET, HEAD' }, status: 405 });
    }
    const url = new URL(request.url);
    const project = url.searchParams.get('project') ?? '';
    const parts = segments(url.searchParams.get('path') ?? '');
    if (!PROJECTS.has(project) || !parts) return notFound(method);

    const upstream = new URL(`${PAGES}/${project}/${parts.map(encodeURIComponent).join('/')}`);
    for (const [k, v] of url.searchParams) {
      if (k !== 'project' && k !== 'path') upstream.searchParams.append(k, v);
    }
    const res = await fetch(upstream, { method, redirect: 'manual' });

    if (res.status === 404) return notFound(method);

    const headers = new Headers({ 'cache-control': CACHE });
    const type = res.headers.get('content-type');
    if (type) headers.set('content-type', type);

    // Pages redirects `/stele` → `/stele/`; keep the visitor on this host.
    const location = res.headers.get('location');
    if (location && res.status >= 300 && res.status < 400) {
      const to = new URL(location, upstream);
      headers.set(
        'location',
        to.origin === PAGES ? new URL(to.pathname + to.search + to.hash, url.origin).href : to.href,
      );
      return new Response(null, { headers, status: res.status });
    }

    if (method === 'GET' && type?.startsWith('text/html')) {
      return new Response(inject(await res.text(), RAIL), { headers, status: res.status });
    }
    return new Response(res.body, { headers, status: res.status });
  },
};
