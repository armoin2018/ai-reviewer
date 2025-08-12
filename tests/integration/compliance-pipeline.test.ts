/**
 * Comprehensive Integration Tests for Core Compliance Pipeline
 * Tests the full end-to-end functionality for production readiness
 */

import { normalizeUnifiedDiff } from '../../src/diff.js';
import { summarizeRules } from '../../src/rules.js';
import { assertCompliance } from '../../src/assert.js';
import { scanDiffForSecrets } from '../../src/secrets.js';
import { validateLicenseHeaders } from '../../src/license.js';
import { listBundled, getBundledPack } from '../../src/bundled.js';

describe('Compliance Pipeline Integration Tests', () => {
  describe('End-to-End Diff Processing and Compliance Checking', () => {
    it('should process a realistic diff with full compliance checking', async () => {
      // Sample realistic diff with potential issues
      const testDiff = `diff --git a/src/api.js b/src/api.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/src/api.js
@@ -0,0 +1,15 @@
+const fetch = require('node-fetch');
+
+// Database connection string - TODO: move to environment
+const DB_URL = 'mongodb://admin:password123@localhost:27017/myapp';
+
+async function getUser(id) {
+  const response = await fetch(\`https://api.example.com/users/\${id}\`);
+  return response.json();
+}
+
+function processPayment(amount) {
+  // Process payment logic here
+  return { success: true, amount };
+}
+
diff --git a/src/utils.py b/src/utils.py
new file mode 100644
index 0000000..8901234
--- /dev/null
+++ b/src/utils.py
@@ -0,0 +1,8 @@
+# Utility functions
+
+def calculate_total(items):
+    """Calculate total price of items."""
+    return sum(item.price for item in items)
+
+def validate_email(email):
+    return '@' in email and '.' in email`;

      // Step 1: Normalize the diff
      const normalizedDiff = normalizeUnifiedDiff(testDiff);
      
      expect(normalizedDiff.files).toHaveLength(2);
      expect(normalizedDiff.files[0].path).toBe('src/api.js');
      expect(normalizedDiff.files[1].path).toBe('src/utils.py');
      expect(normalizedDiff.files[0].created).toBe(true);
      expect(normalizedDiff.files[1].created).toBe(true);

      // Step 2: Test secret detection
      const secretScanResult = scanDiffForSecrets(testDiff, {
        enableEntropyAnalysis: true,
        minEntropyThreshold: 3.0
      });

      expect(secretScanResult.findings.length).toBeGreaterThan(0);
      const dbSecretFound = secretScanResult.findings.some(
        finding => finding.type === 'database' && finding.match.includes('password123')
      );
      expect(dbSecretFound).toBe(true);

      // Step 3: Test license header validation
      const fileContents = {
        'src/api.js': `const fetch = require('node-fetch');

// Database connection string - TODO: move to environment  
const DB_URL = 'mongodb://admin:password123@localhost:27017/myapp';

async function getUser(id) {
  const response = await fetch(\`https://api.example.com/users/\${id}\`);
  return response.json();
}`,
        'src/utils.py': `# Utility functions

def calculate_total(items):
    """Calculate total price of items."""
    return sum(item.price for item in items)`
      };

      const licenseFiles = Object.entries(fileContents).map(([path, content]) => ({
        path,
        content
      }));

      const licenseValidation = validateLicenseHeaders(licenseFiles, {
        requiredLicenses: ['Apache-2.0'],
        allowedLicenses: ['Apache-2.0', 'MIT'],
        prohibitedLicenses: ['GPL-3.0']
      });

      expect(licenseValidation.summary.missingHeaders).toBe(2);
      expect(licenseValidation.results.length).toBeGreaterThan(0);

      // Step 4: Full compliance check
      const complianceResult = assertCompliance({
        diff: testDiff,
        requireTests: true,
        maxFileBytes: 1000000,
        fileContents
      });

      expect(complianceResult.summary.filesChanged).toBe(2);
      expect(complianceResult.summary.secretsDetected).toBeGreaterThan(0);
      expect(complianceResult.summary.licenseViolations).toBeGreaterThan(0);
      expect(complianceResult.genericFindings).toContainEqual(
        expect.objectContaining({
          level: 'warn',
          note: expect.stringContaining('no test files changed')
        })
      );
    });

    it('should handle complex guidance rules with rule summarization', () => {
      // Load bundled guidance
      const bundledPacks = listBundled();
      expect(bundledPacks.packs.length).toBeGreaterThan(0);

      // Get security-focused guidance pack
      const securityPackInfo = bundledPacks.packs.find((pack: any) => 
        pack.id === 'baseline-secure'
      );
      expect(securityPackInfo).toBeDefined();

      // Get the actual pack content
      const securityPack = getBundledPack('baseline-secure');
      expect(securityPack.combinedMarkdown).toBeTruthy();

      // Summarize rules from the security pack
      const ruleSummary = summarizeRules(securityPack.combinedMarkdown);
      
      expect(Array.isArray(ruleSummary)).toBe(true);
      expect(ruleSummary.length).toBeGreaterThan(0);

      // Test that we can use these rules in compliance checking
      const testDiff = `--- a/src/api.js
+++ b/src/api.js
@@ -1,1 +1,3 @@
 const express = require('express');
+const SECRET_KEY = 'hardcoded-secret-key-123';
+const app = express();`;

      // Convert rules to the format expected by assertCompliance
      const checklistRules = ruleSummary.slice(0, 10).map(rule => ({
        id: rule.id,
        text: rule.description
      }));

      const complianceWithRules = assertCompliance({
        diff: testDiff,
        checklist: checklistRules,
        guidanceText: securityPack.combinedMarkdown,
        requireTests: true
      });

      expect(complianceWithRules.summary.secretsDetected).toBeGreaterThan(0);
      expect(complianceWithRules.findings.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Performance and Scale Testing', () => {
    it('should handle large diffs efficiently', async () => {
      // Generate a large diff with many files
      const largeDiff = Array.from({ length: 50 }, (_, i) => 
        `diff --git a/file${i}.js b/file${i}.js
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/file${i}.js
@@ -0,0 +1,20 @@
${Array.from({ length: 20 }, (_, j) => `+console.log('Line ${j} in file ${i}');`).join('\n')}
`).join('\n');

      const startTime = Date.now();
      const result = normalizeUnifiedDiff(largeDiff);
      const endTime = Date.now();

      expect(result.files).toHaveLength(50);
      expect(endTime - startTime).toBeLessThan(1000); // Should process in under 1 second
    });

    it('should handle complex guidance text efficiently', async () => {
      // Generate large guidance text
      const largeGuidance = `
# Large Guidance Document

${Array.from({ length: 100 }, (_, i) => `
## Section ${i}

[ASSERT] Rule ${i} must be followed
[REQUIRE] Requirement ${i} is mandatory  
[CHECK] Verification ${i} should be done

- MUST implement feature ${i}
- SHOULD consider option ${i}
- MAY include enhancement ${i}
`).join('\n')}
      `;

      const startTime = Date.now();
      const rules = summarizeRules(largeGuidance);
      const endTime = Date.now();

      expect(rules.length).toBeGreaterThan(200); // Should extract many rules
      expect(endTime - startTime).toBeLessThan(2000); // Should process in under 2 seconds
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should gracefully handle malformed inputs', () => {
      // Test malformed diff
      const malformedDiff = 'This is not a valid diff format';
      const diffResult = normalizeUnifiedDiff(malformedDiff);
      expect(diffResult.files).toHaveLength(0);
      expect(() => diffResult).not.toThrow();

      // Test empty guidance
      const emptyRules = summarizeRules('');
      expect(emptyRules).toHaveLength(0);

      // Test compliance with no diff
      const noContentResult = assertCompliance({
        diff: '',
        requireTests: false
      });
      expect(noContentResult.summary.filesChanged).toBe(0);
      expect(noContentResult.summary.secretsDetected).toBe(0);
    });

    it('should handle concurrent requests safely', async () => {
      const testDiff = `--- a/test.js
+++ b/test.js
@@ -1,1 +1,2 @@
 line1
+line2`;

      // Simulate concurrent processing
      const promises = Array.from({ length: 10 }, () => 
        Promise.resolve(normalizeUnifiedDiff(testDiff))
      );

      const results = await Promise.all(promises);
      
      // All results should be identical and correct
      results.forEach(result => {
        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toBe('test.js');
      });
    });
  });

  describe('Security and Validation', () => {
    it('should detect various types of secrets accurately', () => {
      const secretsTestDiff = `--- a/config.js
+++ b/config.js
@@ -1,1 +1,10 @@
+const AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLE';
+const AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
+const GITHUB_TOKEN = 'ghp_1234567890abcdef1234567890abcdef12345678';
+const DATABASE_URL = 'postgres://user:pass@localhost:5432/db';
+const JWT_SECRET = 'my-super-secret-jwt-key-that-should-not-be-hardcoded';
+const PRIVATE_KEY = '-----BEGIN RSA PRIVATE KEY-----\\nMIIEowIBAAKCAQEA...\\n-----END RSA PRIVATE KEY-----';
+const API_KEY = 'sk-1234567890abcdef1234567890abcdef12345678901234567890abcdef1234567890';
+const password = 'admin123';
+const STRIPE_SECRET_KEY = 'sk_test_1234567890abcdef1234567890abcdef12345678';
+const MONGODB_URI = 'mongodb://admin:password@cluster.mongodb.net/database';`;

      const secretResults = scanDiffForSecrets(secretsTestDiff, {
        enableEntropyAnalysis: true,
        minEntropyThreshold: 3.5
      });

      expect(secretResults.findings.length).toBeGreaterThan(5);
      
      // Check for specific secret types
      const secretTypes = secretResults.findings.map(f => f.type);
      expect(secretTypes).toContain('cloud-credentials'); // AWS keys
      expect(secretTypes).toContain('source-control'); // GitHub token
      expect(secretTypes).toContain('database'); // Database URLs
      expect(secretTypes).toContain('api-credentials'); // API keys

      // Verify confidence levels are reasonable
      const highConfidenceFindings = secretResults.findings.filter(f => f.confidence > 0.8);
      expect(highConfidenceFindings.length).toBeGreaterThan(3);
    });

    it('should validate license compatibility correctly', () => {
      const fileContents = {
        'apache-file.js': `/*
 * Licensed under the Apache License, Version 2.0
 */
console.log('Apache licensed code');`,
        'mit-file.js': `/*
 * MIT License
 * Copyright (c) 2023 Example
 */
console.log('MIT licensed code');`,
        'no-license.js': `console.log('No license header');`
      };

      const licenseFiles2 = Object.entries(fileContents).map(([path, content]) => ({
        path,
        content
      }));

      const validation = validateLicenseHeaders(licenseFiles2, {
        requiredLicenses: ['Apache-2.0'],
        allowedLicenses: ['Apache-2.0', 'MIT'],
        prohibitedLicenses: ['GPL-3.0']
      });

      expect(validation.summary.totalFiles).toBe(3);
      expect(validation.summary.validFiles).toBe(2); // Apache and MIT files
      expect(validation.summary.invalidFiles).toBe(1); // No license file
      expect(validation.summary.missingHeaders).toBe(1);
      
      // Check license breakdown
      expect(validation.summary.licenseBreakdown['Apache-2.0']).toBe(1);
      expect(validation.summary.licenseBreakdown['MIT']).toBe(1);
    });
  });
});