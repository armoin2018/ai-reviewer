import request from 'supertest';
import { app } from '../../src/server.js';

describe('Secret Scanning API Endpoints', () => {
  describe('POST /scan-secrets', () => {
    it('should scan diff for secrets', async () => {
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

      const response = await request(app)
        .post('/scan-secrets')
        .send({ diff })
        .expect(200);

      expect(response.body.findings).toBeDefined();
      expect(Array.isArray(response.body.findings)).toBe(true);
      expect(response.body.filesScanned).toBe(1);
      expect(response.body.isValid).toBe(true);
      expect(typeof response.body.scanTime).toBe('number');
      
      if (response.body.findings.length > 0) {
        const finding = response.body.findings[0];
        expect(finding.type).toBeDefined();
        expect(finding.severity).toBeDefined();
        expect(finding.file).toBeDefined();
        expect(finding.line).toBeGreaterThan(0);
        expect(finding.confidence).toBeGreaterThan(0);
      }
    });

    it('should scan files for secrets', async () => {
      const files = [
        {
          path: 'config.js',
          content: 'const apiKey = "AKIA1234567890123456";'
        },
        {
          path: 'auth.js',
          content: 'const token = "ghp_1234567890abcdef1234567890abcdef12345678";'
        }
      ];

      const response = await request(app)
        .post('/scan-secrets')
        .send({ files })
        .expect(200);

      expect(response.body.findings).toBeDefined();
      expect(response.body.filesScanned).toBe(2);
      expect(response.body.isValid).toBe(true);
      expect(response.body.totalLines).toBeGreaterThan(0);
    });

    it('should accept scan options', async () => {
      const diff = `diff --git a/config.js b/config.js
index 1234567..abcdefg 100644
--- a/config.js
+++ b/config.js
@@ -1,3 +1,4 @@
 const config = {
+  apiKey: "AKIA1234567890123456",
 };`;

      const options = {
        enableEntropyAnalysis: true,
        minEntropyThreshold: 4.0,
        maxFileSize: 1024000
      };

      const response = await request(app)
        .post('/scan-secrets')
        .send({ diff, options })
        .expect(200);

      expect(response.body.findings).toBeDefined();
      expect(response.body.isValid).toBe(true);
    });

    it('should return 400 for missing input', async () => {
      const response = await request(app)
        .post('/scan-secrets')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should handle empty diff', async () => {
      const response = await request(app)
        .post('/scan-secrets')
        .send({ diff: '' })
        .expect(200);

      expect(response.body.findings).toBeDefined();
      expect(response.body.findings.length).toBe(0);
      expect(response.body.isValid).toBe(true);
    });

    it('should include correlation ID in response headers', async () => {
      const diff = 'diff --git a/test.js b/test.js\n+const test = "value";';

      const response = await request(app)
        .post('/scan-secrets')
        .send({ diff })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('GET /secret-patterns', () => {
    it('should return default secret patterns', async () => {
      const response = await request(app)
        .get('/secret-patterns')
        .expect(200);

      expect(response.body.patterns).toBeDefined();
      expect(Array.isArray(response.body.patterns)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.patterns.length).toBe(response.body.count);

      // Check pattern structure
      if (response.body.patterns.length > 0) {
        const pattern = response.body.patterns[0];
        expect(pattern.name).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.severity).toBeDefined();
        expect(pattern.category).toBeDefined();
        expect(['critical', 'high', 'medium', 'low']).toContain(pattern.severity);
      }
    });

    it('should include AWS patterns', async () => {
      const response = await request(app)
        .get('/secret-patterns')
        .expect(200);

      const patternNames = response.body.patterns.map((p: any) => p.name);
      expect(patternNames).toContain('aws_access_key');
      expect(patternNames).toContain('aws_secret_key');
    });

    it('should include GitHub patterns', async () => {
      const response = await request(app)
        .get('/secret-patterns')
        .expect(200);

      const patternNames = response.body.patterns.map((p: any) => p.name);
      expect(patternNames).toContain('github_token');
    });
  });

  describe('POST /validate-secret-pattern', () => {
    it('should validate correct pattern', async () => {
      const pattern = {
        name: 'test_pattern',
        pattern: 'test[_-]?key[=:]\\s*[a-zA-Z0-9]+',
        description: 'Test pattern for validation',
        severity: 'high',
        category: 'test'
      };

      const response = await request(app)
        .post('/validate-secret-pattern')
        .send({ pattern })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBe(0);
    });

    it('should detect invalid pattern', async () => {
      const pattern = {
        name: '', // Missing name
        pattern: '[', // Invalid regex
        description: '', // Missing description
        severity: 'invalid', // Invalid severity
        category: '' // Missing category
      };

      const response = await request(app)
        .post('/validate-secret-pattern')
        .send({ pattern })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toBeDefined();
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should validate entropy configuration', async () => {
      const pattern = {
        name: 'entropy_pattern',
        pattern: 'key[=:]\\s*[a-zA-Z0-9]+',
        description: 'Pattern with entropy',
        severity: 'high',
        category: 'test',
        entropy: {
          threshold: 4.5,
          charset: 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
        }
      };

      const response = await request(app)
        .post('/validate-secret-pattern')
        .send({ pattern })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors.length).toBe(0);
    });

    it('should return 400 for missing pattern', async () => {
      const response = await request(app)
        .post('/validate-secret-pattern')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('Integration with assert-compliance', () => {
    it('should include secret detection in compliance check', async () => {
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

      const response = await request(app)
        .post('/assert-compliance')
        .send({ 
          diff,
          checklist: []
        })
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.secretsDetected).toBeGreaterThan(0);
      expect(response.body.genericFindings).toBeDefined();
      
      // Should have secret-related findings
      const secretFindings = response.body.genericFindings.filter(
        (f: any) => f.note.toLowerCase().includes('secret')
      );
      expect(secretFindings.length).toBeGreaterThan(0);
    });

    it('should not trigger false positives for test patterns', async () => {
      const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 const config = {
+  apiKey: "YOUR_API_KEY_HERE",
+  testKey: "EXAMPLE_KEY_123",
 };`;

      const response = await request(app)
        .post('/assert-compliance')
        .send({ 
          diff,
          checklist: []
        })
        .expect(200);

      expect(response.body.summary.secretsDetected).toBe(0);
    });
  });

  describe('Performance tests', () => {
    it('should handle moderately large diffs efficiently', async () => {
      const lines = Array(50).fill(null).map((_, i) => `+  line${i}: "value${i}",`).join('\n');
      const diff = `diff --git a/large-config.js b/large-config.js
index 1234567..abcdefg 100644
--- a/large-config.js
+++ b/large-config.js
@@ -1,1 +1,51 @@
 const config = {
${lines}
+  apiKey: "AKIA1234567890123456"
 };`;

      const startTime = Date.now();
      const response = await request(app)
        .post('/scan-secrets')
        .send({ diff })
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.findings.length).toBeGreaterThan(0);
    });

    it('should handle multiple file scans efficiently', async () => {
      const files = Array(10).fill(null).map((_, i) => ({
        path: `config${i}.js`,
        content: `const config${i} = { value: "${i === 5 ? 'AKIA1234567890123456' : 'normal_value'}" };`
      }));

      const startTime = Date.now();
      const response = await request(app)
        .post('/scan-secrets')
        .send({ files })
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
      expect(response.body.filesScanned).toBe(10);
      expect(response.body.findings.length).toBeGreaterThan(0);
    });
  });

  describe('Error handling', () => {
    it('should handle malformed request gracefully', async () => {
      const response = await request(app)
        .post('/scan-secrets')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      // Send extremely large content to potentially trigger server error
      const largeContent = 'a'.repeat(10 * 1024 * 1024); // 10MB
      
      const response = await request(app)
        .post('/scan-secrets')
        .send({ 
          files: [{ path: 'huge.js', content: largeContent }],
          options: { maxFileSize: 1024 } // 1KB limit
        })
        .expect(200);

      // Should handle gracefully without crashing
      expect(response.body.findings).toBeDefined();
    });
  });
});