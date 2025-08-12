import fs from 'fs';
import path from 'path';

const root = path.resolve(process.cwd(), 'bundled');
const PACK_VERSION = '1.0.0'; // Default version for existing packs

export interface BundledPackManifest {
  title: string;
  description: string;
  version?: string;
  paths: {
    policies: string[];
    personas: string[];
  };
}

export interface BundledPackInfo {
  id: string;
  title: string;
  description: string;
  version: string;
  policies: string[];
  personas: string[];
}

export interface BundledPackContent {
  id: string;
  title: string;
  description: string;
  version: string;
  policies: Array<{ path: string; content: string }>;
  personas: Array<{ path: string; content: string }>;
  combinedMarkdown: string;
  isValid: boolean;
  validationErrors: string[];
}

/**
 * Validates a bundled pack structure and content
 */
export function validateBundledPack(packId: string, manifest: BundledPackManifest): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  // Check required fields
  if (!manifest.title?.trim()) {
    errors.push(`Pack ${packId}: title is required`);
  }
  if (!manifest.description?.trim()) {
    errors.push(`Pack ${packId}: description is required`);
  }
  if (!manifest.paths) {
    errors.push(`Pack ${packId}: paths object is required`);
  } else {
    if (!Array.isArray(manifest.paths.policies)) {
      errors.push(`Pack ${packId}: paths.policies must be an array`);
    }
    if (!Array.isArray(manifest.paths.personas)) {
      errors.push(`Pack ${packId}: paths.personas must be an array`);
    }
  }
  
  // Validate file existence
  if (manifest.paths) {
    const allFiles = [...(manifest.paths.policies || []), ...(manifest.paths.personas || [])];
    for (const filePath of allFiles) {
      const absolutePath = path.resolve(process.cwd(), filePath);
      if (!fs.existsSync(absolutePath)) {
        errors.push(`Pack ${packId}: file not found: ${filePath}`);
      } else {
        // Check file has content
        const content = fs.readFileSync(absolutePath, 'utf8').trim();
        if (!content) {
          errors.push(`Pack ${packId}: file is empty: ${filePath}`);
        }
      }
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Lists all available bundled packs with metadata
 */
export function listBundled(): { packs: BundledPackInfo[] } {
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    return { packs: [] };
  }
  
  let manifest: Record<string, BundledPackManifest>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    console.error('Failed to parse bundled pack manifest:', error);
    return { packs: [] };
  }
  
  const packs = Object.entries(manifest).map(([id, packManifest]): BundledPackInfo => ({
    id,
    title: packManifest.title,
    description: packManifest.description,
    version: packManifest.version || PACK_VERSION,
    policies: packManifest.paths?.policies || [],
    personas: packManifest.paths?.personas || [],
  }));
  
  return { packs };
}
/**
 * Gets a specific bundled pack with full content and validation
 */
export function getBundledPack(packId: string): BundledPackContent {
  const manifestPath = path.join(root, 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error('Bundled pack manifest not found');
  }
  
  let manifest: Record<string, BundledPackManifest>;
  try {
    manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to parse bundled pack manifest: ${error}`);
  }
  
  const entry = manifest[packId];
  if (!entry) {
    throw new Error(`Bundled pack not found: ${packId}`);
  }
  
  // Validate the pack
  const validation = validateBundledPack(packId, entry);
  
  const readAll = (paths: string[]) =>
    paths.map((p) => {
      const abs = path.resolve(process.cwd(), p);
      let content = '';
      if (fs.existsSync(abs)) {
        try {
          content = fs.readFileSync(abs, 'utf8');
        } catch (error) {
          console.error(`Failed to read file ${p}:`, error);
        }
      }
      return { path: p, content };
    });
  
  const policies = readAll(entry.paths.policies || []);
  const personas = readAll(entry.paths.personas || []);
  
  // Generate combined markdown with better structure
  const combinedMarkdown = [
    `# ${entry.title}`,
    ``,
    `${entry.description}`,
    ``,
    `**Version**: ${entry.version || PACK_VERSION}`,
    ``,
    '## Policies',
    ...policies.map((x) => `\n### ${path.basename(x.path, '.md')}\n\n${x.content}`),
    '',
    '## Personas',
    ...personas.map((x) => `\n### ${path.basename(x.path, '.md')}\n\n${x.content}`),
  ].join('\n');
  
  return {
    id: packId,
    title: entry.title,
    description: entry.description,
    version: entry.version || PACK_VERSION,
    policies,
    personas,
    combinedMarkdown,
    isValid: validation.isValid,
    validationErrors: validation.errors,
  };
}

/**
 * Validates all bundled packs and returns a summary
 */
export function validateAllBundledPacks(): { 
  valid: string[], 
  invalid: Array<{ packId: string; errors: string[] }>,
  total: number 
} {
  const { packs } = listBundled();
  const valid: string[] = [];
  const invalid: Array<{ packId: string; errors: string[] }> = [];
  
  const manifestPath = path.join(root, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  for (const pack of packs) {
    const validation = validateBundledPack(pack.id, manifest[pack.id]);
    if (validation.isValid) {
      valid.push(pack.id);
    } else {
      invalid.push({ packId: pack.id, errors: validation.errors });
    }
  }
  
  return {
    valid,
    invalid,
    total: packs.length
  };
}
