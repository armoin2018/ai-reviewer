import request from 'supertest';
import { app } from '../../src/server.js';

describe('License Validation API Endpoints', () => {
  describe('POST /validate-license-headers', () => {
    it('should validate license headers in files', async () => {
      const files = [
        {
          path: 'test.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

function test() {
  return 'hello';
}`
        }
      ];

      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files })
        .expect(200);

      expect(response.body.results).toBeDefined();
      expect(Array.isArray(response.body.results)).toBe(true);
      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.totalFiles).toBe(1);
      
      if (response.body.results.length > 0) {
        const result = response.body.results[0];
        expect(result.file).toBe('test.js');
        expect(result.detection).toBeDefined();
        expect(result.compliance).toBeDefined();
      }
    });

    it('should validate with license options', async () => {
      const files = [
        {
          path: 'test.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the MIT License
 */
function test() {}`
        }
      ];

      const options = {
        requiredLicenses: ['MIT'],
        prohibitedLicenses: ['GPL-3.0']
      };

      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files, options })
        .expect(200);

      expect(response.body.results[0].compliance.meets_requirements).toBe(true);
    });

    it('should return 400 for missing files', async () => {
      const response = await request(app)
        .post('/validate-license-headers')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 400 for invalid files format', async () => {
      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files: 'not-an-array' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should include correlation ID in response headers', async () => {
      const files = [{ path: 'test.js', content: 'function test() {}' }];

      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files })
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('GET /license-templates', () => {
    it('should return default license templates', async () => {
      const response = await request(app)
        .get('/license-templates')
        .expect(200);

      expect(response.body.templates).toBeDefined();
      expect(Array.isArray(response.body.templates)).toBe(true);
      expect(response.body.count).toBeGreaterThan(0);
      expect(response.body.templates.length).toBe(response.body.count);

      // Check template structure
      if (response.body.templates.length > 0) {
        const template = response.body.templates[0];
        expect(template.name).toBeDefined();
        expect(template.spdxId).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.template).toBeDefined();
        expect(Array.isArray(template.requiredFields)).toBe(true);
        expect(Array.isArray(template.compatibility)).toBe(true);
        expect(['none', 'weak', 'strong']).toContain(template.copyleftLevel);
      }
    });

    it('should include common license templates', async () => {
      const response = await request(app)
        .get('/license-templates')
        .expect(200);

      const licenseIds = response.body.templates.map((t: any) => t.spdxId);
      expect(licenseIds).toContain('Apache-2.0');
      expect(licenseIds).toContain('MIT');
      expect(licenseIds).toContain('GPL-3.0');
      expect(licenseIds).toContain('BSD-3-Clause');
      expect(licenseIds).toContain('BSD-2-Clause');
    });
  });

  describe('POST /generate-license-header', () => {
    it('should generate license header for valid input', async () => {
      const requestData = {
        filePath: 'test.js',
        licenseId: 'MIT',
        copyrightHolder: 'Test Company',
        year: 2025
      };

      const response = await request(app)
        .post('/generate-license-header')
        .send(requestData)
        .expect(200);

      expect(response.body.header).toBeDefined();
      expect(response.body.template).toBeDefined();
      expect(response.body.filePath).toBe('test.js');
      expect(response.body.copyrightHolder).toBe('Test Company');
      expect(response.body.year).toBe(2025);
      
      // Check header content
      expect(response.body.header).toContain('Copyright (c) 2025 Test Company');
      expect(response.body.header).toContain('/*');
      expect(response.body.header).toContain('*/');
    });

    it('should use current year when year not provided', async () => {
      const requestData = {
        filePath: 'test.js',
        licenseId: 'Apache-2.0',
        copyrightHolder: 'Test Company'
      };

      const response = await request(app)
        .post('/generate-license-header')
        .send(requestData)
        .expect(200);

      const currentYear = new Date().getFullYear();
      expect(response.body.year).toBe(currentYear);
      expect(response.body.header).toContain(`Copyright (c) ${currentYear} Test Company`);
    });

    it('should generate different comment styles for different file types', async () => {
      // Test Python file
      const pythonRequest = {
        filePath: 'test.py',
        licenseId: 'MIT',
        copyrightHolder: 'Test Company'
      };

      const pythonResponse = await request(app)
        .post('/generate-license-header')
        .send(pythonRequest)
        .expect(200);

      expect(pythonResponse.body.header).toContain('# Copyright');

      // Test Go file
      const goRequest = {
        filePath: 'test.go',
        licenseId: 'MIT',
        copyrightHolder: 'Test Company'
      };

      const goResponse = await request(app)
        .post('/generate-license-header')
        .send(goRequest)
        .expect(200);

      expect(goResponse.body.header).toContain('// Copyright');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/generate-license-header')
        .send({ filePath: 'test.js' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });

    it('should return 404 for unknown license', async () => {
      const requestData = {
        filePath: 'test.js',
        licenseId: 'UNKNOWN-1.0',
        copyrightHolder: 'Test Company'
      };

      const response = await request(app)
        .post('/generate-license-header')
        .send(requestData)
        .expect(404);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('License template not found');
    });

    it('should handle unsupported file types', async () => {
      const requestData = {
        filePath: 'test.unknown',
        licenseId: 'MIT',
        copyrightHolder: 'Test Company'
      };

      const response = await request(app)
        .post('/generate-license-header')
        .send(requestData)
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });

  describe('POST /check-license-compatibility', () => {
    it('should check compatible licenses', async () => {
      const requestData = {
        license1: 'MIT',
        license2: 'Apache-2.0'
      };

      const response = await request(app)
        .post('/check-license-compatibility')
        .send(requestData)
        .expect(200);

      expect(response.body.compatible).toBe(true);
      expect(Array.isArray(response.body.issues)).toBe(true);
      expect(Array.isArray(response.body.warnings)).toBe(true);
    });

    it('should detect incompatible licenses', async () => {
      const requestData = {
        license1: 'GPL-3.0',
        license2: 'MIT'
      };

      const response = await request(app)
        .post('/check-license-compatibility')
        .send(requestData)
        .expect(200);

      expect(response.body.compatible).toBe(false);
      expect(response.body.issues.length).toBeGreaterThan(0);
      expect(response.body.issues[0]).toContain('copyleft');
    });

    it('should handle unknown licenses', async () => {
      const requestData = {
        license1: 'UNKNOWN-1.0',
        license2: 'MIT'
      };

      const response = await request(app)
        .post('/check-license-compatibility')
        .send(requestData)
        .expect(200);

      expect(response.body.compatible).toBe(false);
      expect(response.body.issues.length).toBeGreaterThan(0);
      expect(response.body.issues[0]).toContain('Unknown license');
    });

    it('should return 400 for missing licenses', async () => {
      const response = await request(app)
        .post('/check-license-compatibility')
        .send({ license1: 'MIT' })
        .expect(400);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBe('MISSING_REQUIRED_FIELDS');
    });
  });

  describe('Integration with assert-compliance', () => {
    it('should include license validation in compliance check', async () => {
      const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
+function test() {
+  return 'hello';
+}`;

      const fileContents = {
        'test.js': `function test() {
  return 'hello';
}`
      };

      const response = await request(app)
        .post('/assert-compliance')
        .send({ 
          diff,
          checklist: [],
          fileContents
        })
        .expect(200);

      expect(response.body.summary).toBeDefined();
      expect(response.body.summary.licenseViolations).toBeDefined();
      expect(typeof response.body.summary.licenseViolations).toBe('number');
      
      // Should have license-related findings for missing headers
      const licenseFindings = response.body.genericFindings.filter(
        (f: any) => f.note.toLowerCase().includes('license')
      );
      expect(licenseFindings.length).toBeGreaterThan(0);
    });

    it('should validate against guidance text license requirements', async () => {
      const diff = `diff --git a/test.js b/test.js
index 1234567..abcdefg 100644
--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
+function test() {
+  return 'hello';
+}`;

      const guidanceText = `
[ASSERT] All source files must include license headers
Required licenses: Apache-2.0, MIT
Prohibited licenses: GPL-3.0
      `;

      const fileContents = {
        'test.js': `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the GPL-3.0
 */
function test() {
  return 'hello';
}`
      };

      const response = await request(app)
        .post('/assert-compliance')
        .send({ 
          diff,
          checklist: [],
          guidanceText,
          fileContents
        })
        .expect(200);

      // Should fail due to prohibited GPL license
      const prohibitedLicenseFindings = response.body.genericFindings.filter(
        (f: any) => f.level === 'fail' && f.note.toLowerCase().includes('prohibited')
      );
      expect(prohibitedLicenseFindings.length).toBeGreaterThan(0);
    });
  });

  describe('Performance tests', () => {
    it('should handle moderate file validation efficiently', async () => {
      const files = Array(20).fill(null).map((_, i) => ({
        path: `test${i}.js`,
        content: i % 2 === 0 ? 
          `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the MIT License
 */
function test${i}() {}` : 
          `function test${i}() {}`
      }));

      const startTime = Date.now();
      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files })
        .expect(200);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(response.body.summary.totalFiles).toBe(20);
      expect(response.body.summary.validFiles).toBeGreaterThan(0);
      expect(response.body.summary.invalidFiles).toBeGreaterThan(0);
    });

    it('should handle large license header generation efficiently', async () => {
      const requests = Array(10).fill(null).map((_, i) => 
        request(app)
          .post('/generate-license-header')
          .send({
            filePath: `test${i}.js`,
            licenseId: 'Apache-2.0',
            copyrightHolder: `Test Company ${i}`
          })
      );

      const startTime = Date.now();
      const responses = await Promise.all(requests);
      const responseTime = Date.now() - startTime;

      expect(responseTime).toBeLessThan(3000); // Should complete within 3 seconds
      responses.forEach(response => {
        expect(response.status).toBe(200);
        expect(response.body.header).toBeDefined();
      });
    });
  });

  describe('Error handling', () => {
    it('should handle malformed requests gracefully', async () => {
      const response = await request(app)
        .post('/validate-license-headers')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should handle server errors gracefully', async () => {
      // Send extremely large file content to potentially trigger server error
      const largeContent = 'a'.repeat(10 * 1024 * 1024); // 10MB
      
      const files = [{ path: 'huge.js', content: largeContent }];
      
      const response = await request(app)
        .post('/validate-license-headers')
        .send({ files })
        .expect(200);

      // Should handle gracefully without crashing
      expect(response.body.results).toBeDefined();
    });

    it('should handle concurrent requests', async () => {
      const concurrentRequests = Array(5).fill(null).map(() =>
        request(app)
          .get('/license-templates')
          .expect(200)
      );

      const responses = await Promise.all(concurrentRequests);
      
      responses.forEach(response => {
        expect(response.body.templates).toBeDefined();
        expect(response.headers['x-correlation-id']).toBeDefined();
      });
    });
  });
});