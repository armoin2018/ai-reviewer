import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import { randomUUID } from 'crypto';
import { summarizeRules } from './rules.js';
import { normalizeUnifiedDiff } from './diff.js';
import { assertCompliance } from './assert.js';
import { getFileContents, loadRules } from './github.js';
import { getBundledPack, listBundled } from './bundled.js';
const app = express();
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
// Health check endpoint - optimized for <100ms response
app.get('/healthz', (_req, res) => {
    res.json({
        ok: true,
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        version: process.env.npm_package_version || '0.9.0'
    });
});
app.post('/load-rules', async (req, res, next) => {
    try {
        const { owner, repo, ref } = req.body ?? {};
        if (!owner || !repo || !ref) {
            const error = new Error('owner, repo, ref required');
            error.code = 'MISSING_REQUIRED_FIELDS';
            error.status = 400;
            return next(error);
        }
        const guidance = await loadRules({ owner, repo, ref });
        return res.json(guidance);
    }
    catch (e) {
        e.code = e.code || 'LOAD_RULES_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/summarize-rules', async (req, res, next) => {
    try {
        const { markdown, maxItems = 200 } = req.body ?? {};
        if (typeof markdown !== 'string') {
            const error = new Error('markdown required');
            error.code = 'INVALID_MARKDOWN_FIELD';
            error.status = 400;
            return next(error);
        }
        return res.json({ checklist: summarizeRules(markdown, maxItems) });
    }
    catch (e) {
        e.code = e.code || 'SUMMARIZE_RULES_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/infer-quality-gates', async (req, res, next) => {
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
        e.code = e.code || 'INFER_QUALITY_GATES_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/normalize-diff', async (req, res, next) => {
    try {
        const { diff, strip = 0 } = req.body ?? {};
        if (!diff) {
            const error = new Error('diff required');
            error.code = 'MISSING_DIFF_FIELD';
            error.status = 400;
            return next(error);
        }
        return res.json(normalizeUnifiedDiff(diff, strip));
    }
    catch (e) {
        e.code = e.code || 'NORMALIZE_DIFF_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/assert-compliance', async (req, res, next) => {
    try {
        const { diff, checklist = [], requireTests = true, maxFileBytes = 500000, owner, repo, ref, prLabels = [], prTitle = '', } = req.body ?? {};
        if (!diff) {
            const error = new Error('diff required');
            error.code = 'MISSING_DIFF_FIELD';
            error.status = 400;
            return next(error);
        }
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
        e.code = e.code || 'ASSERT_COMPLIANCE_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/file-contents', async (req, res, next) => {
    try {
        const { owner, repo, ref, paths } = req.body ?? {};
        if (!owner || !repo || !ref || !Array.isArray(paths)) {
            const error = new Error('owner, repo, ref, paths[] required');
            error.code = 'MISSING_REQUIRED_FIELDS';
            error.status = 400;
            return next(error);
        }
        const contents = await getFileContents({ owner, repo, ref, paths });
        return res.json({ contents, count: Object.keys(contents).length });
    }
    catch (e) {
        e.code = e.code || 'FILE_CONTENTS_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.get('/bundled-guidance', async (req, res, next) => {
    try {
        const packId = req.query.packId || '';
        if (packId)
            return res.json(getBundledPack(packId));
        return res.json(listBundled());
    }
    catch (e) {
        e.code = e.code || 'BUNDLED_GUIDANCE_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
app.post('/select-instruction-pack', async (req, res, next) => {
    try {
        const { packId, owner, repo, ref, mode = 'merged' } = req.body ?? {};
        if (!packId) {
            const error = new Error('packId required');
            error.code = 'MISSING_PACK_ID';
            error.status = 400;
            return next(error);
        }
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
        e.code = e.code || 'SELECT_INSTRUCTION_PACK_FAILED';
        e.status = e.status || 500;
        return next(e);
    }
});
// Error handling middleware (must be last)
app.use((err, req, res, next) => {
    const correlationId = req.headers['x-correlation-id'] || 'unknown';
    const timestamp = new Date().toISOString();
    console.error(`[${timestamp}] ${correlationId} ERROR:`, err.message, err.stack);
    // Structured error response
    const errorResponse = {
        error: {
            code: err.code || 'INTERNAL_SERVER_ERROR',
            message: err.message || 'An unexpected error occurred',
            correlationId,
            timestamp
        }
    };
    const statusCode = err.status || err.statusCode || 500;
    res.status(statusCode).json(errorResponse);
});
// 404 handler
app.use((req, res) => {
    const correlationId = req.headers['x-correlation-id'] || 'unknown';
    res.status(404).json({
        error: {
            code: 'ENDPOINT_NOT_FOUND',
            message: `Endpoint ${req.method} ${req.path} not found`,
            correlationId,
            timestamp: new Date().toISOString()
        }
    });
});
const port = Number(process.env.PORT || 8080);
app.listen(port, () => {
    console.log(`[${new Date().toISOString()}] [skillset] Server listening on port ${port}`);
    console.log(`[${new Date().toISOString()}] [skillset] Health check available at http://localhost:${port}/healthz`);
});
