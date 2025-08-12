import { 
  scanForSecrets, 
  scanFiles, 
  scanDiffForSecrets, 
  getDefaultSecretPatterns, 
  validateSecretPattern,
  SecretPattern,
  SecretScanOptions 
} from '../../src/secrets.js';

describe('Secret Detection System', () => {
  describe('scanForSecrets', () => {
    it('should detect AWS access keys', () => {
      const content = `
        const config = {
          AWS_ACCESS_KEY_ID: "AKIA1234567890123456",
          AWS_SECRET_ACCESS_KEY: "wJalrXUtnFEMI/K7MDENG/bPxRfiCYREALKEY"
        };
      `;
      
      const findings = scanForSecrets(content, 'config.js');
      
      expect(findings.length).toBeGreaterThan(0);
      const awsKeyFinding = findings.find(f => f.type === 'aws_access_key');
      expect(awsKeyFinding).toBeDefined();
      expect(awsKeyFinding?.severity).toBe('critical');
      expect(awsKeyFinding?.file).toBe('config.js');
      expect(awsKeyFinding?.line).toBeGreaterThan(0);
    });

    it('should detect GitHub tokens', () => {
      const content = `
        export const GITHUB_TOKEN = "ghp_1234567890abcdef1234567890abcdef12345678";
      `;
      
      const findings = scanForSecrets(content, 'github-config.ts');
      
      expect(findings.length).toBeGreaterThan(0);
      const githubFinding = findings.find(f => f.type === 'github_token');
      expect(githubFinding).toBeDefined();
      expect(githubFinding?.severity).toBe('high');
    });

    it('should detect private keys', () => {
      const content = `
        const privateKey = \`-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA2Z3QX0realkey123456789
-----END RSA PRIVATE KEY-----\`;
      `;
      
      const findings = scanForSecrets(content, 'keys.js');
      
      expect(findings.length).toBeGreaterThan(0);
      const keyFinding = findings.find(f => f.type === 'rsa_private_key');
      expect(keyFinding).toBeDefined();
      expect(keyFinding?.severity).toBe('critical');
    });

    it('should detect database connection strings', () => {
      const content = `
        const dbUrl = "postgresql://user:password123@localhost:5432/mydb";
      `;
      
      const findings = scanForSecrets(content, 'database.js');
      
      expect(findings.length).toBeGreaterThan(0);
      const dbFinding = findings.find(f => f.type === 'postgres_url');
      expect(dbFinding).toBeDefined();
      expect(dbFinding?.severity).toBe('critical');
    });

    it('should detect JWT tokens', () => {
      const content = `
        const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
      `;
      
      const findings = scanForSecrets(content, 'auth.js');
      
      expect(findings.length).toBeGreaterThan(0);
      const jwtFinding = findings.find(f => f.type === 'jwt_token');
      expect(jwtFinding).toBeDefined();
      expect(jwtFinding?.severity).toBe('high');
    });

    it('should filter false positives', () => {
      const content = `
        const testKey = "YOUR_API_KEY_HERE";
        const exampleKey = "EXAMPLE_KEY_123";
        const placeholderKey = "{{API_KEY}}";
        const envKey = "\${API_KEY}";
      `;
      
      const findings = scanForSecrets(content, 'test-config.js');
      
      // Should not detect these as they are obvious placeholders
      expect(findings.length).toBe(0);
    });

    it('should respect whitelist patterns', () => {
      const content = `
        const apiKey = "AKIA1234567890123456";
      `;
      
      const options: SecretScanOptions = {
        whitelistPatterns: [/AKIA1234567890123456/]
      };
      
      const findings = scanForSecrets(content, 'config.js', options);
      
      expect(findings.length).toBe(0);
    });

    it('should calculate entropy for high-entropy patterns', () => {
      const content = `
        const apiKey = "sk_live_abcdef1234567890abcdef1234567890";
      `;
      
      const findings = scanForSecrets(content, 'stripe-config.js');
      
      if (findings.length > 0) {
        const finding = findings[0];
        expect(finding.entropy).toBeDefined();
        expect(typeof finding.entropy).toBe('number');
      }
    });

    it('should exclude files based on patterns', () => {
      const content = `
        const AWS_ACCESS_KEY_ID = "AKIA1234567890123456";
      `;
      
      const options: SecretScanOptions = {
        excludeFiles: [/node_modules/, /test/]
      };
      
      const findings = scanForSecrets(content, 'node_modules/config.js', options);
      
      expect(findings.length).toBe(0);
    });

    it('should respect file type restrictions', () => {
      const content = `
        const AWS_ACCESS_KEY_ID = "AKIA1234567890123456";
      `;
      
      const options: SecretScanOptions = {
        allowedFileTypes: ['.ts', '.js']
      };
      
      const findingsAllowed = scanForSecrets(content, 'config.js', options);
      const findingsNotAllowed = scanForSecrets(content, 'config.txt', options);
      
      expect(findingsAllowed.length).toBeGreaterThan(0);
      expect(findingsNotAllowed.length).toBe(0);
    });
  });

  describe('scanFiles', () => {
    it('should scan multiple files', () => {
      const files = [
        {
          path: 'config1.js',
          content: 'const AWS_ACCESS_KEY_ID = "AKIA1234567890123456";'
        },
        {
          path: 'config2.js', 
          content: 'const GITHUB_TOKEN = "ghp_1234567890abcdef1234567890abcdef12345678";'
        }
      ];
      
      const result = scanFiles(files);
      
      expect(result.filesScanned).toBe(2);
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(true);
      expect(result.scanTime).toBeGreaterThanOrEqual(0);
    });

    it('should handle scan errors gracefully', () => {
      const files = [
        {
          path: 'valid.js',
          content: 'const test = "value";'
        }
      ];
      
      const result = scanFiles(files);
      
      expect(result.filesScanned).toBe(1);
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });
  });

  describe('scanDiffForSecrets', () => {
    it('should scan only added lines in diff', () => {
      const diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,3 +1,4 @@
 const config = {
   port: 3000,
+  apiKey: "AKIA1234567890123456",
   database: "localhost"
 };`;
      
      const result = scanDiffForSecrets(diff);
      
      expect(result.findings.length).toBeGreaterThan(0);
      expect(result.isValid).toBe(true);
      
      const finding = result.findings[0];
      expect(finding.file).toBe('config.js');
      expect(finding.line).toBe(3); // Line where the secret was added
    });

    it('should ignore removed lines', () => {
      const diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,3 +1,2 @@
 const config = {
-  apiKey: "AKIA1234567890123456",
   database: "localhost"
 };`;
      
      const result = scanDiffForSecrets(diff);
      
      // Should not detect secrets in removed lines
      expect(result.findings.length).toBe(0);
    });

    it('should handle multiple files in diff', () => {
      const diff = `diff --git a/config1.js b/config1.js
index 1234567..abcdefg 100644
--- a/config1.js
+++ b/config1.js
@@ -1,1 +1,2 @@
 const config1 = {};
+const AWS_ACCESS_KEY_ID = "AKIA1234567890123456";
diff --git a/config2.js b/config2.js
index 2345678..bcdefgh 100644
--- a/config2.js
+++ b/config2.js
@@ -1,1 +1,2 @@
 const config2 = {};
+const GITHUB_TOKEN = "ghp_1234567890abcdef1234567890abcdef12345678";`;
      
      const result = scanDiffForSecrets(diff);
      
      expect(result.findings.length).toBe(2);
      expect(result.findings[0].file).toBe('config1.js');
      expect(result.findings[1].file).toBe('config2.js');
    });
  });

  describe('getDefaultSecretPatterns', () => {
    it('should return default patterns', () => {
      const patterns = getDefaultSecretPatterns();
      
      expect(Array.isArray(patterns)).toBe(true);
      expect(patterns.length).toBeGreaterThan(0);
      
      // Check that patterns have required properties
      patterns.forEach(pattern => {
        expect(pattern.name).toBeDefined();
        expect(pattern.pattern).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.severity).toBeDefined();
        expect(pattern.category).toBeDefined();
      });
    });

    it('should include common secret types', () => {
      const patterns = getDefaultSecretPatterns();
      const patternNames = patterns.map(p => p.name);
      
      expect(patternNames).toContain('aws_access_key');
      expect(patternNames).toContain('github_token');
      expect(patternNames).toContain('rsa_private_key');
      expect(patternNames).toContain('jwt_token');
    });
  });

  describe('validateSecretPattern', () => {
    it('should validate correct pattern', () => {
      const pattern: SecretPattern = {
        name: 'test_pattern',
        pattern: /test[_-]?key[=:]\s*[a-zA-Z0-9]+/g,
        description: 'Test pattern',
        severity: 'high',
        category: 'test'
      };
      
      const result = validateSecretPattern(pattern);
      
      expect(result.isValid).toBe(true);
      expect(result.errors.length).toBe(0);
    });

    it('should detect missing required fields', () => {
      const pattern = {
        name: '',
        pattern: /test/g,
        description: '',
        severity: 'high',
        category: ''
      } as SecretPattern;
      
      const result = validateSecretPattern(pattern);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors).toContain('Pattern name is required');
      expect(result.errors).toContain('Pattern description is required');
      expect(result.errors).toContain('Pattern category is required');
    });

    it('should detect invalid regex pattern', () => {
      const pattern = {
        name: 'test',
        pattern: '[' as any, // Invalid regex
        description: 'Test',
        severity: 'high',
        category: 'test'
      } as SecretPattern;
      
      const result = validateSecretPattern(pattern);
      
      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Invalid regex pattern'))).toBe(true);
    });

    it('should validate entropy configuration', () => {
      const pattern: SecretPattern = {
        name: 'test_pattern',
        pattern: /test/g,
        description: 'Test pattern',
        severity: 'high',
        category: 'test',
        entropy: {
          threshold: -1, // Invalid threshold
          charset: '' // Empty charset
        }
      };
      
      const result = validateSecretPattern(pattern);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Entropy threshold must be a positive number');
      expect(result.errors).toContain('Entropy charset is required when entropy config is provided');
    });

    it('should validate severity values', () => {
      const pattern = {
        name: 'test',
        pattern: /test/g,
        description: 'Test',
        severity: 'invalid' as any,
        category: 'test'
      } as SecretPattern;
      
      const result = validateSecretPattern(pattern);
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Pattern severity must be one of: critical, high, medium, low');
    });
  });

  describe('Performance and accuracy', () => {
    it('should scan large content efficiently', () => {
      const largeContent = 'const data = {\n' + 
        'a'.repeat(10000) + ': "value",\n' +
        'apiKey: "AKIA1234567890123456"\n' +
        '};';
      
      const startTime = Date.now();
      const findings = scanForSecrets(largeContent, 'large-file.js');
      const scanTime = Date.now() - startTime;
      
      expect(scanTime).toBeLessThan(1000); // Should complete within 1 second
      expect(findings.length).toBeGreaterThan(0);
    });

    it('should have high confidence for obvious secrets', () => {
      const content = 'const AWS_ACCESS_KEY_ID = "AKIA1234567890123456";';
      const findings = scanForSecrets(content, 'config.js');
      
      expect(findings.length).toBeGreaterThan(0);
      expect(findings[0].confidence).toBeGreaterThan(0.7);
    });

    it('should have lower confidence for ambiguous patterns', () => {
      const content = 'const PASSWORD = "password";';
      const findings = scanForSecrets(content, 'config.js');
      
      if (findings.length > 0) {
        expect(findings[0].confidence).toBeLessThan(0.8);
      }
    });
  });
});