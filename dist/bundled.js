import fs from 'fs';
import path from 'path';
const root = path.resolve(process.cwd(), 'bundled');
export function listBundled() {
    const manifestPath = path.join(root, 'manifest.json');
    if (!fs.existsSync(manifestPath))
        return { packs: [] };
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const packs = Object.entries(manifest).map(([id, v]) => ({
        id,
        title: v.title,
        description: v.description,
        policies: v.paths?.policies || [],
        personas: v.paths?.personas || [],
    }));
    return { packs };
}
export function getBundledPack(packId) {
    const manifestPath = path.join(root, 'manifest.json');
    if (!fs.existsSync(manifestPath))
        throw new Error('manifest not found');
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    const entry = manifest[packId];
    if (!entry)
        throw new Error(`pack not found: ${packId}`);
    const readAll = (paths) => paths.map((p) => {
        const abs = path.resolve(process.cwd(), p);
        return { path: p, content: fs.existsSync(abs) ? fs.readFileSync(abs, 'utf8') : '' };
    });
    const policies = readAll(entry.paths.policies || []);
    const personas = readAll(entry.paths.personas || []);
    const combinedMarkdown = [
        '# Bundled Policies',
        ...policies.map((x) => `\n\n# ${x.path}\n\n${x.content}`),
        '# Bundled Personas',
        ...personas.map((x) => `\n\n# ${x.path}\n\n${x.content}`),
    ].join('\n');
    return {
        id: packId,
        title: entry.title,
        description: entry.description,
        policies,
        personas,
        combinedMarkdown,
    };
}
