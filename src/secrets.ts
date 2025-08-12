/**
 * Comprehensive Secret Detection System
 * Implements pattern-based and entropy-based secret detection with configurable patterns
 */

export interface SecretPattern {
  name: string;
  pattern: RegExp;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  entropy?: {
    threshold: number;
    charset: string;
  };
}

export interface SecretFinding {
  id: string;
  type: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  description: string;
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
  confidence: number;
  entropy?: number;
}

export interface SecretScanOptions {
  patterns?: SecretPattern[];
  whitelistPatterns?: RegExp[];
  enableEntropyAnalysis?: boolean;
  minEntropyThreshold?: number;
  maxFileSize?: number;
  allowedFileTypes?: string[];
  excludeFiles?: RegExp[];
}

export interface SecretScanResult {
  findings: SecretFinding[];
  filesScanned: number;
  totalLines: number;
  scanTime: number;
  isValid: boolean;
  errors: string[];
}

/**
 * Default secret patterns covering common credential types
 */
const DEFAULT_SECRET_PATTERNS: SecretPattern[] = [
  // AWS Secrets
  {
    name: 'aws_access_key',
    pattern: /[Aa][Ww][Ss][_-]?[Aa][Cc][Cc][Ee][Ss][Ss][_-]?[Kk][Ee][Yy][_-]?[Ii][Dd][^a-zA-Z0-9]?[=:]\s*[\"']?AKIA[0-9A-Z]{16}[\"']?/g,
    description: 'AWS Access Key ID',
    severity: 'critical',
    category: 'cloud-credentials'
  },
  {
    name: 'aws_secret_key',
    pattern: /[Aa][Ww][Ss][_-]?[Ss][Ee][Cc][Rr][Ee][Tt][_-]?[Aa][Cc][Cc][Ee][Ss][Ss][_-]?[Kk][Ee][Yy][^a-zA-Z0-9]?[=:]\s*[\"']?[A-Za-z0-9/+=]{40}[\"']?/g,
    description: 'AWS Secret Access Key',
    severity: 'critical',
    category: 'cloud-credentials'
  },
  
  // GitHub/GitLab Tokens
  {
    name: 'github_token',
    pattern: /[Gg][Ii][Tt][Hh][Uu][Bb][_-]?[Tt][Oo][Kk][Ee][Nn][^a-zA-Z0-9]?[=:]\s*[\"']?gh[pousr]_[A-Za-z0-9_]{36,255}[\"']?/g,
    description: 'GitHub Personal Access Token',
    severity: 'high',
    category: 'source-control'
  },
  {
    name: 'gitlab_token',
    pattern: /[Gg][Ii][Tt][Ll][Aa][Bb][_-]?[Tt][Oo][Kk][Ee][Nn][^a-zA-Z0-9]?[=:]\s*[\"']?glpat-[A-Za-z0-9_-]{20}[\"']?/g,
    description: 'GitLab Personal Access Token',
    severity: 'high',
    category: 'source-control'
  },
  
  // Database Credentials
  {
    name: 'postgres_url',
    pattern: /postgresql:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_@#$%^&*-]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/g,
    description: 'PostgreSQL Connection String',
    severity: 'critical',
    category: 'database'
  },
  {
    name: 'mysql_url',
    pattern: /mysql:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_@#$%^&*-]+@[a-zA-Z0-9.-]+:\d+\/[a-zA-Z0-9_-]+/g,
    description: 'MySQL Connection String',
    severity: 'critical',
    category: 'database'
  },
  
  // API Keys
  {
    name: 'generic_api_key',
    pattern: /[Aa][Pp][Ii][_-]?[Kk][Ee][Yy][^a-zA-Z0-9]?[=:]\s*[\"']?[A-Za-z0-9_-]{20,}[\"']?/g,
    description: 'Generic API Key',
    severity: 'high',
    category: 'api-credentials',
    entropy: {
      threshold: 4.5,
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_-'
    }
  },
  
  // Private Keys
  {
    name: 'rsa_private_key',
    pattern: /-----BEGIN RSA PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END RSA PRIVATE KEY-----/g,
    description: 'RSA Private Key',
    severity: 'critical',
    category: 'certificates'
  },
  {
    name: 'openssh_private_key',
    pattern: /-----BEGIN OPENSSH PRIVATE KEY-----[A-Za-z0-9+/=\s]+-----END OPENSSH PRIVATE KEY-----/g,
    description: 'OpenSSH Private Key',
    severity: 'critical',
    category: 'certificates'
  },
  
  // JWT Tokens
  {
    name: 'jwt_token',
    pattern: /eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/g,
    description: 'JSON Web Token (JWT)',
    severity: 'high',
    category: 'tokens'
  },
  
  // Slack Tokens
  {
    name: 'slack_token',
    pattern: /xox[bpars]-[0-9a-zA-Z]{10,48}/g,
    description: 'Slack Token',
    severity: 'high',
    category: 'messaging'
  },
  
  // Generic Passwords
  {
    name: 'password_field',
    pattern: /[Pp][Aa][Ss][Ss][Ww][Oo][Rr][Dd][^a-zA-Z0-9]?[=:]\s*[\"']?[A-Za-z0-9@#$%^&*!_-]{8,}[\"']?/g,
    description: 'Password Field',
    severity: 'medium',
    category: 'passwords',
    entropy: {
      threshold: 3.5,
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%^&*!_-'
    }
  },
  
  // Encryption Keys
  {
    name: 'encryption_key',
    pattern: /[Ee][Nn][Cc][Rr][Yy][Pp][Tt]([Ii][Oo][Nn])*[_-]?[Kk][Ee][Yy][^a-zA-Z0-9]?[=:]\s*[\"']?[A-Za-z0-9+/=]{16,}[\"']?/g,
    description: 'Encryption Key',
    severity: 'critical',
    category: 'encryption',
    entropy: {
      threshold: 4.0,
      charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='
    }
  }
];

/**
 * Calculate Shannon entropy for a string to detect high-entropy secrets
 */
function calculateEntropy(str: string): number {
  const freq: Record<string, number> = {};
  const len = str.length;
  
  // Count character frequencies
  for (const char of str) {
    freq[char] = (freq[char] || 0) + 1;
  }
  
  // Calculate entropy
  let entropy = 0;
  for (const count of Object.values(freq)) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }
  
  return entropy;
}

/**
 * Check if a string matches any whitelist patterns
 */
function isWhitelisted(content: string, whitelistPatterns: RegExp[]): boolean {
  return whitelistPatterns.some(pattern => pattern.test(content));
}

/**
 * Extract context around a match for better reporting
 */
function extractContext(content: string, matchIndex: number, matchLength: number, contextLines = 2): string {
  const lines = content.split('\n');
  const beforeMatch = content.substring(0, matchIndex);
  const lineNumber = beforeMatch.split('\n').length - 1;
  
  const startLine = Math.max(0, lineNumber - contextLines);
  const endLine = Math.min(lines.length - 1, lineNumber + contextLines);
  
  return lines.slice(startLine, endLine + 1).join('\n');
}

/**
 * Get file line and column from content index
 */
function getLineColumn(content: string, index: number): { line: number; column: number } {
  const beforeMatch = content.substring(0, index);
  const lines = beforeMatch.split('\n');
  return {
    line: lines.length,
    column: lines[lines.length - 1].length + 1
  };
}

/**
 * Filter false positives based on common patterns
 */
function isFalsePositive(match: string, context: string): boolean {
  const falsePositivePatterns = [
    /test[_-]?key/i,
    /fake[_-]?key/i,
    /dummy[_-]?key/i,
    /sample[_-]?key/i,
    /example[_-]?key/i,
    /placeholder/i,
    /YOUR[_-]?KEY[_-]?HERE/i,
    /REPLACE[_-]?ME/i,
    /\{\{.*\}\}/,  // Template variables
    /\$\{.*\}/,    // Environment variables
    /%.*%/,        // Windows environment variables
    /\[.*\]/       // Placeholder brackets
  ];
  
  const combinedText = `${match} ${context}`.toLowerCase();
  return falsePositivePatterns.some(pattern => pattern.test(combinedText));
}

/**
 * Scan file content for secrets using configured patterns
 */
export function scanForSecrets(
  content: string,
  filePath: string,
  options: SecretScanOptions = {}
): SecretFinding[] {
  const {
    patterns = DEFAULT_SECRET_PATTERNS,
    whitelistPatterns = [],
    enableEntropyAnalysis = true,
    minEntropyThreshold = 4.0,
    maxFileSize = 1024 * 1024, // 1MB
    allowedFileTypes = ['.ts', '.js', '.py', '.java', '.go', '.rb', '.php', '.cs', '.cpp', '.c', '.h'],
    excludeFiles = [/node_modules/, /\.git/, /coverage/, /dist/, /build/]
  } = options;
  
  const findings: SecretFinding[] = [];
  
  // Skip if file is excluded
  if (excludeFiles.some(pattern => pattern.test(filePath))) {
    return findings;
  }
  
  // Skip if file type not allowed
  const fileExt = filePath.substring(filePath.lastIndexOf('.'));
  if (allowedFileTypes.length > 0 && !allowedFileTypes.includes(fileExt)) {
    return findings;
  }
  
  // Skip if file too large
  if (content.length > maxFileSize) {
    return findings;
  }
  
  // Scan with each pattern
  for (const secretPattern of patterns) {
    const matches = Array.from(content.matchAll(secretPattern.pattern));
    
    for (const match of matches) {
      if (match.index === undefined) continue;
      
      const matchedText = match[0];
      const context = extractContext(content, match.index, matchedText.length);
      
      // Skip if whitelisted
      if (isWhitelisted(matchedText, whitelistPatterns)) {
        continue;
      }
      
      // Skip obvious false positives
      if (isFalsePositive(matchedText, context)) {
        continue;
      }
      
      const { line, column } = getLineColumn(content, match.index);
      let confidence = 0.8; // Base confidence
      let entropy: number | undefined;
      
      // Calculate entropy if enabled and pattern has entropy config
      if (enableEntropyAnalysis && secretPattern.entropy) {
        entropy = calculateEntropy(matchedText);
        if (entropy >= secretPattern.entropy.threshold) {
          confidence = Math.min(0.95, confidence + 0.1);
        } else if (entropy < minEntropyThreshold) {
          confidence = Math.max(0.3, confidence - 0.2);
        }
      }
      
      // Adjust confidence based on pattern specificity
      if (secretPattern.name.includes('generic')) {
        confidence = Math.max(0.5, confidence - 0.2);
      }
      
      // Reduce confidence for password patterns as they're often false positives
      if (secretPattern.name === 'password_field') {
        confidence = Math.max(0.3, confidence - 0.3);
      }
      
      findings.push({
        id: `${secretPattern.name}_${line}_${column}`,
        type: secretPattern.name,
        severity: secretPattern.severity,
        category: secretPattern.category,
        description: secretPattern.description,
        file: filePath,
        line,
        column,
        match: matchedText,
        context: context.trim(),
        confidence,
        entropy
      });
    }
  }
  
  return findings;
}

/**
 * Scan multiple files for secrets
 */
export function scanFiles(
  files: Array<{ path: string; content: string }>,
  options: SecretScanOptions = {}
): SecretScanResult {
  const startTime = Date.now();
  const findings: SecretFinding[] = [];
  const errors: string[] = [];
  let totalLines = 0;
  
  try {
    for (const file of files) {
      try {
        totalLines += file.content.split('\n').length;
        const fileFindings = scanForSecrets(file.content, file.path, options);
        findings.push(...fileFindings);
      } catch (error) {
        errors.push(`Error scanning ${file.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
    
    const scanTime = Date.now() - startTime;
    
    return {
      findings,
      filesScanned: files.length,
      totalLines,
      scanTime,
      isValid: errors.length === 0,
      errors
    };
  } catch (error) {
    return {
      findings: [],
      filesScanned: 0,
      totalLines: 0,
      scanTime: Date.now() - startTime,
      isValid: false,
      errors: [`Scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Scan diff content for secrets in changed lines only
 */
export function scanDiffForSecrets(
  diffContent: string,
  options: SecretScanOptions = {}
): SecretScanResult {
  const startTime = Date.now();
  const findings: SecretFinding[] = [];
  const errors: string[] = [];
  
  try {
    const lines = diffContent.split('\n');
    let currentFile = '';
    let lineNumber = 0;
    let totalLines = 0;
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      totalLines++;
      
      // Track current file
      if (line.startsWith('+++')) {
        const match = line.match(/^\+\+\+ b\/(.+)$/);
        if (match) {
          currentFile = match[1];
          lineNumber = 0;
        }
        continue;
      }
      
      // Track line numbers
      if (line.startsWith('@@')) {
        const match = line.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
        if (match) {
          lineNumber = parseInt(match[1], 10) - 1;
        }
        continue;
      }
      
      // Only scan added lines
      if (line.startsWith('+') && !line.startsWith('+++')) {
        lineNumber++;
        const content = line.substring(1); // Remove + prefix
        
        if (currentFile) {
          const lineFindings = scanForSecrets(content, currentFile, options);
          
          // Update line numbers to match diff context
          lineFindings.forEach(finding => {
            finding.line = lineNumber;
            finding.id = `${finding.type}_${currentFile}_${lineNumber}_${finding.column}`;
          });
          
          findings.push(...lineFindings);
        }
      } else if (!line.startsWith('-') && !line.startsWith('\\')) {
        lineNumber++;
      }
    }
    
    return {
      findings,
      filesScanned: 1,
      totalLines,
      scanTime: Date.now() - startTime,
      isValid: true,
      errors
    };
  } catch (error) {
    return {
      findings: [],
      filesScanned: 0,
      totalLines: 0,
      scanTime: Date.now() - startTime,
      isValid: false,
      errors: [`Diff scan failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
    };
  }
}

/**
 * Get default secret patterns for external configuration
 */
export function getDefaultSecretPatterns(): SecretPattern[] {
  return [...DEFAULT_SECRET_PATTERNS];
}

/**
 * Validate secret pattern configuration
 */
export function validateSecretPattern(pattern: SecretPattern): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  if (!pattern.name || pattern.name.trim() === '') {
    errors.push('Pattern name is required');
  }
  
  if (!pattern.pattern) {
    errors.push('Pattern regex is required');
  } else {
    try {
      new RegExp(pattern.pattern);
    } catch (error) {
      errors.push(`Invalid regex pattern: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (!pattern.description || pattern.description.trim() === '') {
    errors.push('Pattern description is required');
  }
  
  if (!['critical', 'high', 'medium', 'low'].includes(pattern.severity)) {
    errors.push('Pattern severity must be one of: critical, high, medium, low');
  }
  
  if (!pattern.category || pattern.category.trim() === '') {
    errors.push('Pattern category is required');
  }
  
  if (pattern.entropy) {
    if (typeof pattern.entropy.threshold !== 'number' || pattern.entropy.threshold <= 0) {
      errors.push('Entropy threshold must be a positive number');
    }
    
    if (!pattern.entropy.charset || pattern.entropy.charset.trim() === '') {
      errors.push('Entropy charset is required when entropy config is provided');
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}