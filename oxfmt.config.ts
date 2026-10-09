import { defineConfig } from '@jlg/oxfmt';

// defineConfig shallow-merges the @jlg/oxfmt base (only `singleQuote`) under
// these local keys; oxfmt auto-discovers this file in the repo root. Mirrors
// jlg.io's, minus the tailwind sort this repo has no stylesheet for.
export default defineConfig({
  // LICENSE.md is the PolyForm text verbatim and public/ui.css is byte-synced
  // from jgeschwendt/ui — formatting either breaks the copy. .vercel: CLI state.
  ignorePatterns: ['.vercel/**', 'LICENSE.md', 'public/ui.css'],
  sortPackageJson: false,
});
