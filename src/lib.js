"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Guidance = exports.Skills = void 0;
const github_js_1 = require("./github.js");
const rules_js_1 = require("./rules.js");
const diff_js_1 = require("./diff.js");
const assert_js_1 = require("./assert.js");
const bundled_js_1 = require("./bundled.js");
const secrets_js_1 = require("./secrets.js");
const license_js_1 = require("./license.js");
const claude_directory_js_1 = require("./claude-directory.js");
exports.Skills = {
    async load_rules(params) {
        return await (0, github_js_1.loadRules)(params);
    },
    async summarize_rules(params) {
        const { markdown, maxItems = 200 } = params;
        return { checklist: (0, rules_js_1.summarizeRules)(markdown, maxItems) };
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
        return (0, diff_js_1.normalizeUnifiedDiff)(diff, { stripLevel: strip });
    },
    async assert_compliance(params) {
        let { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, } = params;
        let guidanceText = '';
        if ((!checklist || checklist.length === 0) && owner && repo && ref) {
            const guidance = await (0, github_js_1.loadRules)({ owner, repo, ref });
            guidanceText = guidance?.combinedMarkdown || '';
            checklist = (0, rules_js_1.summarizeRules)(guidanceText, 400).map(rule => ({ id: rule.id, text: rule.description }));
        }
        return (0, assert_js_1.assertCompliance)({
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
        return await (0, claude_directory_js_1.readMainInstructions)();
    },
    async list_claude_directory() {
        return await (0, claude_directory_js_1.listClaudeDirectory)();
    },
    async read_claude_file(params) {
        const { filePath } = params;
        return await (0, claude_directory_js_1.readClaudeFile)(filePath);
    },
    async write_claude_file(params) {
        const { filePath, content } = params;
        await (0, claude_directory_js_1.writeClaudeFile)(filePath, content);
        return { success: true, message: `File written: ${filePath}` };
    },
    async delete_claude_file(params) {
        const { filePath } = params;
        await (0, claude_directory_js_1.deleteClaudeFile)(filePath);
        return { success: true, message: `File deleted: ${filePath}` };
    },
    async validate_claude_file(params) {
        const { filePath, content } = params;
        return (0, claude_directory_js_1.validateFileContent)(filePath, content);
    },
    async batch_claude_operations(params) {
        const { operations } = params;
        return await (0, claude_directory_js_1.executeBatchOperations)(operations);
    },
    async discover_claude_commands() {
        return await (0, claude_directory_js_1.discoverCommands)();
    },
};
exports.Guidance = {
    list() {
        return (0, bundled_js_1.listBundled)();
    },
    get(packId) {
        return (0, bundled_js_1.getBundledPack)(packId);
    },
    async combine(mode, packId, repoCtx) {
        let org = '';
        if (packId)
            org = (0, bundled_js_1.getBundledPack)(packId).combinedMarkdown;
        let repoText = '';
        if (repoCtx) {
            const g = await (0, github_js_1.loadRules)(repoCtx);
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
            return (0, secrets_js_1.scanDiffForSecrets)(diff, options);
        }
        else if (files) {
            return (0, secrets_js_1.scanFiles)(files, options);
        }
        else {
            throw new Error('Either diff or files must be provided');
        }
    },
    async get_secret_patterns() {
        const patterns = (0, secrets_js_1.getDefaultSecretPatterns)();
        return { patterns, count: patterns.length };
    },
    async validate_secret_pattern(params) {
        const { pattern } = params;
        return (0, secrets_js_1.validateSecretPattern)(pattern);
    },
    async validate_license_headers(params) {
        const { files, options = {} } = params;
        return (0, license_js_1.validateLicenseHeaders)(files, options);
    },
    async get_license_templates() {
        const templates = (0, license_js_1.getDefaultLicenseTemplates)();
        return { templates, count: templates.length };
    },
    async generate_license_header(params) {
        const { filePath, licenseId, copyrightHolder, year } = params;
        const templates = (0, license_js_1.getDefaultLicenseTemplates)();
        const template = templates.find(t => t.spdxId === licenseId);
        if (!template) {
            throw new Error(`License template not found: ${licenseId}`);
        }
        const header = (0, license_js_1.generateLicenseHeader)(filePath, template, copyrightHolder, year);
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
        return (0, license_js_1.checkLicenseCompatibility)(license1, license2);
    },
};
//# sourceMappingURL=lib.js.map