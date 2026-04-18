const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'frontend/src');
const targets = new Set(['.css', '.jsx', '.tsx']);
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo']);

const hexPattern = /#[0-9a-fA-F]{3,8}\b/g;
const rgbaPattern = /rgba?\([^)]*\)/gi;
const hslPattern = /hsla?\([^)]*\)/gi;

function walk(dir, out) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (ignoreDirs.has(e.name)) continue;
      walk(full, out);
      continue;
    }
    if (targets.has(path.extname(e.name))) out.push(full);
  }
}

function cssVarDef(line) {
  return /^\s*--[\w-]+\s*:/.test(line);
}

function styleLikeJsxLine(line) {
  return /style\s*=\s*\{\{|style\s*:\s*\{|boxShadow|background|color\s*:|border|fontFamily|borderRadius|font-family|border-radius/.test(line);
}

function fallbackByContext(line) {
  const low = line.toLowerCase();
  if (low.includes('boxshadow') || low.includes('box-shadow')) return 'var(--shadow-md)';
  if (low.includes('background') || low.includes('bg-')) {
    if (low.includes('gradient')) return 'var(--brand)';
    return 'var(--bg-surface)';
  }
  if (low.includes('border')) return 'var(--border-soft)';
  if (low.includes('color')) return 'var(--text-secondary)';
  return 'var(--text-secondary)';
}

function replaceLineColors(line) {
  if (/\b(fill|stroke)\s*=\s*['\"]/.test(line)) return line;

  if (/boxShadow\s*:\s*['\"][^'\"]*(#|rgb|hsl)/.test(line)) {
    return line.replace(/boxShadow\s*:\s*['\"][^'\"]+['\"]/g, "boxShadow: 'var(--shadow-md)'");
  }
  if (/box-shadow\s*:\s*[^;]*(#|rgb|hsl)/.test(line)) {
    return line.replace(/box-shadow\s*:\s*[^;]+;/g, 'box-shadow: var(--shadow-md);');
  }

  const replacement = fallbackByContext(line);
  line = line.replace(hexPattern, replacement);
  line = line.replace(rgbaPattern, replacement);
  line = line.replace(hslPattern, replacement);

  return line;
}

const files = [];
walk(root, files);
let changed = 0;
for (const file of files) {
  const ext = path.extname(file);
  const isCss = ext === '.css';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  let touched = false;

  const out = lines.map((line) => {
    const original = line;

    if (isCss) {
      if (cssVarDef(line)) return line;
      // skip selector-only lines with escaped utility names
      if (/^\s*\.[^\{]*\{?\s*$/.test(line) && line.includes('#')) return line;
      if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return line;
    } else {
      if (!styleLikeJsxLine(line)) return line;
    }

    if (!/(#(?:[0-9a-fA-F]{3,8})\b|rgba?\(|hsla?\()/.test(line)) return line;

    line = replaceLineColors(line);

    if (line !== original) touched = true;
    return line;
  });

  if (touched) {
    fs.writeFileSync(file, out.join('\n'));
    changed += 1;
    console.log(file);
  }
}

console.log(`CHANGED_FILES=${changed}`);
