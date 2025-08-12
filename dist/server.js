import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { summarizeRules, getRuleStatistics } from './rules.js';
import { normalizeUnifiedDiff } from './diff.js';
import { assertCompliance } from './assert.js';
import { scanDiffForSecrets, scanFiles, getDefaultSecretPatterns, validateSecretPattern } from './secrets.js';
import { validateLicenseHeaders, getDefaultLicenseTemplates, generateLicenseHeader, checkLicenseCompatibility } from './license.js';
import { readMainInstructions, listClaudeDirectory, readClaudeFile, writeClaudeFile, deleteClaudeFile, executeBatchOperations, discoverCommands } from './claude-directory.js';
import { getFileContents, loadRules } from './github.js';
import { getBundledPack, listBundled, validateAllBundledPacks } from './bundled.js';
import { ErrorCode } from './types/api.js';
import { apiRateLimit, strictRateLimit, securityHeaders, sanitizeInput, enforceHttps, auditLog, validateLoadRules, validateSummarizeRules, validateNormalizeDiff, validateAssertCompliance, validateFileContents, validateSelectInstructionPack } from './middleware/security.js';
import { performanceMonitor, getPerformanceMetrics, getHealthWithPerformance, generateLogSummary } from './middleware/performance.js';
const app = express();
// Enable trust proxy for rate limiting and IP detection behind reverse proxy
app.set('trust proxy', 1);
// HTTPS enforcement (production only)
app.use(enforceHttps);
// Security headers
app.use(securityHeaders);
// Global rate limiting
app.use(apiRateLimit);
// Request correlation ID middleware
app.use((req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || randomUUID();
    req.headers['x-correlation-id'] = correlationId;
    res.setHeader('x-correlation-id', correlationId);
    next();
});
// Request logging middleware
app.use((req, res, next) => {
    const start = Date.now();
    const correlationId = req.headers['x-correlation-id'];
    console.log(`[${new Date().toISOString()}] ${correlationId} ${req.method} ${req.path} - START`);
    res.on('finish', () => {
        const duration = Date.now() - start;
        console.log(`[${new Date().toISOString()}] ${correlationId} ${req.method} ${req.path} - ${res.statusCode} (${duration}ms)`);
    });
    next();
});
// CORS configuration
app.use(cors({
    origin: process.env.CORS_ORIGINS?.split(',') || true,
    credentials: true,
    methods: ['GET', 'POST', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-correlation-id']
}));
// JSON body parser with 10MB limit
app.use(bodyParser.json({ limit: '10mb' }));
// Input sanitization
app.use(sanitizeInput);
// Performance monitoring
app.use(performanceMonitor);
// Health check endpoint - optimized for <100ms response
app.get('/healthz', getHealthWithPerformance);
// Performance monitoring endpoints
app.get('/metrics', getPerformanceMetrics);
app.get('/logs/summary', generateLogSummary);
app.post('/load-rules', auditLog('LOAD_RULES'), strictRateLimit, ...validateLoadRules, async (req, res, next) => {
    try {
        const { owner, repo, ref } = req.body;
        const guidance = await loadRules({ owner, repo, ref });
        return res.json(guidance);
    }
    catch (e) {
        e.code = e.code || ErrorCode.LOAD_RULES_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/summarize-rules', auditLog('SUMMARIZE_RULES'), ...validateSummarizeRules, async (req, res, next) => {
    try {
        const { markdown, maxItems = 400 } = req.body;
        const checklist = summarizeRules(markdown, maxItems);
        const statistics = getRuleStatistics(checklist);
        return res.json({
            checklist,
            statistics,
            totalItems: checklist.length
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.SUMMARIZE_RULES_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/infer-quality-gates', auditLog('INFER_QUALITY_GATES'), async (req, res, next) => {
    try {
        const files = (req.body?.files || []).map((f) => f.path);
        const has = (re) => files.some((p) => re.test(p));
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
        return res.json({ recommendedCommands: Array.from(new Set(cmds)) });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INFER_QUALITY_GATES_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/normalize-diff', auditLog('NORMALIZE_DIFF'), ...validateNormalizeDiff, async (req, res, next) => {
    try {
        const { diff, strip = 0, maxFileSize = 1024 * 1024, // 1MB default
        allowBinary = true, strictValidation = false } = req.body;
        const result = normalizeUnifiedDiff(diff, {
            stripLevel: strip,
            maxFileSize,
            allowBinary,
            strictValidation
        });
        // Set appropriate HTTP status based on validation result
        if (!result.isValid && strictValidation) {
            return res.status(400).json({
                ...result,
                message: 'Diff validation failed',
                code: ErrorCode.NORMALIZE_DIFF_FAILED
            });
        }
        return res.json(result);
    }
    catch (e) {
        e.code = e.code || ErrorCode.NORMALIZE_DIFF_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/assert-compliance', auditLog('ASSERT_COMPLIANCE'), strictRateLimit, ...validateAssertCompliance, async (req, res, next) => {
    try {
        const { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, prLabels = [], prTitle = '', } = req.body;
        let effectiveChecklist = checklist;
        let guidanceMarkdown = '';
        if ((!effectiveChecklist || effectiveChecklist.length === 0) && owner && repo && ref) {
            const guidance = await loadRules({ owner, repo, ref });
            guidanceMarkdown = guidance.combinedMarkdown || '';
            effectiveChecklist = summarizeRules(guidanceMarkdown, 400);
        }
        // Extract file paths to optionally load HEAD contents if caller asks
        const files = Array.from(new Set(diff
            .replace(/\r\n/g, '\n')
            .split('\n')
            .map((l) => {
            const m1 = l.match(/^\+\+\+\s+[ab]\/([^\s].*)$/);
            if (m1)
                return m1[1];
            const m2 = l.match(/^diff --git a\/(.+?) b\/(.+)$/);
            if (m2)
                return m2[2];
            return null;
        })
            .filter(Boolean)));
        let fileContents = undefined;
        if (owner && repo && ref) {
            fileContents = await getFileContents({ owner, repo, ref, paths: files });
        }
        const result = assertCompliance({
            diff,
            checklist: effectiveChecklist,
            requireTests,
            maxFileBytes,
            guidanceText: guidanceMarkdown,
            prLabels,
            prTitle,
            fileContents,
        });
        return res.json({
            ...result,
            usedChecklistCount: effectiveChecklist?.length || 0,
            guidanceInferred: Boolean(guidanceMarkdown && effectiveChecklist?.length),
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.ASSERT_COMPLIANCE_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/file-contents', auditLog('FILE_CONTENTS'), strictRateLimit, ...validateFileContents, async (req, res, next) => {
    try {
        const { owner, repo, ref, paths } = req.body;
        const contents = await getFileContents({ owner, repo, ref, paths });
        return res.json({ contents, count: Object.keys(contents).length });
    }
    catch (e) {
        e.code = e.code || ErrorCode.FILE_CONTENTS_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/bundled-guidance', auditLog('BUNDLED_GUIDANCE'), async (req, res, next) => {
    try {
        const packId = req.query.packId || '';
        if (packId)
            return res.json(getBundledPack(packId));
        return res.json(listBundled());
    }
    catch (e) {
        e.code = e.code || ErrorCode.BUNDLED_GUIDANCE_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/bundled-guidance/validate', auditLog('BUNDLED_GUIDANCE_VALIDATE'), async (req, res, next) => {
    try {
        const validation = validateAllBundledPacks();
        return res.json(validation);
    }
    catch (e) {
        e.code = e.code || ErrorCode.BUNDLED_GUIDANCE_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/select-instruction-pack', auditLog('SELECT_INSTRUCTION_PACK'), ...validateSelectInstructionPack, async (req, res, next) => {
    try {
        const { packId, owner, repo, ref, mode = 'merged' } = req.body;
        const pack = getBundledPack(packId);
        let combined = pack.combinedMarkdown;
        let files = [];
        if (owner && repo && ref) {
            const guidance = await loadRules({ owner, repo, ref });
            files = guidance.files;
            if (mode === 'org')
                combined = pack.combinedMarkdown;
            else if (mode === 'repo')
                combined = guidance.combinedMarkdown;
            else
                combined = [pack.combinedMarkdown, guidance.combinedMarkdown].filter(Boolean).join('\n\n');
        }
        return res.json({
            pack: { id: pack.id, title: pack.title },
            mode,
            files,
            combinedMarkdown: combined,
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.SELECT_INSTRUCTION_PACK_FAILED;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/scan-secrets', auditLog('SCAN_SECRETS'), async (req, res, next) => {
    try {
        const { diff, files, options = {} } = req.body;
        if (!diff && !files) {
            const error = new Error('Either diff or files must be provided');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        let result;
        if (diff) {
            result = scanDiffForSecrets(diff, options);
        }
        else {
            result = scanFiles(files, options);
        }
        return res.json(result);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/secret-patterns', auditLog('GET_SECRET_PATTERNS'), async (req, res, next) => {
    try {
        const patterns = getDefaultSecretPatterns();
        return res.json({ patterns, count: patterns.length });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/validate-secret-pattern', auditLog('VALIDATE_SECRET_PATTERN'), async (req, res, next) => {
    try {
        const { pattern } = req.body;
        if (!pattern) {
            const error = new Error('Pattern is required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const validation = validateSecretPattern(pattern);
        return res.json(validation);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/validate-license-headers', auditLog('VALIDATE_LICENSE_HEADERS'), async (req, res, next) => {
    try {
        const { files, options = {} } = req.body;
        if (!files || !Array.isArray(files)) {
            const error = new Error('Files array is required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const result = validateLicenseHeaders(files, options);
        return res.json(result);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/license-templates', auditLog('GET_LICENSE_TEMPLATES'), async (req, res, next) => {
    try {
        const templates = getDefaultLicenseTemplates();
        return res.json({ templates, count: templates.length });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/generate-license-header', auditLog('GENERATE_LICENSE_HEADER'), async (req, res, next) => {
    try {
        const { filePath, licenseId, copyrightHolder, year } = req.body;
        if (!filePath || !licenseId || !copyrightHolder) {
            const error = new Error('filePath, licenseId, and copyrightHolder are required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const templates = getDefaultLicenseTemplates();
        const template = templates.find(t => t.spdxId === licenseId);
        if (!template) {
            const error = new Error(`License template not found: ${licenseId}`);
            error.status = 404;
            error.code = ErrorCode.ENDPOINT_NOT_FOUND;
            return next(error);
        }
        const header = generateLicenseHeader(filePath, template, copyrightHolder, year);
        return res.json({
            header,
            template: template,
            filePath,
            copyrightHolder,
            year: year || new Date().getFullYear()
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/check-license-compatibility', auditLog('CHECK_LICENSE_COMPATIBILITY'), async (req, res, next) => {
    try {
        const { license1, license2 } = req.body;
        if (!license1 || !license2) {
            const error = new Error('Both license1 and license2 are required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const compatibility = checkLicenseCompatibility(license1, license2);
        return res.json(compatibility);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
// .claude Directory Management Endpoints
app.get('/claude-instructions', auditLog('READ_CLAUDE_INSTRUCTIONS'), async (req, res, next) => {
    try {
        const instructions = await readMainInstructions();
        return res.json(instructions);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/claude-directory', auditLog('LIST_CLAUDE_DIRECTORY'), async (req, res, next) => {
    try {
        const directory = await listClaudeDirectory();
        return res.json(directory);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/claude-file', auditLog('READ_CLAUDE_FILE'), async (req, res, next) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            const error = new Error('File path is required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const file = await readClaudeFile(filePath);
        return res.json(file);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/claude-file', auditLog('WRITE_CLAUDE_FILE'), strictRateLimit, async (req, res, next) => {
    try {
        const { filePath, content } = req.body;
        if (!filePath || !content) {
            const error = new Error('File path and content are required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        await writeClaudeFile(filePath, content);
        return res.json({
            success: true,
            message: `File written: ${filePath}`,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.delete('/claude-file', auditLog('DELETE_CLAUDE_FILE'), strictRateLimit, async (req, res, next) => {
    try {
        const filePath = req.query.path;
        if (!filePath) {
            const error = new Error('File path is required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        await deleteClaudeFile(filePath);
        return res.json({
            success: true,
            message: `File deleted: ${filePath}`,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/claude-batch-operations', auditLog('CLAUDE_BATCH_OPERATIONS'), strictRateLimit, async (req, res, next) => {
    try {
        const { operations } = req.body;
        if (!Array.isArray(operations)) {
            const error = new Error('Operations array is required');
            error.status = 400;
            error.code = ErrorCode.MISSING_REQUIRED_FIELDS;
            return next(error);
        }
        const result = await executeBatchOperations(operations);
        return res.json(result);
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/claude-commands', auditLog('DISCOVER_CLAUDE_COMMANDS'), async (req, res, next) => {
    try {
        const commands = await discoverCommands();
        return res.json({
            commands,
            count: commands.length,
            timestamp: new Date().toISOString()
        });
    }
    catch (e) {
        e.code = e.code || ErrorCode.INTERNAL_SERVER_ERROR;
        e.status = e.status || 500;
        return next(e);
    }
});
// Error handling middleware (must be last)
app.use((err, req, res, next) => {
    const correlationId = (Array.isArray(req.headers['x-correlation-id'])
        ? req.headers['x-correlation-id'][0]
        : req.headers['x-correlation-id']) || 'unknown';
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${correlationId} ERROR:`, err.message, err.stack);
    // Structured error response
    const errorResponse = {
        error: {
            code: err.code || ErrorCode.INTERNAL_SERVER_ERROR,
            message: err.message || 'An unexpected error occurred',
            correlationId,
            timestamp,
            ...(err.details && { details: err.details })
        }
    };
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json(errorResponse);
});
// 404 handler
app.use((req, res) => {
    const correlationId = (Array.isArray(req.headers['x-correlation-id'])
        ? req.headers['x-correlation-id'][0]
        : req.headers['x-correlation-id']) || 'unknown';
    const errorResponse = {
        error: {
            code: ErrorCode.ENDPOINT_NOT_FOUND,
            message: `Endpoint ${req.method} ${req.path} not found`,
            correlationId,
            timestamp: new Date().toISOString()
        }
    };
    res.status(404).json(errorResponse);
});
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [skillset] Server listening on port ${port}`);
    console.log(`[${new Date().toISOString()}] [skillset] Health check available at http://localhost:${port}/healthz`);
});
export { app };
