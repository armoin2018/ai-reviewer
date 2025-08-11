#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const dir = process.argv[2];
if (!dir) {
  console.error('Usage: node scripts/pack-lint.mjs <pack-folder>');
  process.exit(2);
}
const must = ['policies','personas'];
for (const m of must) {
  const p = path.join(dir, m);
  if (!fs.existsSync(p) || !fs.statSync(p).isDirectory()) {
    console.error(`ERROR: Missing ${m}/ subfolder`);
    process.exit(1);
  }
}
const pol = fs.readdirSync(path.join(dir, 'policies')).filter(f => !f.startsWith('.'));
const per = fs.readdirSync(path.join(dir, 'personas')).filter(f => !f.startsWith('.'));
if (pol.length === 0) { console.error('ERROR: No files in policies/'); process.exit(1); }
if (per.length === 0) { console.error('ERROR: No files in personas/'); process.exit(1); }

const directiveRe = /^\s*\[ASSERT\]\s*(.+)$/i;
let directives = [];
for (const f of pol) {
  const full = path.join(dir, 'policies', f);
  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  for (const l of lines) {
    const m = l.match(directiveRe);
    if (m) directives.push(m[1].trim());
  }
}

const validKeys = new Set([
  'disallow-path','forbid-pattern','require-file','require-tests','max-file-bytes','require-label','block-commit-type','enforce-license-header','deny-import','enforce-license-header-exact','deny-header','enforce-license-header-lang','enforce-license-header-canonical'
]);
let ok = true;
for (const d of directives) {
  const parts = d.split(/:\s*/);
  if (parts.length < 2) { console.warn('WARN: Directive missing colon:', d); continue; }
  const key = parts.shift().trim().toLowerCase();
  if (!validKeys.has(key)) { console.warn('WARN: Unknown directive key:', key); }
  const val = parts.join(':').trim();
  if (!['require-tests','max-file-bytes'].includes(key)) {
    try { new RegExp(val); } catch (e) { console.error('ERROR: Invalid regex in directive', key, ':', val); ok = false; }
  } else if (key === 'max-file-bytes') {
    if (!/^\d+$/.test(val)) { console.error('ERROR: max-file-bytes expects a number:', val); ok = false; }
  }
}

if (ok) { console.log('OK: Pack passed validation'); process.exit(0); } else { process.exit(1); }
