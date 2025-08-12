"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertCompliance = assertCompliance;
const secrets_js_1 = require("./secrets.js");
const license_js_1 = require("./license.js");
const CODE_RE = /\.(ts|tsx|js|jsx|py|go|java|kt|rb|php|cs|cpp|c|rs|sh|swift)$/i;
const TEST_RE = /(test|spec)\.(ts|tsx|js|jsx|py|go|java|kt|rb|php|cs|cpp|c|rs)$/i;
function assertCompliance(params) {
    const { diff, checklist = [], requireTests = true, maxFileBytes = 500_000, guidanceText = '', prLabels = [], prTitle = '', fileContents, } = params;
    const files = parseChangedFiles(diff);
    const codeFiles = files.filter((f) => CODE_RE.test(f));
    const testFiles = files.filter((f) => TEST_RE.test(f));
    const genericFindings = [];
    const directives = parseDirectives(guidanceText);
    const applied = [];
    // Comprehensive secret detection using new secret scanning system
    const secretScanOptions = {
        enableEntropyAnalysis: true,
        minEntropyThreshold: 4.0,
        maxFileSize: maxFileBytes || 1024 * 1024
    };
    const secretScanResult = (0, secrets_js_1.scanDiffForSecrets)(diff, secretScanOptions);
    const secretsDetected = secretScanResult.findings.length;
    if (secretsDetected > 0) {
        // Group secrets by severity for better reporting
        const criticalSecrets = secretScanResult.findings.filter(f => f.severity === 'critical');
        const highSecrets = secretScanResult.findings.filter(f => f.severity === 'high');
        const mediumSecrets = secretScanResult.findings.filter(f => f.severity === 'medium');
        const lowSecrets = secretScanResult.findings.filter(f => f.severity === 'low');
        if (criticalSecrets.length > 0) {
            genericFindings.push({
                level: 'fail',
                note: `CRITICAL: ${criticalSecrets.length} critical secrets detected (${criticalSecrets.map(s => s.type).join(', ')})`
            });
        }
        if (highSecrets.length > 0) {
            genericFindings.push({
                level: 'fail',
                note: `HIGH: ${highSecrets.length} high-severity secrets detected (${highSecrets.map(s => s.type).join(', ')})`
            });
        }
        if (mediumSecrets.length > 0) {
            genericFindings.push({
                level: 'warn',
                note: `MEDIUM: ${mediumSecrets.length} medium-severity secrets detected (${mediumSecrets.map(s => s.type).join(', ')})`
            });
        }
        if (lowSecrets.length > 0) {
            genericFindings.push({
                level: 'warn',
                note: `LOW: ${lowSecrets.length} low-severity secrets detected (${lowSecrets.map(s => s.type).join(', ')})`
            });
        }
        // Add detailed findings for each secret
        for (const secret of secretScanResult.findings) {
            genericFindings.push({
                level: secret.severity === 'critical' || secret.severity === 'high' ? 'fail' : 'warn',
                note: `Secret detected in ${secret.file}:${secret.line} - ${secret.description} (confidence: ${Math.round(secret.confidence * 100)}%)`
            });
        }
    }
    // Advanced license header validation using new license validation system
    let licenseValidationResult = null;
    let licenseViolations = 0;
    if (fileContents && Object.keys(fileContents).length > 0) {
        const filesToValidate = Object.entries(fileContents)
            .filter(([path]) => CODE_RE.test(path))
            .map(([path, content]) => ({ path, content }));
        if (filesToValidate.length > 0) {
            const licenseOptions = {
                // Extract license requirements from guidance text if available
                maxHeaderLines: 50,
                strictMatching: false
            };
            // Parse license requirements from guidance text
            if (guidanceText) {
                const allowedLicensesMatch = guidanceText.match(/allowed[_-]?licenses?[:\s]+([^\n]+)/i);
                const requiredLicensesMatch = guidanceText.match(/required[_-]?licenses?[:\s]+([^\n]+)/i);
                const prohibitedLicensesMatch = guidanceText.match(/(?:prohibited|banned|forbidden)[_-]?licenses?[:\s]+([^\n]+)/i);
                if (allowedLicensesMatch) {
                    licenseOptions.allowedLicenses = allowedLicensesMatch[1]
                        .split(/[,\s]+/)
                        .map(l => l.trim())
                        .filter(Boolean);
                }
                if (requiredLicensesMatch) {
                    licenseOptions.requiredLicenses = requiredLicensesMatch[1]
                        .split(/[,\s]+/)
                        .map(l => l.trim())
                        .filter(Boolean);
                }
                if (prohibitedLicensesMatch) {
                    licenseOptions.prohibitedLicenses = prohibitedLicensesMatch[1]
                        .split(/[,\s]+/)
                        .map(l => l.trim())
                        .filter(Boolean);
                }
            }
            licenseValidationResult = (0, license_js_1.validateLicenseHeaders)(filesToValidate, licenseOptions);
            // Count violations and add findings
            for (const result of licenseValidationResult.results) {
                if (!result.isValid) {
                    licenseViolations++;
                    // Add error-level issues as fail findings
                    const errorIssues = result.issues.filter(issue => issue.severity === 'error');
                    const warningIssues = result.issues.filter(issue => issue.severity === 'warning');
                    if (errorIssues.length > 0) {
                        genericFindings.push({
                            level: 'fail',
                            note: `License compliance failure in ${result.file}: ${errorIssues.map(i => i.message).join('; ')}`
                        });
                    }
                    if (warningIssues.length > 0) {
                        genericFindings.push({
                            level: 'warn',
                            note: `License compliance warning in ${result.file}: ${warningIssues.map(i => i.message).join('; ')}`
                        });
                    }
                }
                // Add suggestions as info-level findings
                if (result.suggestions.length > 0) {
                    for (const suggestion of result.suggestions) {
                        genericFindings.push({
                            level: 'info',
                            note: `License suggestion for ${result.file}: ${suggestion.description}`
                        });
                    }
                }
            }
            // Add summary information
            if (licenseValidationResult.summary.missingHeaders > 0) {
                genericFindings.push({
                    level: 'warn',
                    note: `${licenseValidationResult.summary.missingHeaders} files are missing license headers`
                });
            }
            if (Object.keys(licenseValidationResult.summary.licenseBreakdown).length > 1) {
                const licenses = Object.entries(licenseValidationResult.summary.licenseBreakdown)
                    .map(([license, count]) => `${license}: ${count}`)
                    .join(', ');
                genericFindings.push({
                    level: 'info',
                    note: `License distribution across files: ${licenses}`
                });
            }
        }
    }
    if (!diff.endsWith('\n'))
        genericFindings.push({
            level: 'warn',
            note: 'Diff does not end with a newline (EOF newline recommended).',
        });
    const largeFiles = [];
    if (requireTests && codeFiles.length > 0 && testFiles.length === 0) {
        genericFindings.push({
            level: 'warn',
            note: 'Code changed but no test files changed. Consider adding/updating tests.',
        });
    }
    // Directives
    if (directives.disallowPath.length) {
        applied.push('disallow-path');
        for (const p of directives.disallowPath) {
            const violated = files.filter((f) => p.test(f));
            if (violated.length)
                genericFindings.push({
                    level: 'fail',
                    note: `disallow-path violated: ${p} matched ${violated.join(', ')}`,
                });
        }
    }
    if (directives.forbidPattern.length) {
        applied.push('forbid-pattern');
        for (const p of directives.forbidPattern) {
            const hits = countMatches(diff, p);
            if (hits > 0)
                genericFindings.push({
                    level: 'fail',
                    note: `forbid-pattern hit ${hits} occurrences for ${p}`,
                });
        }
    }
    if (directives.requireFile.length) {
        applied.push('require-file');
        for (const p of directives.requireFile) {
            const present = files.some((f) => p.test(f));
            if (!present)
                genericFindings.push({
                    level: 'fail',
                    note: `require-file not satisfied: expected a changed file matching ${p}`,
                });
        }
    }
    if (directives.requireTests !== null) {
        applied.push('require-tests');
        if (directives.requireTests && codeFiles.length > 0 && testFiles.length === 0) {
            genericFindings.push({
                level: 'fail',
                note: 'Directive require-tests=true violated: no test files changed.',
            });
        }
    }
    // deny-import with line annotations
    if (directives.denyImport.length) {
        applied.push('deny-import');
        const numbered = collectAddedLinesWithNumbersByFile(diff);
        for (const [file, lines] of numbered.entries()) {
            if (!CODE_RE.test(file))
                continue;
            for (const ln of lines)
                for (const p of directives.denyImport)
                    if (p.test(ln.text)) {
                        genericFindings.push({
                            level: 'fail',
                            note: `deny-import violated for ${file}: "${ln.text.trim()}" matches ${p}`,
                        });
                    }
        }
    }
    // header directives (heuristic on added hunks)
    if (directives.enforceLicenseHeader.length) {
        applied.push('enforce-license-header');
        const perFileHunks = collectAddedHunksByFile(diff);
        for (const [file, hunks] of perFileHunks.entries()) {
            if (!CODE_RE.test(file))
                continue;
            const first = hunks[0] || '';
            for (const p of directives.enforceLicenseHeader) {
                if (!p.test(first))
                    genericFindings.push({
                        level: 'fail',
                        note: `enforce-license-header failed for ${file}: header regex ${p} not found in first added hunk`,
                    });
            }
        }
    }
    // Strict header checks against HEAD contents
    // Canonical per-language expansion
    let canonicalLangMap = {};
    if (directives.enforceLicenseHeaderCanonical) {
        canonicalLangMap = canonicalToLangRegex(directives.enforceLicenseHeaderCanonical);
    }
    if (fileContents) {
        if (directives.enforceLicenseHeaderExact.length) {
            applied.push('enforce-license-header-exact');
            for (const [file, content] of Object.entries(fileContents)) {
                if (!CODE_RE.test(file))
                    continue;
                const head = content.slice(0, 2000);
                for (const p of directives.enforceLicenseHeaderExact) {
                    if (!p.test(head))
                        genericFindings.push({
                            level: 'fail',
                            note: `enforce-license-header-exact failed for ${file}: regex ${p} not found at file start`,
                        });
                }
            }
        }
        if (directives.denyHeader.length) {
            applied.push('deny-header');
            for (const [file, content] of Object.entries(fileContents)) {
                if (!CODE_RE.test(file))
                    continue;
                const head = content.slice(0, 2000);
                for (const p of directives.denyHeader)
                    if (p.test(head)) {
                        genericFindings.push({
                            level: 'fail',
                            note: `deny-header violated for ${file}: regex ${p} matched file header`,
                        });
                    }
            }
        }
        if (Object.keys(directives.enforceLicenseHeaderLang).length ||
            directives.enforceLicenseHeaderCanonical) {
            applied.push('enforce-license-header-lang');
            for (const [file, content] of Object.entries(fileContents)) {
                if (!CODE_RE.test(file))
                    continue;
                const lang = extToLang(file);
                if (!lang)
                    continue;
                const langRe = directives.enforceLicenseHeaderLang[lang] || canonicalLangMap[lang];
                if (!langRe)
                    continue;
                const head = content.slice(0, 2000);
                if (!langRe.test(head))
                    genericFindings.push({
                        level: 'fail',
                        note: `enforce-license-header-lang failed for ${file} (lang=${lang}): regex ${langRe} not found at file start`,
                    });
            }
        }
    }
    const findings = (checklist || []).map((r) => ({
        id: r.id,
        status: 'na',
        note: `Cannot deterministically verify: "${truncate(r.text, 120)}". Ensure compliance.`,
    }));
    return {
        summary: {
            filesChanged: files.length,
            codeFilesChanged: codeFiles.length,
            testFilesChanged: testFiles.length,
            secretsDetected,
            licenseViolations,
            licenseValidation: licenseValidationResult?.summary,
            largeFiles,
            directivesApplied: applied,
        },
        findings,
        genericFindings,
        directives: { raw: extractDirectiveLines(guidanceText) },
    };
}
function parseChangedFiles(diff) {
    const files = new Set();
    const lines = diff.replace(/\r\n/g, '\n').split('\n');
    for (const l of lines) {
        const m1 = l.match(/^\+\+\+\s+[ab]\/(.+)$/);
        const m2 = l.match(/^diff --git a\/(.+?) b\/(.+)$/);
        if (m1)
            files.add(m1[1]);
        if (m2) {
            files.add(m2[1]);
            files.add(m2[2]);
        }
    }
    return Array.from(files);
}
function countMatches(s, re) {
    const m = s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
    return m ? m.length : 0;
}
function truncate(s, n) {
    return s.length <= n ? s : s.slice(0, n - 1) + '…';
}
function extractDirectiveLines(md) {
    return md.split(/\r?\n/).filter((l) => l.trim().toUpperCase().startsWith('[ASSERT]'));
}
function collectAddedHunksByFile(diff) {
    const map = new Map();
    let currentFile = null;
    let currentHunk = [];
    const lines = diff.replace(/\r\n/g, '\n').split('\n');
    for (const l of lines) {
        if (l.startsWith('diff --git ')) {
            if (currentFile && currentHunk.length) {
                const arr = map.get(currentFile) || [];
                arr.push(currentHunk.join('\n'));
                map.set(currentFile, arr);
            }
            currentFile = null;
            currentHunk = [];
            continue;
        }
        const mHeader = l.match(/^\+\+\+\s+[ab]\/(.+)$/);
        if (mHeader) {
            if (currentFile && currentHunk.length) {
                const arr = map.get(currentFile) || [];
                arr.push(currentHunk.join('\n'));
                map.set(currentFile, arr);
                currentHunk = [];
            }
            currentFile = mHeader[1];
            if (!map.has(currentFile))
                map.set(currentFile, []);
            continue;
        }
        if (currentFile) {
            if (l.startsWith('@@ ')) {
                if (currentHunk.length) {
                    const arr = map.get(currentFile) || [];
                    arr.push(currentHunk.join('\n'));
                    map.set(currentFile, arr);
                    currentHunk = [];
                }
            }
            else if (l.startsWith('+') && !l.startsWith('+++')) {
                currentHunk.push(l.slice(1));
            }
        }
    }
    if (currentFile && currentHunk.length) {
        const arr = map.get(currentFile) || [];
        arr.push(currentHunk.join('\n'));
        map.set(currentFile, arr);
    }
    return map;
}
function collectAddedLinesWithNumbersByFile(diff) {
    const map = new Map();
    let currentFile = null;
    let newLine = 0;
    const lines = diff.replace(/\r\n/g, '\n').split('\n');
    for (const l of lines) {
        if (l.startsWith('diff --git ')) {
            currentFile = null;
            continue;
        }
        const mHeader = l.match(/^\+\+\+\s+[ab]\/(.+)$/);
        if (mHeader) {
            currentFile = mHeader[1];
            if (!map.has(currentFile))
                map.set(currentFile, []);
            continue;
        }
        const mHunk = l.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
        if (mHunk) {
            newLine = parseInt(mHunk[1] || '0', 10);
            continue;
        }
        if (!currentFile)
            continue;
        if (l.startsWith('+') && !l.startsWith('+++')) {
            map.get(currentFile).push({ line: newLine, text: l.slice(1) });
            newLine++;
        }
        else if (l.startsWith(' ') || l === '') {
            newLine++;
        }
    }
    return map;
}
function extToLang(file) {
    const m = file.toLowerCase().match(/\.([a-z0-9]+)$/);
    const ext = m ? m[1] : '';
    const map = {
        js: 'js',
        jsx: 'js',
        ts: 'ts',
        tsx: 'ts',
        py: 'py',
        go: 'go',
        java: 'java',
        kt: 'kt',
        rb: 'rb',
        php: 'php',
        cs: 'cs',
        cpp: 'cpp',
        cc: 'cpp',
        cxx: 'cpp',
        c: 'c',
        rs: 'rs',
        sh: 'sh',
        swift: 'swift',
    };
    return map[ext] || null;
}
function canonicalToLangRegex(canon) {
    const s = canon.source;
    const wrap = {
        js: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
        ts: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
        py: new RegExp(String.raw `^(?:#!.*\n)?(?:#.*\n)*#.*${s}`),
        go: new RegExp(String.raw `^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
        java: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
        kt: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
        rb: new RegExp(String.raw `^(?:#.*\n)+.*${s}`),
        php: new RegExp(String.raw `^(?:<\?php\s*)?(?:\/\*[\s\S]*?\*\/|(?:\/\/|#).*\n)+.*${s}`),
        cs: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
        cpp: new RegExp(String.raw `^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
        c: new RegExp(String.raw `^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
        rs: new RegExp(String.raw `^(?:(?:\/\/.*\n)+|\/\*[\s\S]*?\*\/)\s*.*${s}`),
        sh: new RegExp(String.raw `^(?:#!.*\n)?(?:#.*\n)+.*${s}`),
        swift: new RegExp(String.raw `^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    };
    return wrap;
}
function parseDirectives(md) {
    const lines = extractDirectiveLines(md);
    const res = {
        disallowPath: [],
        forbidPattern: [],
        requireFile: [],
        requireTests: null,
        maxFileBytes: null,
        requireLabel: [],
        blockCommitType: [],
        enforceLicenseHeader: [],
        denyImport: [],
        enforceLicenseHeaderExact: [],
        denyHeader: [],
        enforceLicenseHeaderLang: {},
        enforceLicenseHeaderCanonical: null,
    };
    for (const raw of lines) {
        const m = raw.match(/^\s*\[ASSERT\]\s*(.+)$/i);
        if (!m)
            continue;
        const stmt = m[1].trim();
        const parts = stmt.split(/:\s*/);
        const key = (parts.shift() || '').trim().toLowerCase();
        const val = parts.join(':').trim();
        try {
            switch (key) {
                case 'disallow-path':
                    res.disallowPath.push(new RegExp(val));
                    break;
                case 'forbid-pattern':
                    res.forbidPattern.push(new RegExp(val));
                    break;
                case 'require-file':
                    res.requireFile.push(new RegExp(val));
                    break;
                case 'require-tests':
                    res.requireTests = /true|1|yes/i.test(val);
                    break;
                case 'max-file-bytes':
                    res.maxFileBytes = Number(val) || null;
                    break;
                case 'require-label':
                    res.requireLabel.push(new RegExp(val));
                    break;
                case 'block-commit-type':
                    res.blockCommitType.push(new RegExp(val));
                    break;
                case 'enforce-license-header':
                    res.enforceLicenseHeader.push(new RegExp(val));
                    break;
                case 'deny-import':
                    res.denyImport.push(new RegExp(val));
                    break;
                case 'enforce-license-header-exact':
                    res.enforceLicenseHeaderExact.push(new RegExp(val));
                    break;
                case 'deny-header':
                    res.denyHeader.push(new RegExp(val));
                    break;
                case 'enforce-license-header-lang':
                    const eq = val.indexOf('=');
                    if (eq > 0) {
                        const lang = val.slice(0, eq).trim().toLowerCase();
                        const pat = val.slice(eq + 1).trim();
                        res.enforceLicenseHeaderLang[lang] = new RegExp(pat);
                    }
                    break;
                case 'enforce-license-header-canonical':
                    res.enforceLicenseHeaderCanonical = new RegExp(val);
                    break;
                default:
                    break;
            }
        }
        catch { }
    }
    return res;
}
//# sourceMappingURL=assert.js.map