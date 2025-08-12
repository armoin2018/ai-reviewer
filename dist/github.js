import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';
// Simple in-memory cache for GitHub API responses
const cache = new Map();
// Rate limiting state
const rateLimitState = {
    remaining: 5000,
    reset: 0,
    retryAfter: 0
};
// Cache TTL configurations (in milliseconds)
const CACHE_TTL = {
    RULES: 5 * 60 * 1000, // 5 minutes for rules
    FILE_CONTENT: 10 * 60 * 1000, // 10 minutes for file content
    DIRECTORY_LISTING: 2 * 60 * 1000 // 2 minutes for directory listings
};
const APP_ID = process.env.GH_APP_ID || '';
const PRIVATE_KEY = (process.env.GH_APP_PRIVATE_KEY || '').replace(/\\n/g, '\n');
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
async function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
async function getJson(url, token, ttl = 0) {
    // Check cache first
    if (ttl > 0) {
        const cacheKey = `${url}:${token.slice(-10)}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() < cached.timestamp + cached.ttl) {
            return cached.data;
        }
    }
    // Check rate limiting
    if (rateLimitState.retryAfter > Date.now()) {
        const waitTime = rateLimitState.retryAfter - Date.now();
        console.log(`[GitHub API] Rate limited, waiting ${waitTime}ms`);
        await sleep(waitTime);
    }
    // Make request with exponential backoff
    let attempt = 0;
    const maxAttempts = 3;
    while (attempt < maxAttempts) {
        try {
            const resp = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github+json',
                    'User-Agent': 'Copilot-Skillset-Reviewer/0.9.0'
                },
            });
            // Update rate limit state from headers
            if (resp.headers.has('x-ratelimit-remaining')) {
                rateLimitState.remaining = parseInt(resp.headers.get('x-ratelimit-remaining') || '0');
                rateLimitState.reset = parseInt(resp.headers.get('x-ratelimit-reset') || '0') * 1000;
            }
            if (resp.status === 403 && resp.headers.has('retry-after')) {
                const retryAfter = parseInt(resp.headers.get('retry-after') || '0') * 1000;
                rateLimitState.retryAfter = Date.now() + retryAfter;
                if (attempt < maxAttempts - 1) {
                    console.log(`[GitHub API] Rate limited, retry after ${retryAfter}ms (attempt ${attempt + 1}/${maxAttempts})`);
                    await sleep(retryAfter);
                    attempt++;
                    continue;
                }
            }
            if (!resp.ok) {
                throw new Error(`GitHub API error: ${resp.status} ${resp.statusText} for ${url}`);
            }
            const data = await resp.json();
            // Cache successful responses
            if (ttl > 0) {
                const cacheKey = `${url}:${token.slice(-10)}`;
                cache.set(cacheKey, {
                    data,
                    timestamp: Date.now(),
                    ttl
                });
            }
            return data;
        }
        catch (error) {
            if (attempt === maxAttempts - 1)
                throw error;
            const backoffTime = Math.pow(2, attempt) * 1000; // Exponential backoff
            console.log(`[GitHub API] Request failed, retrying in ${backoffTime}ms (attempt ${attempt + 1}/${maxAttempts})`);
            await sleep(backoffTime);
            attempt++;
        }
    }
    throw new Error('GitHub API request failed after all retries');
}
export async function getFileContents(params) {
    const { owner, repo, ref, paths } = params;
    const token = await installationToken(owner);
    const out = {};
    for (const p of paths) {
        const cacheKey = `file:${owner}/${repo}/${ref}/${p}:${token.slice(-10)}`;
        const cached = cache.get(cacheKey);
        if (cached && Date.now() < cached.timestamp + cached.ttl) {
            out[p] = cached.data;
            continue;
        }
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(p)}?ref=${encodeURIComponent(ref)}`;
            const resp = await fetch(url, {
                headers: {
                    Authorization: `Bearer ${token}`,
                    Accept: 'application/vnd.github.raw',
                    'User-Agent': 'Copilot-Skillset-Reviewer/0.9.0'
                },
            });
            if (resp.ok) {
                const content = await resp.text();
                out[p] = content;
                // Cache successful file reads
                cache.set(cacheKey, {
                    data: content,
                    timestamp: Date.now(),
                    ttl: CACHE_TTL.FILE_CONTENT
                });
            }
        }
        catch (error) {
            console.log(`[GitHub] Could not load file ${p}: ${error.message}`);
        }
    }
    return out;
}
export async function loadRules({ owner, repo, ref, }) {
    const token = await installationToken(owner);
    async function getContent(path) {
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
            const data = await getJson(url, token, CACHE_TTL.FILE_CONTENT);
            if (!data || !data.content)
                return null;
            const buf = Buffer.from(data.content, data.encoding || 'base64');
            return buf.toString('utf8');
        }
        catch (error) {
            console.log(`[GitHub] Could not load ${path}: ${error.message}`);
            return null;
        }
    }
    async function listDir(path) {
        try {
            const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
            const data = await getJson(url, token, CACHE_TTL.DIRECTORY_LISTING);
            if (!Array.isArray(data))
                return [];
            return data.map((e) => ({ path: e.path, type: e.type, name: e.name }));
        }
        catch (error) {
            console.log(`[GitHub] Could not list directory ${path}: ${error.message}`);
            return [];
        }
    }
    // Support both .github and .copilot directories
    const copilotGithub = await getContent('.github/copilot-instructions.md');
    const copilotDir = await getContent('.copilot/instructions.md');
    const copilot = copilotDir || copilotGithub; // Prefer .copilot directory
    const instructions = {};
    const personas = {};
    const files = [];
    // Load instructions from both .github/instructions and .copilot/instructions
    const instructionDirs = ['.github/instructions', '.copilot/instructions'];
    for (const dir of instructionDirs) {
        try {
            const ins = await listDir(dir);
            for (const e of ins)
                if (e.type === 'file' && /\.(md|mdx|txt|ya?ml|json)$/i.test(e.name)) {
                    const c = await getContent(e.path);
                    if (c) {
                        // Use filename as key, but prefix with directory if there's a conflict
                        const key = instructions[e.name] ? `${dir}/${e.name}` : e.name;
                        instructions[key] = c;
                        files.push(e.path);
                    }
                }
        }
        catch { }
    }
    // Load personas from both .github/personas and .copilot/personas
    const personaDirs = ['.github/personas', '.copilot/personas'];
    for (const dir of personaDirs) {
        try {
            const per = await listDir(dir);
            for (const e of per)
                if (e.type === 'file' && /\.(md|mdx|txt|ya?ml|json)$/i.test(e.name)) {
                    const c = await getContent(e.path);
                    if (c) {
                        // Use filename as key, but prefix with directory if there's a conflict
                        const key = personas[e.name] ? `${dir}/${e.name}` : e.name;
                        personas[key] = c;
                        files.push(e.path);
                    }
                }
        }
        catch { }
    }
    if (copilotGithub)
        files.push('.github/copilot-instructions.md');
    if (copilotDir)
        files.push('.copilot/instructions.md');
    const combinedMarkdown = [
        copilot ? `# .github/copilot-instructions.md\n\n${copilot}` : '',
        ...Object.entries(instructions).map(([k, v]) => `\n\n# .github/instructions/${k}\n\n${v}`),
        ...Object.entries(personas).map(([k, v]) => `\n\n# .github/personas/${k}\n\n${v}`),
    ]
        .filter(Boolean)
        .join('\n');
    return { copilot, instructions, personas, combinedMarkdown, files };
}
/**
 * Clear GitHub API cache (useful for testing or forced refresh)
 */
export function clearGitHubCache() {
    cache.clear();
    console.log('[GitHub] Cache cleared');
}
/**
 * Get GitHub API cache statistics
 */
export function getGitHubCacheStats() {
    return {
        size: cache.size,
        rateLimitRemaining: rateLimitState.remaining,
        rateLimitReset: new Date(rateLimitState.reset).toISOString(),
        retryAfter: rateLimitState.retryAfter > Date.now() ? rateLimitState.retryAfter - Date.now() : 0
    };
}
