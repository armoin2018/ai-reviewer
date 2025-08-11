type Rule = { id: string; text: string };
type Finding = {
  id: string;
  status: 'pass' | 'fail' | 'warn' | 'na';
  note: string;
  file?: string;
  line?: number;
};
type GenericFinding = { level: 'info' | 'warn' | 'fail'; note: string };

type Directives = {
  disallowPath: RegExp[];
  forbidPattern: RegExp[];
  requireFile: RegExp[];
  requireTests: boolean | null;
  maxFileBytes: number | null;
  requireLabel: RegExp[];
  blockCommitType: RegExp[];
  enforceLicenseHeader: RegExp[];
  denyImport: RegExp[];
  enforceLicenseHeaderExact: RegExp[];
  denyHeader: RegExp[];
  enforceLicenseHeaderLang: Record<string, RegExp>;
  enforceLicenseHeaderCanonical: RegExp | null;
};

type Result = {
  summary: {
    filesChanged: number;
    codeFilesChanged: number;
    testFilesChanged: number;
    secretsDetected: number;
    largeFiles: string[];
    directivesApplied: string[];
  };
  findings: Finding[];
  genericFindings: GenericFinding[];
  directives: { raw: string[] };
};

const CODE_RE = /\.(ts|tsx|js|jsx|py|go|java|kt|rb|php|cs|cpp|c|rs|sh|swift)$/i;
const TEST_RE = /(test|spec)\.(ts|tsx|js|jsx|py|go|java|kt|rb|php|cs|cpp|c|rs)$/i;

export function assertCompliance(params: {
  diff: string;
  checklist?: Rule[];
  requireTests?: boolean;
  maxFileBytes?: number;
  guidanceText?: string;
  prLabels?: string[];
  prTitle?: string;
  fileContents?: Record<string, string>;
}): Result {
  const {
    diff,
    checklist = [],
    requireTests = true,
    maxFileBytes = 500_000,
    guidanceText = '',
    prLabels = [],
    prTitle = '',
    fileContents,
  } = params;
  const files = parseChangedFiles(diff);
  const codeFiles = files.filter((f) => CODE_RE.test(f));
  const testFiles = files.filter((f) => TEST_RE.test(f));
  const genericFindings: GenericFinding[] = [];
  const directives = parseDirectives(guidanceText);
  const applied: string[] = [];

  // Basic secret scan
  const secretPatterns: RegExp[] = [
    /AWS_ACCESS_KEY_ID\s*[:=]\s*["']?[A-Z0-9]{16,20}["']?/,
    /AWS_SECRET_ACCESS_KEY\s*[:=]\s*["']?[A-Za-z0-9\/+=]{30,}["']?/,
    /ghp_[A-Za-z0-9]{36,}/,
    /AIza[0-9A-Za-z\-_]{35}/,
    /xox[baprs]-[A-Za-z0-9-]{10,}/,
  ];
  const secretsDetected = secretPatterns.reduce((acc, re) => acc + countMatches(diff, re), 0);
  if (secretsDetected > 0)
    genericFindings.push({ level: 'fail', note: `Potential secrets detected: ${secretsDetected}` });

  if (!diff.endsWith('\n'))
    genericFindings.push({
      level: 'warn',
      note: 'Diff does not end with a newline (EOF newline recommended).',
    });

  const largeFiles: string[] = [];

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
      if (!CODE_RE.test(file)) continue;
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
      if (!CODE_RE.test(file)) continue;
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
  let canonicalLangMap: Record<string, RegExp> = {};
  if (directives.enforceLicenseHeaderCanonical) {
    canonicalLangMap = canonicalToLangRegex(directives.enforceLicenseHeaderCanonical);
  }
  if (fileContents) {
    if (directives.enforceLicenseHeaderExact.length) {
      applied.push('enforce-license-header-exact');
      for (const [file, content] of Object.entries(fileContents)) {
        if (!CODE_RE.test(file)) continue;
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
        if (!CODE_RE.test(file)) continue;
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
    if (
      Object.keys(directives.enforceLicenseHeaderLang).length ||
      directives.enforceLicenseHeaderCanonical
    ) {
      applied.push('enforce-license-header-lang');
      for (const [file, content] of Object.entries(fileContents)) {
        if (!CODE_RE.test(file)) continue;
        const lang = extToLang(file);
        if (!lang) continue;
        const langRe = directives.enforceLicenseHeaderLang[lang] || canonicalLangMap[lang];
        if (!langRe) continue;
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
      largeFiles,
      directivesApplied: applied,
    },
    findings,
    genericFindings,
    directives: { raw: extractDirectiveLines(guidanceText) },
  };
}

function parseChangedFiles(diff: string): string[] {
  const files = new Set<string>();
  const lines = diff.replace(/\r\n/g, '\n').split('\n');
  for (const l of lines) {
    const m1 = l.match(/^\+\+\+\s+[ab]\/(.+)$/);
    const m2 = l.match(/^diff --git a\/(.+?) b\/(.+)$/);
    if (m1) files.add(m1[1]);
    if (m2) {
      files.add(m2[1]);
      files.add(m2[2]);
    }
  }
  return Array.from(files);
}

function countMatches(s: string, re: RegExp): number {
  const m = s.match(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'));
  return m ? m.length : 0;
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + '…';
}

function extractDirectiveLines(md: string): string[] {
  return md.split(/\r?\n/).filter((l) => l.trim().toUpperCase().startsWith('[ASSERT]'));
}

function collectAddedHunksByFile(diff: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let currentFile: string | null = null;
  let currentHunk: string[] = [];
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
      if (!map.has(currentFile)) map.set(currentFile, []);
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
      } else if (l.startsWith('+') && !l.startsWith('+++')) {
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

function collectAddedLinesWithNumbersByFile(
  diff: string,
): Map<string, Array<{ line: number; text: string }>> {
  const map = new Map<string, Array<{ line: number; text: string }>>();
  let currentFile: string | null = null;
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
      if (!map.has(currentFile)) map.set(currentFile, []);
      continue;
    }
    const mHunk = l.match(/^@@\s+-\d+(?:,\d+)?\s+\+(\d+)(?:,\d+)?\s+@@/);
    if (mHunk) {
      newLine = parseInt(mHunk[1] || '0', 10);
      continue;
    }
    if (!currentFile) continue;
    if (l.startsWith('+') && !l.startsWith('+++')) {
      map.get(currentFile)!.push({ line: newLine, text: l.slice(1) });
      newLine++;
    } else if (l.startsWith(' ') || l === '') {
      newLine++;
    }
  }
  return map;
}

function extToLang(file: string): string | null {
  const m = file.toLowerCase().match(/\.([a-z0-9]+)$/);
  const ext = m ? m[1] : '';
  const map: Record<string, string> = {
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

function canonicalToLangRegex(canon: RegExp): Record<string, RegExp> {
  const s = canon.source;
  const wrap: Record<string, RegExp> = {
    js: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    ts: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    py: new RegExp(String.raw`^(?:#!.*\n)?(?:#.*\n)*#.*${s}`),
    go: new RegExp(String.raw`^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
    java: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    kt: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    rb: new RegExp(String.raw`^(?:#.*\n)+.*${s}`),
    php: new RegExp(String.raw`^(?:<\?php\s*)?(?:\/\*[\s\S]*?\*\/|(?:\/\/|#).*\n)+.*${s}`),
    cs: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
    cpp: new RegExp(String.raw`^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
    c: new RegExp(String.raw`^(?:\/\*[\s\S]*?\*\/|(?:\/\/.*\n)+).*${s}`),
    rs: new RegExp(String.raw`^(?:(?:\/\/.*\n)+|\/\*[\s\S]*?\*\/)\s*.*${s}`),
    sh: new RegExp(String.raw`^(?:#!.*\n)?(?:#.*\n)+.*${s}`),
    swift: new RegExp(String.raw`^\/\*[\s\S]*?${s}[\s\S]*?\*\/`),
  };
  return wrap;
}

function parseDirectives(md: string): Directives {
  const lines = extractDirectiveLines(md);
  const res: Directives = {
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
    if (!m) continue;
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
    } catch {}
  }
  return res;
}
