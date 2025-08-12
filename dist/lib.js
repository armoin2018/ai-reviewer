import { loadRules as ghLoad } from './github.js';
import { summarizeRules as summarize } from './rules.js';
import { normalizeUnifiedDiff as normalize } from './diff.js';
import { assertCompliance as assertC } from './assert.js';
import { getBundledPack as _getBundledPack, listBundled as _listBundled } from './bundled.js';
import { scanDiffForSecrets, scanFiles, getDefaultSecretPatterns, validateSecretPattern } from './secrets.js';
import { validateLicenseHeaders, getDefaultLicenseTemplates, generateLicenseHeader, checkLicenseCompatibility } from './license.js';
import { readMainInstructions, listClaudeDirectory, readClaudeFile, writeClaudeFile, deleteClaudeFile, executeBatchOperations, discoverCommands, validateFileContent } from './claude-directory.js';
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
        return normalize(diff, { stripLevel: strip });
    },
    async assert_compliance(params) {
        let { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, } = params;
        let guidanceText = '';
        if ((!checklist || checklist.length === 0) && owner && repo && ref) {
            const guidance = await ghLoad({ owner, repo, ref });
            guidanceText = guidance?.combinedMarkdown || '';
            checklist = summarize(guidanceText, 400).map(rule => ({ id: rule.id, text: rule.description }));
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
    // .claude Directory Management Skills
    async read_claude_instructions() {
        return await readMainInstructions();
    },
    async list_claude_directory() {
        return await listClaudeDirectory();
    },
    async read_claude_file(params) {
        const { filePath } = params;
        return await readClaudeFile(filePath);
    },
    async write_claude_file(params) {
        const { filePath, content } = params;
        await writeClaudeFile(filePath, content);
        return { success: true, message: `File written: ${filePath}` };
    },
    async delete_claude_file(params) {
        const { filePath } = params;
        await deleteClaudeFile(filePath);
        return { success: true, message: `File deleted: ${filePath}` };
    },
    async validate_claude_file(params) {
        const { filePath, content } = params;
        return validateFileContent(filePath, content);
    },
    async batch_claude_operations(params) {
        const { operations } = params;
        return await executeBatchOperations(operations);
    },
    async discover_claude_commands() {
        return await discoverCommands();
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
    async scan_secrets(params) {
        const { diff, files, options = {} } = params;
        if (diff) {
            return scanDiffForSecrets(diff, options);
        }
        else if (files) {
            return scanFiles(files, options);
        }
        else {
            throw new Error('Either diff or files must be provided');
        }
    },
    async get_secret_patterns() {
        const patterns = getDefaultSecretPatterns();
        return { patterns, count: patterns.length };
    },
    async validate_secret_pattern(params) {
        const { pattern } = params;
        return validateSecretPattern(pattern);
    },
    async validate_license_headers(params) {
        const { files, options = {} } = params;
        return validateLicenseHeaders(files, options);
    },
    async get_license_templates() {
        const templates = getDefaultLicenseTemplates();
        return { templates, count: templates.length };
    },
    async generate_license_header(params) {
        const { filePath, licenseId, copyrightHolder, year } = params;
        const templates = getDefaultLicenseTemplates();
        const template = templates.find(t => t.spdxId === licenseId);
        if (!template) {
            throw new Error(`License template not found: ${licenseId}`);
        }
        const header = generateLicenseHeader(filePath, template, copyrightHolder, year);
        return {
            header,
            template,
            filePath,
            copyrightHolder,
            year: year || new Date().getFullYear()
        };
    },
    async check_license_compatibility(params) {
        const { license1, license2 } = params;
        return checkLicenseCompatibility(license1, license2);
    },
};
