// ARSM access gate: the login page and its static assets. Plain ESM, Node built-ins only.
// One hashed inline style and one hashed inline script (theme/language, shared with the app's localStorage keys).

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { STYLE } from './gate-style.mjs';

export const GATE_PREFIX = '/__gate/';
export const LOGIN_PATH = '/__gate/login';

const ASSET_DIR = fileURLToPath(new URL('./gate-assets/', import.meta.url));
const ASSET_FILES = [
  ['inter-latin-wght-normal.woff2', 'font/woff2'],
  ['inter-latin-ext-wght-normal.woff2', 'font/woff2'],
  ['AppLogoFrameBlack.webp', 'image/webp'],
  ['AppLogoFrameWhite.webp', 'image/webp'],
  ['icon.png', 'image/png'],
];

/** Reads the served assets once into a Map keyed by request path; a missing file is left out. */
export function loadGateAssets() {
  const assets = new Map();
  for (const [name, type] of ASSET_FILES) {
    try {
      assets.set(GATE_PREFIX + name, { body: readFileSync(join(ASSET_DIR, name)), type });
    } catch {
      // The page still renders without this asset.
    }
  }
  return assets;
}

// The app's rule (index.html, theme.store, i18n): saved theme else the system scheme; saved language else Hungarian.
const SCRIPT = `(function(){
var d=document.documentElement,s=null,l=null;
try{s=localStorage.getItem('arsm.pref.theme')||localStorage.getItem('preferred-theme');l=localStorage.getItem('arsm.pref.language')||localStorage.getItem('preferred-language');}catch(e){}
var theme=s==='dark'||s==='light'?s:(window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light');
var lang=l!==null&&l.toLowerCase().indexOf('en')===0?'en':'hu';
var T={hu:{title:'ARSM – belépés',toLight:'Váltás világos módra',toDark:'Váltás sötét módra'},
en:{title:'ARSM – sign in',toLight:'Switch to light mode',toDark:'Switch to dark mode'}};
function save(k,v){try{localStorage.setItem(k,v);}catch(e){}}
function apply(){
d.setAttribute('data-theme',theme);d.setAttribute('data-lang',lang);d.lang=lang;document.title=T[lang].title;
var lb=document.getElementById('gate-lang'),tb=document.getElementById('gate-theme');
if(lb){var t=lang==='hu'?'EN':'HU',n=lang==='hu'?'Váltás angolra':'Switch to Hungarian';
lb.textContent=t;lb.title=n;lb.setAttribute('aria-label',t+': '+n);}
if(tb){var m=theme==='dark'?T[lang].toLight:T[lang].toDark;tb.title=m;tb.setAttribute('aria-label',m);}}
d.setAttribute('data-js','');apply();
document.addEventListener('DOMContentLoaded',function(){
document.getElementById('gate-lang').addEventListener('click',function(){lang=lang==='hu'?'en':'hu';save('arsm.pref.language',lang);apply();});
document.getElementById('gate-theme').addEventListener('click',function(){theme=theme==='dark'?'light':'dark';save('arsm.pref.theme',theme);apply();});
apply();});
})();`;

const sha256 = (text) => createHash('sha256').update(text, 'utf8').digest('base64');
const CSP = [
  "default-src 'none'",
  `style-src 'sha256-${sha256(STYLE)}'`,
  `script-src 'sha256-${sha256(SCRIPT)}'`,
  "img-src 'self'",
  "font-src 'self'",
  "form-action 'self'",
  "base-uri 'none'",
  "frame-ancestors 'none'",
  "require-trusted-types-for 'script'",
  "trusted-types 'none'",
].join('; ');

/** Both languages are in the markup; the stylesheet shows the one named by data-lang on <html>. */
const both = (hu, en) => `<span class="hu">${hu}</span><span class="en" lang="en">${en}</span>`;

const SUBTITLE = both('Ez az ARSM zárt környezete.', "This is ARSM's closed environment.");
const SUBTITLE_LOGIN = both(
  'Ez az ARSM zárt környezete. A belépéshez adja meg a hozzáférési tokent.',
  "This is ARSM's closed environment. Enter the access token to sign in.",
);
const VIEWS = {
  locked: { subtitle: SUBTITLE_LOGIN, message: '', tone: '', form: true },
  'wrong-token': { subtitle: SUBTITLE_LOGIN, message: both('Hibás token.', 'Wrong token.'), tone: 'err', form: true },
  'rate-limited': {
    subtitle: SUBTITLE_LOGIN,
    message: both('Túl sok hibás próbálkozás. Próbálja újra később.', 'Too many failed attempts. Try again later.'),
    tone: 'err',
    form: true,
  },
  closed: { subtitle: SUBTITLE, message: both('Az oldal most zárva van.', 'The site is closed right now.'), tone: 'warn', form: false },
};

const MESSAGE_ID = 'gate-message';
const HTML_ESCAPES = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = (value) => String(value).replace(/[&<>"']/g, (char) => HTML_ESCAPES[char]);
const safeNext = (next) => (typeof next === 'string' && /^\/(?![/\\])/.test(next) ? next : '/');

const SUN = '<svg class="i-sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';
const MOON = '<svg class="i-moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';

// Hidden until the script runs (data-js), because without script the buttons could do nothing.
const PREFS =
  '<div class="prefs"><button class="util" id="gate-lang" type="button">EN</button>' +
  `<button class="util" id="gate-theme" type="button">${SUN}${MOON}</button></div>`;

const LOGO =
  '<img class="logo logo-b" src="/__gate/AppLogoFrameBlack.webp" alt="ARSM" width="789" height="662" decoding="async" fetchpriority="high">' +
  '<img class="logo logo-w" src="/__gate/AppLogoFrameWhite.webp" alt="ARSM" width="789" height="662" decoding="async">';

const renderMessage = (view) =>
  view.message === '' ? '' : `<p class="msg ${view.tone}" id="${MESSAGE_ID}" role="alert">${view.message}</p>`;

function renderForm(view, next) {
  const described = view.message === '' ? '' : ` aria-describedby="${MESSAGE_ID}"`;
  const invalid = view.tone === 'err' ? ' aria-invalid="true"' : '';
  return `<form class="form" method="post" action="${LOGIN_PATH}">
${renderMessage(view)}
<div class="row s1"><label for="gate-access">${both('Hozzáférési token', 'Access token')}</label>
<input class="field" id="gate-access" name="access" type="password" required autofocus autocomplete="off" autocapitalize="none" spellcheck="false"${described}${invalid}></div>
<div class="row s2"><button class="cta" type="submit">${both('Belépés', 'Sign in')}</button></div>
<input type="hidden" name="next" value="${escapeHtml(safeNext(next))}">
</form>
<p class="hint row s3">${both('Egy böngészőben elég egyszer megadni, utána 30 napig megjegyzi.', 'Enter it once per browser; it is remembered for 30 days.')}</p>`;
}

/** Builds the gate page for a state and the CSP that allows exactly its inline style and script. */
export function renderGatePage(state, next) {
  const view = Object.hasOwn(VIEWS, state) ? VIEWS[state] : VIEWS.locked;
  const content = view.form ? renderForm(view, next) : renderMessage(view);
  const html = `<!doctype html>
<html lang="hu"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light dark"><meta name="robots" content="noindex, nofollow">
<link rel="icon" href="/__gate/icon.png" type="image/png"><title>ARSM – belépés</title>
<style>${STYLE}</style><script>${SCRIPT}</script></head>
<body>${PREFS}<main class="page"><div class="wrap"><div class="card">
<header class="head">${LOGO}<h1>${both('Belépés az ARSM-be', 'Sign in to ARSM')}</h1><p class="sub">${view.subtitle}</p></header>
${content}
</div></div></main></body></html>
`;
  return { html, csp: CSP };
}
