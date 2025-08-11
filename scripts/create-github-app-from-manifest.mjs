#!/usr/bin/env node
/**
 * Convert a one-time GitHub App manifest code into a real App via the GitHub API.
 * Usage: node scripts/create-github-app-from-manifest.mjs <one-time-code>
 */
import fetch from 'node-fetch';
const code = process.argv[2];
if (!code) {
  console.error('Usage: node scripts/create-github-app-from-manifest.mjs <one-time-code>');
  process.exit(2);
}
// The code is provided by GitHub when you create from a manifest in the UI.
const url = `https://api.github.com/app-manifests/${encodeURIComponent(code)}/conversions`;
const resp = await fetch(url, { method: 'POST', headers: { Accept: 'application/vnd.github+json' } });
if (!resp.ok) {
  console.error('Conversion failed', resp.status, await resp.text());
  process.exit(1);
}
const data = await resp.json();
console.log('App created:');
console.log(JSON.stringify(data, null, 2));
