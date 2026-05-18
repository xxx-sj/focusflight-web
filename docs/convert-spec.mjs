import { marked } from 'marked';
import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { join, basename } from 'node:path';

const ROOT = new URL('.', import.meta.url).pathname;
const DIRS = [
  { path: join(ROOT, 'specs'), brand: 'FocusFlight · Spec', tag: '🛫 Design Spec' },
  { path: join(ROOT, 'plans'), brand: 'FocusFlight · Plan', tag: '🛠 Implementation Plan' },
];

const CSS = `
:root {
  --fg: #1f2328;
  --fg-soft: #424a53;
  --muted: #6e7781;
  --bg: #ffffff;
  --bg-soft: #f6f8fa;
  --bg-sidebar: #fafbfc;
  --border: #d1d9e0;
  --border-soft: #eaeef2;
  --code-bg: #f6f8fa;
  --accent: #0969da;
  --accent-soft: #ddf4ff;
  --th-bg: #f6f8fa;
  --shadow: 0 1px 2px rgba(31,35,40,0.04);
}
@media (prefers-color-scheme: dark) {
  :root {
    --fg: #e6edf3;
    --fg-soft: #c9d1d9;
    --muted: #8b949e;
    --bg: #0d1117;
    --bg-soft: #161b22;
    --bg-sidebar: #0d1117;
    --border: #30363d;
    --border-soft: #21262d;
    --code-bg: #161b22;
    --accent: #4493f8;
    --accent-soft: #0c2d6b;
    --th-bg: #161b22;
  }
}
* { box-sizing: border-box; }
html { scroll-behavior: smooth; scroll-padding-top: 24px; }
html, body { margin: 0; padding: 0; }
body {
  font-family: "Pretendard Variable", "Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Segoe UI", Helvetica, Arial, sans-serif;
  color: var(--fg);
  background: var(--bg);
  line-height: 1.75;
  font-size: 16px;
  word-break: keep-all;
  overflow-wrap: anywhere;
}
.progress { position: fixed; top: 0; left: 0; right: 0; height: 3px; z-index: 100; }
.progress > div { height: 100%; width: 0%; background: linear-gradient(90deg, var(--accent), #F4A261); transition: width 0.05s linear; }
.layout { display: grid; grid-template-columns: 260px minmax(0, 1fr); max-width: 1280px; margin: 0 auto; }
.sidebar { position: sticky; top: 0; align-self: start; height: 100vh; overflow-y: auto; padding: 32px 20px 32px 32px; border-right: 1px solid var(--border-soft); background: var(--bg-sidebar); font-size: 13.5px; }
.sidebar .brand { font-weight: 700; font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 16px; }
.sidebar .toc-title { font-size: 12px; text-transform: uppercase; letter-spacing: 0.06em; color: var(--muted); margin: 16px 0 8px; font-weight: 600; }
.sidebar .toc { list-style: none; padding: 0; margin: 0; }
.sidebar .toc a { display: block; padding: 5px 10px; color: var(--fg-soft); text-decoration: none; border-left: 2px solid transparent; line-height: 1.45; font-size: 13px; }
.sidebar .toc a:hover { color: var(--accent); border-left-color: var(--border); }
.sidebar .toc a.active { color: var(--accent); border-left-color: var(--accent); background: var(--accent-soft); font-weight: 600; }
.sidebar .toc .lvl-3 { padding-left: 22px; font-size: 12.5px; color: var(--muted); }
.content { padding: 56px 64px 120px; max-width: 880px; }
.meta { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 24px; font-size: 12.5px; color: var(--muted); }
.meta .tag { background: var(--bg-soft); border: 1px solid var(--border-soft); border-radius: 999px; padding: 3px 10px; }
h1, h2, h3, h4 { font-weight: 700; line-height: 1.35; letter-spacing: -0.01em; }
h1 { font-size: 2.1em; margin: 0 0 12px; padding-bottom: 14px; border-bottom: 1px solid var(--border-soft); }
h2 { font-size: 1.5em; margin: 2.4em 0 0.6em; padding-top: 1.6em; border-top: 1px solid var(--border-soft); }
h2:first-of-type { border-top: none; padding-top: 0; margin-top: 1.6em; }
h3 { font-size: 1.2em; margin: 2em 0 0.5em; }
h4 { font-size: 1.02em; margin: 1.6em 0 0.6em; color: var(--fg-soft); }
p { margin: 0 0 1em; }
strong { font-weight: 700; }
a { color: var(--accent); text-decoration: none; }
a:hover { text-decoration: underline; }
ul, ol { padding-left: 1.5em; margin: 0 0 1em; }
li { margin: 0.25em 0; }
blockquote { margin: 1em 0; padding: 14px 18px; color: var(--fg-soft); border-left: 4px solid var(--accent); background: var(--accent-soft); border-radius: 0 8px 8px 0; }
code { font-family: "JetBrains Mono", "SF Mono", Menlo, Consolas, monospace; font-size: 0.86em; background: var(--bg-soft); color: #cf222e; padding: 0.12em 0.42em; border-radius: 5px; border: 1px solid var(--border-soft); }
@media (prefers-color-scheme: dark) { code { color: #ff7b72; } }
pre { background: var(--code-bg); border: 1px solid var(--border-soft); border-radius: 10px; padding: 0; overflow: hidden; margin: 1.2em 0; box-shadow: var(--shadow); }
pre code { display: block; background: transparent !important; color: var(--fg) !important; border: none; padding: 16px 18px; font-size: 13.5px; line-height: 1.65; overflow-x: auto; white-space: pre; }
.table-wrap { overflow-x: auto; margin: 1em 0; border: 1px solid var(--border-soft); border-radius: 10px; }
table { width: 100%; border-collapse: collapse; font-size: 14.5px; }
th, td { border-bottom: 1px solid var(--border-soft); padding: 10px 16px; text-align: left; vertical-align: top; }
th { background: var(--bg-soft); font-weight: 600; white-space: nowrap; }
tr:last-child td { border-bottom: none; }
hr { border: 0; height: 1px; background: linear-gradient(90deg, transparent, var(--border), transparent); margin: 2.4em 0; }

/* ============ DESIGN SAMPLES ============ */
.design-samples {
  background: linear-gradient(180deg, #0A1628 0%, #1a2942 100%);
  border-radius: 16px;
  padding: 28px;
  margin: 1.5em 0;
  color: #F5F1E8;
}
.design-samples h4 { color: #F4A261; margin-top: 2em; margin-bottom: 0.8em; }
.design-samples h4:first-child { margin-top: 0; }

/* Swatches */
.swatches { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 12px; }
.swatch {
  background: var(--c);
  color: #fff;
  border-radius: 12px;
  padding: 18px 14px;
  display: flex; flex-direction: column; gap: 6px;
  font-size: 13px;
  box-shadow: 0 2px 8px rgba(0,0,0,0.25);
  border: 1px solid rgba(255,255,255,0.08);
}
.swatch span { font-weight: 600; }
.swatch code {
  background: rgba(0,0,0,0.25);
  color: inherit !important;
  border: none;
  font-size: 11.5px;
  padding: 2px 6px;
  align-self: flex-start;
}

/* Boarding pass */
.boarding-pass {
  display: grid;
  grid-template-columns: 1fr auto;
  background: #F5F1E8;
  color: #0A1628;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,0.35);
  max-width: 640px;
  font-family: "JetBrains Mono", "SF Mono", Menlo, monospace;
}
.bp-main { padding: 22px 24px; border-right: 2px dashed #c5bfb1; }
.bp-stub {
  background: #F4A261;
  color: #0A1628;
  padding: 22px 24px;
  display: flex; flex-direction: column; align-items: center; justify-content: space-between;
  min-width: 140px;
}
.bp-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; }
.bp-brand { font-weight: 800; font-size: 12px; letter-spacing: 0.15em; }
.bp-class { font-size: 10px; color: #6e7781; letter-spacing: 0.1em; }
.bp-route { display: flex; align-items: center; justify-content: space-between; margin-bottom: 22px; }
.bp-airport { text-align: center; }
.bp-code { font-size: 28px; font-weight: 800; letter-spacing: 0.05em; }
.bp-label { font-size: 10px; color: #6e7781; letter-spacing: 0.1em; margin-top: 2px; }
.bp-plane { font-size: 22px; color: #F4A261; transform: rotate(-20deg); }
.bp-meta { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.bp-k { font-size: 9.5px; color: #6e7781; letter-spacing: 0.1em; margin-bottom: 3px; }
.bp-v { font-size: 14px; font-weight: 700; }
.bp-seat { font-size: 36px; font-weight: 800; line-height: 1; margin: 4px 0 8px; }
.bp-tear { font-size: 9px; letter-spacing: 0.1em; opacity: 0.7; }

/* Seat map */
.seatmap { background: #0A1628; border: 1px solid rgba(255,255,255,0.1); border-radius: 12px; padding: 18px; }
.seatmap-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 6px;
  max-width: 320px;
  margin: 0 auto 14px;
}
.seat-dot {
  width: 14px; height: 14px; border-radius: 50%; display: inline-block; vertical-align: middle; margin-right: 4px;
}
.seat-dot.available { background: #F5F1E8; }
.seat-dot.selected { background: #F4A261; box-shadow: 0 0 0 3px rgba(244,162,97,0.25); }
.seat-dot.taken { background: #6e7781; opacity: 0.4; }
.seatmap-legend { font-size: 12px; color: #c9d1d9; text-align: center; display: flex; gap: 18px; justify-content: center; }

/* Countdown */
.countdown-mock {
  display: flex; justify-content: center;
  padding: 16px 0;
}
.cd-window {
  width: 100%;
  max-width: 460px;
  aspect-ratio: 5 / 3;
  background: linear-gradient(180deg, #0A1628 0%, #264653 60%, #F4A261 100%);
  border: 8px solid #1a2942;
  border-radius: 24px;
  position: relative;
  overflow: hidden;
  box-shadow: inset 0 0 60px rgba(0,0,0,0.6);
}
.cd-cloud {
  position: absolute;
  background: rgba(245,241,232,0.85);
  border-radius: 50px;
  filter: blur(2px);
}
.cd-cloud-1 { width: 110px; height: 24px; top: 28%; left: 15%; opacity: 0.8; }
.cd-cloud-2 { width: 80px; height: 18px; top: 55%; left: 55%; opacity: 0.65; }
.cd-time {
  position: absolute; inset: 0;
  display: flex; align-items: center; justify-content: center;
  font-family: "JetBrains Mono", monospace;
  font-size: clamp(40px, 9vw, 72px);
  font-weight: 800;
  color: #F5F1E8;
  text-shadow: 0 2px 12px rgba(0,0,0,0.4);
  letter-spacing: 0.05em;
}
.cd-cat {
  position: absolute; bottom: 14px; left: 0; right: 0; text-align: center;
  font-family: "JetBrains Mono", monospace;
  font-size: 11px; letter-spacing: 0.18em; color: rgba(245,241,232,0.7);
}

/* Step flow */
.step-flow {
  display: flex; flex-wrap: wrap; align-items: center; gap: 8px;
  justify-content: center;
  padding: 8px 0;
}
.step {
  background: rgba(245,241,232,0.08);
  border: 1px solid rgba(245,241,232,0.2);
  color: #F5F1E8;
  padding: 8px 14px;
  border-radius: 999px;
  font-size: 12.5px;
  font-family: "JetBrains Mono", monospace;
  letter-spacing: 0.05em;
}
.step.active {
  background: #F4A261;
  color: #0A1628;
  border-color: #F4A261;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(244,162,97,0.35);
}
.arrow { color: rgba(245,241,232,0.4); font-size: 14px; }

/* Sound timeline */
.sound-timeline { font-family: "JetBrains Mono", monospace; font-size: 11px; }
.sl-row { display: grid; grid-template-columns: 80px 1fr; gap: 10px; align-items: center; margin: 6px 0; }
.sl-label { color: rgba(245,241,232,0.7); letter-spacing: 0.1em; text-transform: uppercase; }
.sl-track {
  position: relative;
  height: 22px;
  background: rgba(245,241,232,0.06);
  border-radius: 6px;
  overflow: hidden;
}
.sl-clip {
  position: absolute;
  top: 2px; bottom: 2px;
  display: flex; align-items: center; justify-content: center;
  border-radius: 4px;
  color: #0A1628;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
}
.sl-clip.oneshot { background: #F4A261; }
.sl-clip.loop { background: #2A9D8F; color: #F5F1E8; }
.sl-axis {
  display: flex;
  justify-content: space-between;
  margin: 10px 0 0 90px;
  font-size: 10px;
  color: rgba(245,241,232,0.5);
  letter-spacing: 0.05em;
}

@media (max-width: 960px) {
  .layout { grid-template-columns: 1fr; }
  .sidebar { position: relative; height: auto; border-right: none; border-bottom: 1px solid var(--border-soft); padding: 20px; }
  .sidebar .toc { max-height: 240px; overflow-y: auto; }
  .content { padding: 32px 22px 80px; }
  .boarding-pass { grid-template-columns: 1fr; }
  .bp-main { border-right: none; border-bottom: 2px dashed #c5bfb1; }
}
`;

const HEAD_EXTRA = `
<link rel="preconnect" href="https://cdn.jsdelivr.net">
<link rel="stylesheet" as="style" crossorigin href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github.min.css" media="(prefers-color-scheme: light)" />
<link rel="stylesheet" href="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/styles/github-dark.min.css" media="(prefers-color-scheme: dark)" />
<script defer src="https://cdn.jsdelivr.net/gh/highlightjs/cdn-release@11.10.0/build/highlight.min.js"></script>
`;

const INLINE_JS = `
document.addEventListener('DOMContentLoaded', () => {
  if (window.hljs) window.hljs.highlightAll();

  // Wrap tables for horizontal scroll
  document.querySelectorAll('.content table').forEach((t) => {
    if (t.parentElement && t.parentElement.classList.contains('table-wrap')) return;
    const wrap = document.createElement('div');
    wrap.className = 'table-wrap';
    t.parentNode.insertBefore(wrap, t);
    wrap.appendChild(t);
  });

  // Build seat map (10 rows × 6 seats)
  const grid = document.querySelector('.seatmap-grid');
  if (grid) {
    const cols = ['A','B','C','D','E','F'];
    const taken = new Set(['3B','5D','7A','9F','2E']);
    const selected = '1A';
    for (let r = 1; r <= 10; r++) {
      for (let c = 0; c < 6; c++) {
        const label = r + cols[c];
        const cell = document.createElement('div');
        cell.style.cssText = 'display:flex;align-items:center;justify-content:center;font-size:9.5px;font-family:JetBrains Mono,monospace;color:rgba(245,241,232,0.85);aspect-ratio:1;border-radius:6px;';
        if (label === selected) {
          cell.style.background = '#F4A261';
          cell.style.color = '#0A1628';
          cell.style.fontWeight = '800';
          cell.style.boxShadow = '0 0 0 3px rgba(244,162,97,0.25)';
        } else if (taken.has(label)) {
          cell.style.background = 'rgba(110,119,129,0.4)';
          cell.style.opacity = '0.5';
        } else {
          cell.style.background = 'rgba(245,241,232,0.12)';
        }
        cell.textContent = label;
        grid.appendChild(cell);
      }
    }
  }

  // Reading progress
  const bar = document.querySelector('.progress > div');
  if (bar) {
    const onScroll = () => {
      const h = document.documentElement;
      const scrolled = h.scrollTop;
      const total = h.scrollHeight - h.clientHeight;
      bar.style.width = total > 0 ? (scrolled / total * 100) + '%' : '0%';
    };
    document.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // TOC scrollspy
  const links = Array.from(document.querySelectorAll('.toc a[href^="#"]'));
  if (links.length) {
    const map = new Map();
    links.forEach((a) => {
      const id = decodeURIComponent(a.getAttribute('href').slice(1));
      const el = document.getElementById(id);
      if (el) map.set(el, a);
    });
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        const link = map.get(e.target);
        if (!link) return;
        if (e.isIntersecting) {
          links.forEach((l) => l.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-10% 0px -75% 0px', threshold: 0 });
    map.forEach((_, el) => observer.observe(el));
  }
});
`;

const slugCount = new Map();
function slugify(text) {
  const base = String(text)
    .toLowerCase()
    .replace(/[\s]+/g, '-')
    .replace(/[^\p{L}\p{N}\-가-힣]+/gu, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '') || 'section';
  const n = (slugCount.get(base) ?? 0) + 1;
  slugCount.set(base, n);
  return n === 1 ? base : `${base}-${n}`;
}

function stripHtml(s) {
  return String(s).replace(/<[^>]+>/g, '');
}

function buildRenderer(tocEntries) {
  const renderer = new marked.Renderer();
  renderer.heading = function (token) {
    const level = token.depth;
    const raw = token.raw.replace(/^#+\s*/, '').replace(/\s*#*\s*$/, '');
    const text = this.parser.parseInline(token.tokens);
    const id = slugify(raw);
    if (level >= 1 && level <= 3) tocEntries.push({ level, text, id });
    return `<h${level} id="${id}">${text}</h${level}>\n`;
  };
  return renderer;
}

function renderTOC(entries) {
  if (!entries.length) return '';
  const items = entries
    .filter((e) => e.level >= 2)
    .map((e) => `<li class="lvl-${e.level}"><a href="#${e.id}">${stripHtml(e.text)}</a></li>`)
    .join('');
  return `<div class="toc-title">On this page</div><ul class="toc">${items}</ul>`;
}

function escapeSingleTildes(md) {
  const lines = md.split('\n');
  let inFence = false;
  return lines
    .map((line) => {
      if (/^\s*```/.test(line)) {
        inFence = !inFence;
        return line;
      }
      if (inFence) return line;
      const parts = line.split(/(`[^`]*`)/);
      return parts
        .map((part, i) =>
          i % 2 === 1 ? part : part.replace(/(?<!~)~(?!~)/g, '\\~')
        )
        .join('');
    })
    .join('\n');
}

function convert(srcPath, outPath, brand, tag) {
  slugCount.clear();
  const md = escapeSingleTildes(readFileSync(srcPath, 'utf8'));
  const tocEntries = [];
  const renderer = buildRenderer(tocEntries);
  const bodyHtml = marked.parse(md, { renderer, gfm: true, breaks: false });

  const firstH1 = tocEntries.find((e) => e.level === 1);
  const title = firstH1 ? firstH1.text : basename(srcPath);

  const tocHtml = renderTOC(tocEntries);
  const sidebarHtml = `<aside class="sidebar"><div class="brand">${brand}</div>${tocHtml}</aside>`;

  const metaHtml = `<div class="meta"><span class="tag">${tag}</span><span class="tag">2026-05-18</span><span class="tag">Approved</span></div>`;

  const html = `<!DOCTYPE html>
<html lang="ko">
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<title>${stripHtml(title)}</title>
${HEAD_EXTRA}
<style>${CSS}</style>
</head>
<body>
<div class="progress"><div></div></div>
<div class="layout">
  ${sidebarHtml}
  <main class="content">
    ${metaHtml}
    ${bodyHtml}
  </main>
</div>
<script>${INLINE_JS}</script>
</body>
</html>`;

  writeFileSync(outPath, html);
  console.log(`wrote ${outPath}`);
}

import { existsSync } from 'node:fs';

for (const { path: dir, brand, tag } of DIRS) {
  if (!existsSync(dir)) continue;
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));
  for (const f of files) {
    convert(join(dir, f), join(dir, f.replace(/\.md$/, '.html')), brand, tag);
  }
}
