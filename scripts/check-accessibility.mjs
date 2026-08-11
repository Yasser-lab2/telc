import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const [html, styles, navbar, dashboard] = await Promise.all([
  readFile(new URL('../frontend/index.html', import.meta.url), 'utf8'),
  readFile(new URL('../frontend/src/styles.css', import.meta.url), 'utf8'),
  readFile(new URL('../frontend/src/components/layout/Navbar.tsx', import.meta.url), 'utf8'),
  readFile(new URL('../frontend/src/components/layout/DashboardLayout.tsx', import.meta.url), 'utf8'),
]);

assert.match(html, /<html[^>]+lang="fr"/i, 'The document must declare its language');
assert.match(styles, /:focus-visible/, 'Keyboard focus must remain visible');
assert.match(styles, /prefers-reduced-motion:\s*reduce/, 'Reduced-motion preferences must be respected');
assert.match(navbar, /className="skip-link"/, 'Public navigation must provide a skip link');
assert.match(navbar, /document\.querySelector\('main'\)/, 'The public skip link must focus the main landmark on every route');
assert.match(dashboard, /className="skip-link"/, 'Learner navigation must provide a skip link');
assert.match(dashboard, /<main id="main-content"[^>]+tabIndex=\{-1\}/, 'The learner shell must expose a focusable main landmark');

console.log('Accessibility contract checks passed.');
