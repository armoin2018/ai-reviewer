import fetch from 'node-fetch';
import jwt from 'jsonwebtoken';

const APP_ID = process.env.GH_APP_ID || '';
const PRIVATE_KEY = (process.env.GH_APP_PRIVATE_KEY || '').replace(/\n/g, '\n');

async function appJwt(): Promise<string> {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ iat: now - 60, exp: now + 9 * 60, iss: APP_ID }, PRIVATE_KEY, {
    algorithm: 'RS256',
  });
}

async function installationToken(owner: string): Promise<string> {
  const token = await appJwt();
  const instResp = await fetch(`https://api.github.com/app/installations`, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!instResp.ok) throw new Error(`Installations fetch failed: ${instResp.status}`);
  const inst = await instResp.json();
  const installation = Array.isArray(inst)
    ? inst.find((i: any) => i.account?.login?.toLowerCase() === owner.toLowerCase())
    : undefined;
  if (!installation) throw new Error(`No installation found for owner ${owner}`);
  const tokenResp = await fetch(installation.access_tokens_url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!tokenResp.ok) throw new Error(`Token create failed: ${tokenResp.status}`);
  const created = await tokenResp.json();
  return created.token;
}

async function getJson<T = any>(url: string, token: string): Promise<T> {
  const resp = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github+json' },
  });
  if (!resp.ok) throw new Error(`GitHub API error: ${resp.status} for ${url}`);
  return resp.json() as Promise<T>;
}

export async function getFileContents(params: {
  owner: string;
  repo: string;
  ref: string;
  paths: string[];
}): Promise<Record<string, string>> {
  const { owner, repo, ref, paths } = params;
  const token = await installationToken(owner);
  const out: Record<string, string> = {};
  for (const p of paths) {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(p)}?ref=${encodeURIComponent(ref)}`;
    const resp = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/vnd.github.raw' },
    });
    if (resp.ok) out[p] = await resp.text();
  }
  return out;
}

export async function loadRules({
  owner,
  repo,
  ref,
}: {
  owner: string;
  repo: string;
  ref: string;
}): Promise<{
  copilot: string | null;
  instructions: Record<string, string>;
  personas: Record<string, string>;
  combinedMarkdown: string;
  files: string[];
}> {
  const token = await installationToken(owner);

  async function getContent(path: string): Promise<string | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
    const data: any = await getJson(url, token);
    if (!data || !data.content) return null;
    const buf = Buffer.from(data.content, data.encoding || 'base64');
    return buf.toString('utf8');
  }

  async function listDir(
    path: string,
  ): Promise<Array<{ path: string; type: string; name: string }>> {
    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(ref)}`;
    const data: any = await getJson(url, token);
    if (!Array.isArray(data)) return [];
    return data.map((e: any) => ({ path: e.path, type: e.type, name: e.name }));
  }

  const copilot = await getContent('.github/copilot-instructions.md');
  const instructions: Record<string, string> = {};
  const personas: Record<string, string> = {};
  const files: string[] = [];
  try {
    const ins = await listDir('.github/instructions');
    for (const e of ins)
      if (e.type === 'file' && /\.(md|mdx|txt|ya?ml|json)$/i.test(e.name)) {
        const c = await getContent(e.path);
        if (c) {
          instructions[e.name] = c;
          files.push(e.path);
        }
      }
  } catch {}
  try {
    const per = await listDir('.github/personas');
    for (const e of per)
      if (e.type === 'file' && /\.(md|mdx|txt|ya?ml|json)$/i.test(e.name)) {
        const c = await getContent(e.path);
        if (c) {
          personas[e.name] = c;
          files.push(e.path);
        }
      }
  } catch {}
  if (copilot) files.push('.github/copilot-instructions.md');

  const combinedMarkdown = [
    copilot ? `# .github/copilot-instructions.md\n\n${copilot}` : '',
    ...Object.entries(instructions).map(([k, v]) => `\n\n# .github/instructions/${k}\n\n${v}`),
    ...Object.entries(personas).map(([k, v]) => `\n\n# .github/personas/${k}\n\n${v}`),
  ]
    .filter(Boolean)
    .join('\n');

  return { copilot, instructions, personas, combinedMarkdown, files };
}
