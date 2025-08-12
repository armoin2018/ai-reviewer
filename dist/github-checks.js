/**
 * GitHub Check Runs and PR Comment Generation
 * Implements automated code review feedback via GitHub API
 */
import fetch from 'node-fetch';
import { randomUUID } from 'crypto';
// Import existing GitHub auth from github.ts
// Note: This should be refactored to import from github.ts, but doing inline for now
const APP_ID = process.env.GH_APP_ID || '';
const PRIVATE_KEY = (process.env.GH_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
import jwt from 'jsonwebtoken';
async function appJwt() {
    const now = Math.floor(Date.now() / 1000);
    return jwt.sign({ iat: now - 60, exp: now + 9 * 60, iss: APP_ID }, PRIVATE_KEY, {
        algorithm: 'RS256',
    });
}
async function installationToken(owner) {
    const token = await appJwt();
    const instResp = await fetch(`https://api.github.com/app/installations`, {
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!instResp.ok)
        throw new Error(`Installations fetch failed: ${instResp.status}`);
    const inst = await instResp.json();
    const installation = Array.isArray(inst)
        ? inst.find((i) => i.account?.login?.toLowerCase() === owner.toLowerCase())
        : undefined;
    if (!installation)
        throw new Error(`No installation found for owner ${owner}`);
    const tokenResp = await fetch(installation.access_tokens_url, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
    });
    if (!tokenResp.ok)
        throw new Error(`Token create failed: ${tokenResp.status}`);
    const created = await tokenResp.json();
    return created.token;
}
// Rate limiting and retry logic
const retryWithBackoff = async (operation, maxRetries = 3, baseDelay = 1000) => {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            return await operation();
        }
        catch (error) {
            const isRateLimit = error.message?.includes('rate limit') || error.status === 429;
            const isServerError = error.status >= 500;
            if ((isRateLimit || isServerError) && attempt < maxRetries) {
                const delay = baseDelay * Math.pow(2, attempt - 1) + Math.random() * 1000;
                console.warn(`[GITHUB-CHECKS] Attempt ${attempt} failed, retrying in ${Math.round(delay)}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                continue;
            }
            throw error;
        }
    }
    throw new Error('Max retries exceeded');
};
/**
 * Create or update a GitHub Check Run
 */
export async function createCheckRun(owner, repo, options) {
    const correlationId = randomUUID();
    const startTime = Date.now();
    console.log(`[GITHUB-CHECKS] ${correlationId} Creating check run: ${options.name} for ${owner}/${repo}@${options.head_sha}`);
    try {
        const token = await installationToken(owner);
        const requestBody = {
            name: options.name,
            head_sha: options.head_sha,
            status: options.status,
            ...(options.conclusion && { conclusion: options.conclusion }),
            ...(options.started_at && { started_at: options.started_at }),
            ...(options.completed_at && { completed_at: options.completed_at }),
            ...(options.details_url && { details_url: options.details_url }),
            ...(options.external_id && { external_id: options.external_id }),
            ...(options.output && { output: options.output }),
            ...(options.actions && { actions: options.actions })
        };
        const result = await retryWithBackoff(async () => {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`GitHub Check Run creation failed: ${response.status} ${response.statusText}\n${errorBody}`);
            }
            return response.json();
        });
        const duration = Date.now() - startTime;
        console.log(`[GITHUB-CHECKS] ${correlationId} Check run created successfully: ${result.id} (${duration}ms)`);
        return {
            id: result.id,
            url: result.html_url
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[GITHUB-CHECKS] ${correlationId} Check run creation failed (${duration}ms):`, error);
        throw error;
    }
}
/**
 * Update an existing GitHub Check Run
 */
export async function updateCheckRun(owner, repo, checkRunId, updates) {
    const correlationId = randomUUID();
    const startTime = Date.now();
    console.log(`[GITHUB-CHECKS] ${correlationId} Updating check run: ${checkRunId} for ${owner}/${repo}`);
    try {
        const token = await installationToken(owner);
        const requestBody = {
            ...(updates.status && { status: updates.status }),
            ...(updates.conclusion && { conclusion: updates.conclusion }),
            ...(updates.completed_at && { completed_at: updates.completed_at }),
            ...(updates.output && { output: updates.output }),
            ...(updates.actions && { actions: updates.actions })
        };
        const result = await retryWithBackoff(async () => {
            const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/check-runs/${checkRunId}`, {
                method: 'PATCH',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`GitHub Check Run update failed: ${response.status} ${response.statusText}\n${errorBody}`);
            }
            return response.json();
        });
        const duration = Date.now() - startTime;
        console.log(`[GITHUB-CHECKS] ${correlationId} Check run updated successfully: ${result.id} (${duration}ms)`);
        return {
            id: result.id,
            url: result.html_url
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[GITHUB-CHECKS] ${correlationId} Check run update failed (${duration}ms):`, error);
        throw error;
    }
}
/**
 * Create a PR comment
 */
export async function createPRComment(owner, repo, pullNumber, comment) {
    const correlationId = randomUUID();
    const startTime = Date.now();
    console.log(`[GITHUB-CHECKS] ${correlationId} Creating PR comment for ${owner}/${repo}#${pullNumber}`);
    try {
        const token = await installationToken(owner);
        // Choose the appropriate endpoint based on comment type
        const isReviewComment = comment.path && (comment.position || comment.line);
        const endpoint = isReviewComment
            ? `https://api.github.com/repos/${owner}/${repo}/pulls/${pullNumber}/comments`
            : `https://api.github.com/repos/${owner}/${repo}/issues/${pullNumber}/comments`;
        const requestBody = isReviewComment ? {
            body: comment.body,
            ...(comment.commit_id && { commit_id: comment.commit_id }),
            path: comment.path,
            ...(comment.position && { position: comment.position }),
            ...(comment.line && { line: comment.line }),
            ...(comment.side && { side: comment.side }),
            ...(comment.start_line && { start_line: comment.start_line }),
            ...(comment.start_side && { start_side: comment.start_side })
        } : {
            body: comment.body
        };
        const result = await retryWithBackoff(async () => {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'application/vnd.github+json',
                    'Content-Type': 'application/json',
                    'X-Correlation-ID': correlationId
                },
                body: JSON.stringify(requestBody)
            });
            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`GitHub PR comment creation failed: ${response.status} ${response.statusText}\n${errorBody}`);
            }
            return response.json();
        });
        const duration = Date.now() - startTime;
        console.log(`[GITHUB-CHECKS] ${correlationId} PR comment created successfully: ${result.id} (${duration}ms)`);
        return {
            id: result.id,
            url: result.html_url
        };
    }
    catch (error) {
        const duration = Date.now() - startTime;
        console.error(`[GITHUB-CHECKS] ${correlationId} PR comment creation failed (${duration}ms):`, error);
        throw error;
    }
}
/**
 * Generate compliance check run from assert results
 */
export async function createComplianceCheckRun(owner, repo, headSha, complianceResult, detailsUrl) {
    const startTime = Date.now();
    // Process compliance results into annotations
    const annotations = [];
    // Add findings as annotations
    if (complianceResult.findings) {
        for (const finding of complianceResult.findings) {
            if (finding.status === 'fail' && finding.file) {
                annotations.push({
                    path: finding.file,
                    start_line: finding.line || 1,
                    end_line: finding.line || 1,
                    annotation_level: 'failure',
                    message: finding.note,
                    title: `Compliance Issue: ${finding.id}`
                });
            }
            else if (finding.status === 'warn' && finding.file) {
                annotations.push({
                    path: finding.file,
                    start_line: finding.line || 1,
                    end_line: finding.line || 1,
                    annotation_level: 'warning',
                    message: finding.note,
                    title: `Compliance Warning: ${finding.id}`
                });
            }
        }
    }
    // Add generic findings as annotations
    if (complianceResult.genericFindings) {
        for (const finding of complianceResult.genericFindings) {
            if (finding.level === 'fail' || finding.level === 'warn') {
                // For generic findings without file info, we'll create a summary annotation
                annotations.push({
                    path: 'README.md', // Default file for generic issues
                    start_line: 1,
                    end_line: 1,
                    annotation_level: finding.level === 'fail' ? 'failure' : 'warning',
                    message: finding.note,
                    title: `${finding.level === 'fail' ? 'Error' : 'Warning'}: General Issue`
                });
            }
        }
    }
    // Determine overall conclusion
    const hasFailures = complianceResult.findings?.some((f) => f.status === 'fail') ||
        complianceResult.genericFindings?.some((f) => f.level === 'fail');
    const hasWarnings = complianceResult.findings?.some((f) => f.status === 'warn') ||
        complianceResult.genericFindings?.some((f) => f.level === 'warn');
    let conclusion = 'success';
    if (hasFailures) {
        conclusion = 'failure';
    }
    else if (hasWarnings) {
        conclusion = 'neutral'; // Neutral allows merging but shows warnings
    }
    // Generate summary
    const summary = complianceResult.summary;
    const summaryText = `
**Compliance Check Results**

- **Files Changed**: ${summary.filesChanged}
- **Code Files**: ${summary.codeFilesChanged}
- **Test Files**: ${summary.testFilesChanged}
- **Secrets Detected**: ${summary.secretsDetected}
- **License Violations**: ${summary.licenseViolations}

${summary.largeFiles?.length ? `**Large Files**: ${summary.largeFiles.join(', ')}` : ''}

**Directives Applied**: ${summary.directivesApplied?.join(', ') || 'None'}
  `.trim();
    // Create the check run
    const options = {
        name: 'Copilot Skillset Review',
        head_sha: headSha,
        status: 'completed',
        conclusion,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        details_url: detailsUrl,
        external_id: randomUUID(),
        output: {
            title: `Compliance Check ${conclusion === 'success' ? 'Passed' : conclusion === 'failure' ? 'Failed' : 'Completed with Warnings'}`,
            summary: summaryText,
            annotations: annotations.slice(0, 50) // GitHub API limit: max 50 annotations per request
        }
    };
    return await createCheckRun(owner, repo, options);
}
/**
 * Generate PR comment with compliance summary
 */
export async function createCompliancePRComment(owner, repo, pullNumber, complianceResult, checkRunUrl) {
    const summary = complianceResult.summary;
    const hasIssues = (complianceResult.findings?.some((f) => f.status === 'fail' || f.status === 'warn')) ||
        (complianceResult.genericFindings?.some((f) => f.level === 'fail' || f.level === 'warn'));
    let emoji = '✅';
    let status = 'All checks passed!';
    if (hasIssues) {
        const hasFailures = complianceResult.findings?.some((f) => f.status === 'fail') ||
            complianceResult.genericFindings?.some((f) => f.level === 'fail');
        emoji = hasFailures ? '❌' : '⚠️';
        status = hasFailures ? 'Issues found that require attention' : 'Some warnings detected';
    }
    const commentBody = `
## ${emoji} Copilot Skillset Review

**Status**: ${status}

### Summary
- **Files Changed**: ${summary.filesChanged}
- **Code Files**: ${summary.codeFilesChanged} | **Test Files**: ${summary.testFilesChanged}
- **Secrets Detected**: ${summary.secretsDetected} | **License Violations**: ${summary.licenseViolations}

${summary.largeFiles?.length ? `### ⚠️ Large Files Detected\n${summary.largeFiles.map((f) => `- \`${f}\``).join('\n')}\n` : ''}

${complianceResult.findings?.filter((f) => f.status === 'fail').length ?
        `### ❌ Issues Requiring Attention\n${complianceResult.findings.filter((f) => f.status === 'fail').slice(0, 5).map((f) => `- **${f.id}**: ${f.note}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`).join('\n')}\n` : ''}

${complianceResult.findings?.filter((f) => f.status === 'warn').length ?
        `### ⚠️ Warnings\n${complianceResult.findings.filter((f) => f.status === 'warn').slice(0, 3).map((f) => `- **${f.id}**: ${f.note}${f.file ? ` (${f.file}${f.line ? `:${f.line}` : ''})` : ''}`).join('\n')}\n` : ''}

${checkRunUrl ? `[View detailed results in the check run](${checkRunUrl})` : ''}

---
*🤖 Generated by [Copilot Skillset Reviewer](https://github.com/armoinllc/copilot-skillset-reviewer)*
  `.trim();
    const comment = {
        body: commentBody
    };
    return await createPRComment(owner, repo, pullNumber, comment);
}
