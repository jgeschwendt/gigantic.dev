import { defineConfig } from '@jlg/oxfmt';

// defineConfig shallow-merges the @jlg/oxfmt base (only `singleQuote`) under
// these local keys; oxfmt auto-discovers this file in the repo root. Mirrors
// jlg.io's, minus the tailwind sort this repo has no stylesheet for.
export default defineConfig({
  // LICENSE.md is the PolyForm text verbatim — formatting it breaks the copy.
  // public/rail.html is a fragment stored at its in-<body> indentation so it
  // matches the formatted copies in index.html and 404.html byte for byte
  // (site.test.ts). .vercel: CLI state.
  ignorePatterns: ['.vercel/**', 'LICENSE.md', 'public/rail.html'],
  sortPackageJson: false,
});
