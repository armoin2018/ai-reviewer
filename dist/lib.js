import { loadRules as ghLoad } from './github.js';
import { summarizeRules as summarize } from './rules.js';
import { normalizeUnifiedDiff as normalize } from './diff.js';
import { assertCompliance as assertC } from './assert.js';
import { getBundledPack as _getBundledPack, listBundled as _listBundled } from './bundled.js';
export const Skills = {
    async load_rules(params) {
        return await ghLoad(params);
    },
    async summarize_rules(params) {
        const { markdown, maxItems = 200 } = params;
        return { checklist: summarize(markdown, maxItems) };
    },
    async infer_quality_gates(params) {
        const paths = (params.files || []).map((f) => f.path);
        const has = (p) => paths.some((x) => p.test(x));
        const cmds = [];
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
    async normalize_diff(params) {
        const { diff, strip = 0 } = params;
        return normalize(diff, strip);
    },
    async assert_compliance(params) {
        let { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, } = params;
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
    get(packId) {
        return _getBundledPack(packId);
    },
    async combine(mode, packId, repoCtx) {
        let org = '';
        if (packId)
            org = _getBundledPack(packId).combinedMarkdown;
        let repoText = '';
        if (repoCtx) {
            const g = await ghLoad(repoCtx);
            repoText = g.combinedMarkdown;
        }
        if (mode === 'org')
            return org;
        if (mode === 'repo')
            return repoText;
        return [org, repoText].filter(Boolean).join('\n\n');
    },
};
