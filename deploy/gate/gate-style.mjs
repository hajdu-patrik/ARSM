// The gate page's one inline style: tokens copied from the WebUI tokens.css (arsm-* palette, ui-* swap) and base.css.
// The theme is data-theme on <html> (set by the page script); without script it follows prefers-color-scheme.

const LIGHT = `--surface:#f2f0f8;--card:#f8f5ff;--input:#f8f5ff;--text:#2d2440;--muted:#6a6185;--label:#5c5375;
--border:#d9d1ec;--field-border:#8b7cc0;--focus:#6e53ad;--accent:#cdb8ff;--accent-hover:#bea7f6;--on-accent:#2d2440;--select-text:#2d2440;
--util-bg:color-mix(in srgb,#eee6ff 85%,transparent);--util-hover:#eee6ff;--util-border:color-mix(in srgb,#cdb8ff 30%,transparent);
--pill-bg:color-mix(in srgb,#f8f5ff 72%,transparent);--pill-border:color-mix(in srgb,#d9d1ec 45%,transparent);
--error-bg:#fff2f3;--error-border:#eaabb0;--error-text:#aa2c35;--warning-bg:#fffbeb;--warning-border:#fcd34d;--warning-text:#a16207;
--backdrop:radial-gradient(circle at 14% 9%,color-mix(in srgb,#cdb8ff 18%,transparent) 0%,transparent 38%),radial-gradient(circle at 87% 16%,color-mix(in srgb,#e6dbff 26%,transparent) 0%,transparent 42%),linear-gradient(180deg,#f8f6ff 0%,#f2f0f8 100%);
--orb:radial-gradient(circle,color-mix(in srgb,#cdb8ff 58%,transparent) 0%,color-mix(in srgb,#cdb8ff 26%,transparent) 32%,color-mix(in srgb,#cdb8ff 10%,transparent) 48%,transparent 72%);
--sheen:linear-gradient(120deg,color-mix(in srgb,#f8f5ff 14%,transparent) 0%,transparent 45%)`;

const DARK = `--surface:#060914;--card:#202841;--input:#202841;--text:#f6f3ff;--muted:#cdc5e6;--label:#e0d8f4;
--border:#56608a;--focus:#a98fe0;--accent:#9a86e8;--accent-hover:#ad99f2;--on-accent:#0c1120;--select-text:#0c1120;
--util-bg:color-mix(in srgb,#35406a 80%,transparent);--util-hover:#35406a;--util-border:color-mix(in srgb,#9a86e8 30%,transparent);
--pill-bg:color-mix(in srgb,#202841 70%,transparent);--pill-border:color-mix(in srgb,#56608a 45%,transparent);
--error-bg:#3a1f28;--error-border:#b0606a;--error-text:#ffc3c9;--warning-bg:#3a3118;--warning-border:#8e7838;--warning-text:#ffd978;
--backdrop:radial-gradient(circle at 13% 11%,color-mix(in srgb,#9a86e8 24%,transparent) 0%,transparent 42%),radial-gradient(circle at 84% 16%,color-mix(in srgb,#35406a 40%,transparent) 0%,transparent 46%),linear-gradient(180deg,#0c1120 0%,#060914 100%);
--orb:radial-gradient(circle,color-mix(in srgb,#9a86e8 70%,transparent) 0%,color-mix(in srgb,#9a86e8 34%,transparent) 34%,color-mix(in srgb,#9a86e8 14%,transparent) 50%,transparent 72%);
--sheen:linear-gradient(120deg,color-mix(in srgb,#f6f3ff 6%,transparent) 0%,transparent 45%)`;

export const STYLE = `
@font-face{font-family:'Inter fallback';src:local('Segoe UI'),local('system-ui'),local('Arial');size-adjust:107%;ascent-override:90%;descent-override:22%;line-gap-override:0%}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:100 900;src:url(/__gate/inter-latin-ext-wght-normal.woff2) format('woff2-variations');unicode-range:U+0100-02BA,U+02BD-02C5,U+02C7-02CC,U+02CE-02D7,U+02DD-02FF,U+0304,U+0308,U+0329,U+1D00-1DBF,U+1E00-1E9F,U+1EF2-1EFF,U+2020,U+20A0-20AB,U+20AD-20C0,U+2113,U+2C60-2C7F,U+A720-A7FF}
@font-face{font-family:'Inter';font-style:normal;font-display:swap;font-weight:100 900;src:url(/__gate/inter-latin-wght-normal.woff2) format('woff2-variations');unicode-range:U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+0304,U+0308,U+0329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
:root{color-scheme:light;${LIGHT};--ease:cubic-bezier(.22,1,.36,1)}
:root[data-theme="dark"]{color-scheme:dark;${DARK}}
@media (prefers-color-scheme:dark){:root:not([data-theme]){color-scheme:dark;${DARK}}}
*,*::before,*::after{box-sizing:border-box}
html{font-family:'Inter','Inter fallback',system-ui,-apple-system,'Segoe UI',sans-serif;-webkit-text-size-adjust:100%}
body{margin:0;background-color:var(--surface);background-image:var(--backdrop);color:var(--text);line-height:1.5}
::selection{background:var(--accent);color:var(--select-text)}
input,button{font:inherit}
:root:not([data-lang="en"]) .en,:root[data-lang="en"] .hu{display:none}
.page{position:relative;display:flex;align-items:center;justify-content:center;min-height:100vh;min-height:100svh;overflow:hidden;padding:4.75rem .75rem 1.5rem}
.page::before{content:"";position:absolute;left:50%;top:50%;width:120vmax;height:120vmax;transform:translate(-50%,-50%);border-radius:50%;background:var(--orb);pointer-events:none}
.page::after{content:"";position:absolute;inset:0;background:var(--sheen);pointer-events:none}
.prefs{position:fixed;left:50%;top:1.25rem;z-index:30;display:none;align-items:center;gap:.375rem;min-width:0;padding:.375rem .625rem;transform:translateX(-50%);border:1px solid var(--pill-border);border-radius:1rem;background:var(--pill-bg);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px)}
:root[data-js] .prefs{display:flex}
.util{display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;height:2.75rem;min-width:4.9rem;padding:0 1.25rem;border:1px solid var(--util-border);border-radius:1rem;background:var(--util-bg);color:var(--text);font-size:.75rem;font-weight:500;cursor:pointer;-webkit-user-select:none;user-select:none;transition:background-color .15s ease-out,transform .15s ease-out}
.util:hover{background:var(--util-hover)}
.util:active{transform:scale(.97)}
.util:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.util svg{width:1rem;height:1rem;flex-shrink:0}
.i-moon,.logo-w{display:none}
:root[data-theme="dark"] .logo-b,:root[data-theme="dark"] .i-sun{display:none}
:root[data-theme="dark"] .logo-w,:root[data-theme="dark"] .i-moon{display:block}
@media (prefers-color-scheme:dark){:root:not([data-theme]) .logo-b,:root:not([data-theme]) .i-sun{display:none}:root:not([data-theme]) .logo-w,:root:not([data-theme]) .i-moon{display:block}}
.wrap{position:relative;z-index:1;width:100%;min-width:0;max-width:28rem}
.card{min-width:0;padding:1.25rem;border:1px solid var(--border);border-radius:1.5rem;background:color-mix(in srgb,var(--card) 95%,transparent);-webkit-backdrop-filter:blur(12px);backdrop-filter:blur(12px);animation:rise .4s var(--ease) backwards}
.head{display:flex;flex-direction:column;align-items:center;min-width:0;margin-bottom:1.5rem;text-align:center}
.logo{width:auto;max-width:100%;height:5rem;margin-top:.25rem;opacity:.75;-webkit-user-select:none;user-select:none}
h1{margin:.5rem 0 0;font-size:1.25rem;line-height:1.75rem;font-weight:600;color:var(--text);text-wrap:balance;overflow-wrap:anywhere}
.sub{margin:.5rem 0 0;font-size:.875rem;line-height:1.25rem;color:var(--muted);overflow-wrap:anywhere}
.form{display:grid;grid-template-columns:minmax(0,1fr);gap:1rem}
.form>*{min-width:0}
label{display:block;margin-bottom:.375rem;font-size:.875rem;line-height:1.25rem;font-weight:500;color:var(--label)}
.field{display:block;width:100%;min-width:0;min-height:2.75rem;padding:.625rem 1rem;border:1px solid var(--field-border);border-radius:.75rem;background:var(--input);color:var(--text);font-size:.9375rem;transition:transform .2s ease,border-color .2s ease}
.field:focus-visible{transform:translateY(-1px);border-color:var(--focus);outline:2px solid var(--focus);outline-offset:2px}
.cta{display:inline-flex;align-items:center;justify-content:center;width:100%;min-width:0;min-height:2.75rem;margin-top:.375rem;padding:.5rem 1rem;border:0;border-radius:1rem;background:var(--accent);color:var(--on-accent);font-size:.875rem;font-weight:600;cursor:pointer;transition:background-color .15s ease-out,transform .15s ease-out}
.cta:hover{background:var(--accent-hover);transform:translateY(-1px)}
.cta:active{transform:scale(.98)}
.cta:focus-visible{outline:2px solid var(--focus);outline-offset:2px}
.msg{margin:0;padding:.625rem .875rem;border:1px solid;border-radius:.75rem;font-size:.875rem;line-height:1.25rem;overflow-wrap:anywhere;animation:rise .4s var(--ease) backwards}
.err{background:var(--error-bg);border-color:color-mix(in srgb,var(--error-border) 60%,transparent);color:var(--error-text);animation:rise .4s var(--ease) backwards,shake .45s ease-in-out .4s}
.warn{background:var(--warning-bg);border-color:color-mix(in srgb,var(--warning-border) 60%,transparent);color:var(--warning-text)}
.hint{margin:1rem 0 0;font-size:.75rem;line-height:1.5;color:var(--muted);overflow-wrap:anywhere}
.row{animation:rise .4s var(--ease) backwards}
.s1{animation-delay:.06s}.s2{animation-delay:.12s}.s3{animation-delay:.18s}
@keyframes rise{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(5px)}60%{transform:translateX(-3px)}80%{transform:translateX(2px)}}
@media (min-width:640px){.page{padding:2rem 1rem}.prefs{left:auto;right:1.75rem;top:1.5rem;gap:.5rem;transform:none}.card{padding:2rem}.head{margin-bottom:2rem}.logo{height:6rem}h1{font-size:1.5rem;line-height:2rem}.form{gap:1.125rem}.hint{margin-top:1.25rem;font-size:.875rem}}
@media (max-width:320px){.page{padding-top:4.25rem}.prefs{top:.875rem;gap:.25rem;padding:.25rem .5rem}.util{min-width:3.9rem;padding:0 .875rem}.wrap{max-width:19.5rem}.card{padding:1rem}.head{margin-bottom:1.25rem}.field{padding:.5rem .75rem;font-size:.875rem}}
@media (prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important}.cta:hover,.cta:active,.util:active,.field:focus-visible{transform:none}}
`;
