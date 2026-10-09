// rail.js — behaviour for public/rail.html, on the landing and on every proxied page.
// The drawer is a native popover and needs nothing from here; this marks the current
// project and runs the theme toggle.
// Wrapped in a function scope: a proxied page's own classic scripts share the global
// lexical scope, and a second top-level `const THEME_KEY` would be a SyntaxError.
(() => {
  // The theme contract from jgeschwendt/ui docs.js (guarded for blocked storage) — same key,
  // so a theme chosen anywhere is the theme every project page opens in. A proxied page
  // carries its own toggle too; both sets of buttons are kept in step.
  const THEME_KEY = 'ui-theme';

  function applyTheme(mode) {
    const root = document.documentElement;
    try {
      if (mode === 'auto') {
        root.removeAttribute('data-theme');
        localStorage.removeItem(THEME_KEY);
      } else {
        root.dataset.theme = mode;
        localStorage.setItem(THEME_KEY, mode);
      }
    } catch {}
    for (const b of document.querySelectorAll('[data-theme-set]')) {
      b.setAttribute('aria-pressed', String(b.dataset.themeSet === mode));
    }
  }

  function storedTheme() {
    try {
      return localStorage.getItem(THEME_KEY) || 'auto';
    } catch {
      return 'auto';
    }
  }

  const rail = document.querySelector('nav.rail');

  if (rail) {
    for (const b of rail.querySelectorAll('[data-theme-set]')) {
      b.addEventListener('click', () => applyTheme(b.dataset.themeSet));
    }
    applyTheme(storedTheme());

    // The partial is shared byte-for-byte, so "you are here" is decided client-side:
    // the first path segment names the project; `/` is the landing.
    const here = location.pathname.split('/')[1] || '';
    for (const a of rail.querySelectorAll('a[href^="/"]')) {
      const target = new URL(a.href).pathname.split('/')[1] || '';
      if (target === here && (here !== '' || a.classList.contains('rail-mark'))) {
        a.setAttribute('aria-current', 'page');
        a.classList.add('is-current');
      }
    }

    // A drawer left open across the breakpoint would sit in the top layer over the
    // docked rail; close it when the viewport widens.
    const panel = rail.querySelector('[popover]');
    matchMedia('(min-width: 900px)').addEventListener('change', (e) => {
      if (e.matches && panel?.matches(':popover-open')) panel.hidePopover();
    });
  }
})();
