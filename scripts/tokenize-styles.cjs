const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || '.');
const targets = new Set(['.css', '.jsx', '.tsx']);
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo']);

const radiusMap = new Map([
  ['2px', 'var(--radius-sm)'],
  ['4px', 'var(--radius-sm)'],
  ['6px', 'var(--radius-md)'],
  ['8px', 'var(--radius-md)'],
  ['10px', 'var(--radius-lg)'],
  ['12px', 'var(--radius-lg)'],
  ['14px', 'var(--radius-xl)'],
  ['16px', 'var(--radius-xl)'],
  ['999px', 'var(--radius-full)'],
  ['9999px', 'var(--radius-full)'],
]);

const exactColorMap = new Map([
  ['#fff', 'var(--bg-raised)'],
  ['#ffffff', 'var(--bg-raised)'],
  ['#f8fbff', 'var(--bg-raised)'],
  ['#fafafa', 'var(--bg-raised)'],
  ['#f7f3ee', 'var(--bg-base)'],
  ['#f2f5f8', 'var(--bg-canvas)'],
  ['#ecf1f6', 'var(--bg-base)'],
  ['#e5ecf3', 'var(--bg-surface)'],
  ['#2a1e16', 'var(--text-primary)'],
  ['#6a5a4a', 'var(--text-secondary)'],
  ['#9a8a7a', 'var(--text-muted)'],
  ['#b8aa9a', 'var(--text-muted)'],
  ['#c4713a', 'var(--brand)'],
  ['#d4905a', 'var(--brand-light)'],
  ['#5a8a5a', 'var(--success)'],
  ['#6aa06a', 'var(--success)'],
  ['#c49a3a', 'var(--warning)'],
  ['#d4aa4a', 'var(--warning)'],
  ['#e8a838', 'var(--warning)'],
  ['#b05050', 'var(--danger)'],
  ['#c06060', 'var(--danger)'],
  ['#7a6aaa', 'var(--ai-color)'],
  ['#9a8acc', 'var(--ai-color)'],
  ['#8a58bc', 'var(--ai-color)'],
  ['#22c55e', 'var(--success)'],
  ['#ca8a04', 'var(--warning)'],
  ['#ef4444', 'var(--danger)'],
  ['#f87171', 'var(--danger)'],
  ['#dc2626', 'var(--danger)'],
]);

const rgbaPattern = /rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)/gi;
const hslPattern = /hsla?\([^)]*\)/gi;
const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;

function walk(dir, out) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (ignoreDirs.has(entry.name)) continue;
      walk(full, out);
      continue;
    }
    if (!targets.has(path.extname(entry.name))) continue;
    out.push(full);
  }
}

function isCssVarDefinitionLine(line) {
  return /^\s*--[\w-]+\s*:/.test(line);
}

function replaceFontFamilies(line, isCss) {
  if (line.includes('var(--font-heading)') || line.includes('var(--font-body)')) return line;

  if (isCss) {
    return line.replace(/font-family\s*:\s*([^;]+);/gi, (m, family) => {
      if (/var\(--/.test(family)) return m;
      if (/heading|title|h1|h2|h3|fraunces|georgia|serif/i.test(family)) {
        return 'font-family: var(--font-heading);';
      }
      return 'font-family: var(--font-body);';
    });
  }

  return line
    .replace(/fontFamily\s*:\s*['\"][^'\"]+['\"]/g, (m) => {
      if (/heading|title|h1|h2|h3|fraunces|georgia|serif/i.test(m)) return 'fontFamily: \'var(--font-heading)\'';
      return 'fontFamily: \'var(--font-body)\'';
    })
    .replace(/font-family\s*:\s*['\"][^'\"]+['\"]/g, (m) => {
      if (/heading|title|h1|h2|h3|fraunces|georgia|serif/i.test(m)) return 'font-family: var(--font-heading)';
      return 'font-family: var(--font-body)';
    });
}

function replaceRadius(line, isCss) {
  if (isCss) {
    line = line.replace(/border-radius\s*:\s*([^;]+);/gi, (m, v) => {
      const normalized = v.trim().toLowerCase();
      if (normalized === '0' || normalized === '0px') return m;
      const mapped = radiusMap.get(normalized);
      return mapped ? `border-radius: ${mapped};` : m;
    });
    return line;
  }

  return line.replace(/borderRadius\s*:\s*['\"]?([^,'\"}]+)['\"]?/g, (m, v) => {
    const normalized = String(v).trim().toLowerCase();
    if (normalized === '0' || normalized === '0px') return m;
    const mapped = radiusMap.get(normalized);
    return mapped ? `borderRadius: '${mapped}'` : m;
  });
}

function mapRgb(r, g, b, aRaw, line) {
  const a = aRaw === undefined ? 1 : Number(aRaw);
  const key = `rgb(${r},${g},${b})`;
  const low = key.toLowerCase();

  // direct semantic mappings
  if (r === 196 && g === 113 && b === 58) return 'var(--brand-dim)';
  if (r === 212 && g === 144 && b === 90) return 'var(--brand-dim)';
  if (r === 176 && g === 80 && b === 80) return 'var(--danger-dim)';
  if (r === 90 && g === 138 && b === 90) return 'var(--success-dim)';
  if (r === 196 && g === 154 && b === 58) return 'var(--warning-dim)';
  if ((r === 42 && g === 30 && b === 22) || (r === 42 && g === 22 && b === 8)) return 'var(--border-soft)';
  if (r === 0 && g === 0 && b === 0) {
    if (/background/i.test(line)) return 'color-mix(in srgb, var(--text-primary) 65%, transparent)';
    return 'var(--border-strong)';
  }
  if (r === 248 && g === 251 && b === 255) return 'var(--bg-raised)';
  if (r === 242 && g === 245 && b === 248) return 'var(--bg-canvas)';
  if (r === 21 && g === 16 && b === 8) return 'var(--bg-canvas)';

  if (low in exactColorMap) return exactColorMap.get(low);

  if (a < 1 && /background/i.test(line)) return 'var(--bg-surface)';
  if (a < 1 && /border/i.test(line)) return 'var(--border-soft)';
  return 'var(--text-secondary)';
}

function replaceColorLiterals(line, isCss) {
  // skip SVG fill/stroke attributes in jsx markup
  if (!isCss && /\b(fill|stroke)\s*=\s*['\"]/i.test(line)) return line;

  line = line.replace(hexPattern, (m) => {
    const mapped = exactColorMap.get(m.toLowerCase());
    return mapped || m;
  });

  line = line.replace(rgbaPattern, (m, r, g, b, a) => {
    const rr = Number(r);
    const gg = Number(g);
    const bb = Number(b);
    const replacement = mapRgb(rr, gg, bb, a, line);
    return replacement || m;
  });

  line = line.replace(hslPattern, () => 'var(--text-secondary)');

  return line;
}

function shouldProcessJsTsLine(line) {
  return /style\s*=\s*\{\{|style\s*:\s*\{|boxShadow|background|color\s*:|border|fontFamily|borderRadius|font-family|border-radius/.test(line);
}

function processFile(filePath) {
  const ext = path.extname(filePath);
  const isCss = ext === '.css';
  const text = fs.readFileSync(filePath, 'utf8');
  const lines = text.split(/\r?\n/);
  let changed = false;

  const out = lines.map((line) => {
    const original = line;

    if (isCss && isCssVarDefinitionLine(line)) return line;
    if (!isCss && !shouldProcessJsTsLine(line)) return line;

    line = replaceFontFamilies(line, isCss);
    line = replaceRadius(line, isCss);
    line = replaceColorLiterals(line, isCss);

    // normalize boxShadow color literals already replaced above; keep structure.

    if (line !== original) changed = true;
    return line;
  });

  if (changed) fs.writeFileSync(filePath, out.join('\n'));
  return changed;
}

const files = [];
walk(root, files);
let changedFiles = [];
for (const file of files) {
  if (processFile(file)) changedFiles.push(file);
}

console.log(`Processed ${files.length} files`);
console.log(`Changed ${changedFiles.length} files`);
for (const file of changedFiles) {
  console.log(file);
}
