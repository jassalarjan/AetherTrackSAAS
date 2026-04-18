const fs = require('fs');
const path = require('path');

const root = path.resolve(process.argv[2] || 'frontend/src');
const targets = new Set(['.css', '.jsx', '.tsx']);
const ignoreDirs = new Set(['node_modules', '.git', 'dist', 'build', '.next', 'coverage', '.turbo']);

const colorRe = /#(?:[0-9a-fA-F]{3,8})\b|rgba?\([^)]*\)|hsla?\([^)]*\)/g;

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

function shouldCheckCssLine(line) {
  if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return false;
  if (/^\s*--[\w-]+\s*:/.test(line)) return false; // CSS variable definition
  return true;
}

function shouldCheckJsTsLine(line) {
  // only style-like lines in JSX/TSX
  return /style\s*=\s*\{\{|style\s*:\s*\{|boxShadow|background|color\s*:|border|fontFamily|borderRadius|font-family|border-radius/.test(line);
}

const files = [];
walk(root, files);

let total = 0;
for (const file of files) {
  const ext = path.extname(file);
  const isCss = ext === '.css';
  const lines = fs.readFileSync(file, 'utf8').split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (isCss) {
      if (!shouldCheckCssLine(line)) continue;
    } else {
      if (!shouldCheckJsTsLine(line)) continue;
      if (/\b(fill|stroke)\s*=\s*['\"]/.test(line)) continue;
    }

    const matches = line.match(colorRe);
    if (!matches) continue;

    for (const m of matches) {
      // ignore variable references and zero-ish rgba
      if (/var\(--/.test(m)) continue;
      total += 1;
      console.log(`${file}:${i + 1}: ${m}`);
    }
  }
}

console.log(`TOTAL_REMAINING=${total}`);
