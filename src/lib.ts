import { loadRules as ghLoad } from './github.js';
import { summarizeRules as summarize } from './rules.js';
import { normalizeUnifiedDiff as normalize } from './diff.js';
import { assertCompliance as assertC } from './assert.js';
import { getBundledPack as _getBundledPack, listBundled as _listBundled } from './bundled.js';

export const Skills = {
  async load_rules(params: { owner: string; repo: string; ref: string }) {
    return await ghLoad(params);
  },
  async summarize_rules(params: { markdown: string; maxItems?: number }) {
    const { markdown, maxItems = 200 } = params;
    return { checklist: summarize(markdown, maxItems) };
  },
  async infer_quality_gates(params: {
    files: Array<{ path: string; size?: number; sha?: string }>;
    languageHints?: string[];
  }) {
    const paths = (params.files || []).map((f) => f.path);
    const has = (p: RegExp) => paths.some((x) => p.test(x));
    const cmds: string[] = [];
    if (has(/package\.json$/)) {
      cmds.push('npm run -s lint || true', 'npm test --silent || true');
    }
    if (has(/pyproject\.toml$|requirements\.txt$/)) {
      cmds.push('ruff check . || true', 'pytest -q || true');
    }
    if (has(/go\.mod$/)) {
      cmds.push('go vet ./... || true', 'go test ./... || true');
    }
    if (has(/pom\.xml$|build\.gradle/)) {
      cmds.push('mvn -q test || true');
    }
    return { recommendedCommands: Array.from(new Set(cmds)) };
  },
  async normalize_diff(params: { diff: string; strip?: number }) {
    const { diff, strip = 0 } = params;
    return normalize(diff, strip);
  },
  async assert_compliance(params: {
    diff: string;
    checklist?: Array<{ id: string; text: string }>;
    requireTests?: boolean;
    maxFileBytes?: number;
    owner?: string;
    repo?: string;
    ref?: string;
    prLabels?: string[];
    prTitle?: string;
    fileContents?: Record<string, string>;
  }) {
    let {
      diff,
      checklist = [],
      requireTests = true,
      maxFileBytes = 500000,
      owner,
      repo,
      ref,
    } = params;
    let guidanceText = '';
    if ((!checklist || checklist.length === 0) && owner && repo && ref) {
      const guidance = await ghLoad({ owner, repo, ref });
      guidanceText = guidance?.combinedMarkdown || '';
      checklist = summarize(guidanceText, 400);
    }
    return assertC({
      diff,
      checklist,
      requireTests,
      maxFileBytes,
      guidanceText,
      prLabels: params.prLabels,
      prTitle: params.prTitle,
      fileContents: params.fileContents,
    });
  },
};

export const Guidance = {
  list() {
    return _listBundled();
  },
  get(packId: string) {
    return _getBundledPack(packId);
  },
  async combine(
    mode: 'org' | 'repo' | 'merged',
    packId: string | null,
    repoCtx?: { owner: string; repo: string; ref: string },
  ) {
    let org = '';
    if (packId) org = _getBundledPack(packId).combinedMarkdown;
    let repoText = '';
    if (repoCtx) {
      const g = await ghLoad(repoCtx);
      repoText = g.combinedMarkdown;
    }
    if (mode === 'org') return org;
    if (mode === 'repo') return repoText;
    return [org, repoText].filter(Boolean).join('\n\n');
  },
};
