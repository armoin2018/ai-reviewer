import fetch from 'node-fetch';
import { Skills } from '../src/lib.js';

const token = process.env.GITHUB_TOKEN;
const repo = process.env.REPO; // owner/repo
const [owner, repoName] = (repo || '').split('/');
const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA;
const pr = process.env.PR_NUMBER;

if (!token || !owner || !repoName || !base || !head || !pr) {
  console.error('Missing required env vars');
  process.exit(1);
}

const cmp = `https://api.github.com/repos/${owner}/${repoName}/compare/${base}...${head}`;
const diffResp = await fetch(cmp, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.v3.diff' } });
if (!diffResp.ok) { console.error('Failed to fetch diff', diffResp.status, await diffResp.text()); process.exit(1); }
const diff = await diffResp.text();

const prInfoApi = `https://api.github.com/repos/${owner}/${repoName}/pulls/${pr}`;
const prInfo = await (await fetch(prInfoApi, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' } })).json();
const labels = (prInfo.labels || []).map((l:any)=> l.name);
const title = prInfo.title || '';

// Collect HEAD contents for strict checks
function parseChangedFiles(diffText: string): string[] {
  const set = new Set<string>();
  for (const l of diffText.split('\n')) {
    const m1 = l.match(/^\+\+\+\s+[ab]\/([^\s].*)$/); if (m1) set.add(m1[1]);
    const m2 = l.match(/^diff --git a\/(.+?) b\/(.+)$/); if (m2) { set.add(m2[1]); set.add(m2[2]); }
  }
  return Array.from(set);
}
const paths = parseChangedFiles(diff).filter(p => p && !p.startsWith('dev/null'));
const contents: Record<string,string> = {};
for (const p of paths) {
  const url = `https://api.github.com/repos/${owner}/${repoName}/contents/${encodeURIComponent(p)}?ref=${head}`;
  const r = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw' } });
  if (r.ok) contents[p] = await r.text();
}

const result = await Skills.assert_compliance({ diff, owner, repo: repoName, ref: head, prLabels: labels, prTitle: title, fileContents: contents });

const summary = [
  `**Skillset Compliance Check**`,
  ``,
  `- Files changed: ${result.summary.filesChanged}`,
  `- Code files changed: ${result.summary.codeFilesChanged}`,
  `- Test files changed: ${result.summary.testFilesChanged}`,
  `- Potential secrets: ${result.summary.secretsDetected}`,
  `- Directives applied: ${result.summary.directivesApplied.join(', ') || 'none'}`,
  ``,
  result.genericFindings.length ? `**Findings:**\n` + result.genericFindings.map((g:any)=>`- ${g.level.toUpperCase()}: ${g.note}`).join('\n') : '_No deterministic findings._',
  ``,
  `> **Copilot Chat hint**: "Review this PR against our repo rules. Use load_rules → summarize_rules → normalize_diff → assert_compliance and propose a minimal patch with tests."`
].join('\n');

// Comment
const issuesApi = `https://api.github.com/repos/${owner}/${repoName}/issues/${pr}/comments`;
await fetch(issuesApi, { method:'POST', headers:{ Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json' }, body: JSON.stringify({ body: summary }) });

// Checks API with basic annotations
function buildAnnotations(result:any) {
  const ann:any[] = [];
  const msgs = (result.genericFindings || []);
  for (const g of msgs) {
    const m = g.note.match(/for\s+([^:\s]+):/i);
    const path = m ? m[1] : (paths[0] || 'README.md');
    ann.push({
      path,
      start_line: 1,
      end_line: 1,
      annotation_level: g.level === 'fail' ? 'failure' : (g.level === 'warn' ? 'warning' : 'notice'),
      message: g.note,
      title: 'Skillset Compliance'
    });
  }
  return ann.slice(0, 50);
}

const checksApi = `https://api.github.com/repos/${owner}/${repoName}/check-runs`;
const failures = (result.genericFindings || []).filter((g:any) => g.level === 'fail');
const conclusion = failures.length ? 'failure' : 'success';
const output = { title: 'Skillset Compliance Check', summary, text: JSON.stringify(result, null, 2), annotations: buildAnnotations(result) };
await fetch(checksApi, { method:'POST', headers:{ Authorization:`Bearer ${token}`, Accept:'application/vnd.github+json' }, body: JSON.stringify({ name:'Skillset Compliance', head_sha: head, status:'completed', conclusion, output }) });
