import { 
  detectLicense, 
  validateLicenseHeader, 
  validateLicenseHeaders,
  generateLicenseHeader,
  getDefaultLicenseTemplates,
  checkLicenseCompatibility,
  LicenseValidationOptions 
} from '../../src/license.js';

describe('License Validation System', () => {
  describe('detectLicense', () => {
    it('should detect Apache-2.0 license', () => {
      const headerText = `
        Copyright (c) 2025 Test Company
        
        Licensed under the Apache License, Version 2.0 (the "License");
        you may not use this file except in compliance with the License.
        You may obtain a copy of the License at
        
            http://www.apache.org/licenses/LICENSE-2.0
        
        Unless required by applicable law or agreed to in writing, software
        distributed under the License is distributed on an "AS IS" BASIS,
        WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
        See the License for the specific language governing permissions and
        limitations under the License.
      `;
      
      const result = detectLicense(headerText);
      
      expect(result.detected).toBe(true);
      expect(result.licenseName).toBe('Apache License 2.0');
      expect(result.spdxId).toBe('Apache-2.0');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should detect MIT license', () => {
      const headerText = `
        Copyright (c) 2025 Test Company
        
        Permission is hereby granted, free of charge, to any person obtaining a copy
        of this software and associated documentation files (the "Software"), to deal
        in the Software without restriction, including without limitation the rights
        to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
        copies of the Software, and to permit persons to whom the Software is
        furnished to do so, subject to the following conditions:
        
        The above copyright notice and this permission notice shall be included in all
        copies or substantial portions of the Software.
        
        THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
        IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
        FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
      `;
      
      const result = detectLicense(headerText);
      
      expect(result.detected).toBe(true);
      expect(result.licenseName).toBe('MIT License');
      expect(result.spdxId).toBe('MIT');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should detect GPL-3.0 license', () => {
      const headerText = `
        Copyright (c) 2025 Test Company
        
        This program is free software: you can redistribute it and/or modify
        it under the terms of the GNU General Public License as published by
        the Free Software Foundation, either version 3 of the License, or
        (at your option) any later version.
        
        This program is distributed in the hope that it will be useful,
        but WITHOUT ANY WARRANTY; without even the implied warranty of
        MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.
      `;
      
      const result = detectLicense(headerText);
      
      expect(result.detected).toBe(true);
      expect(result.licenseName).toBe('GNU General Public License v3.0');
      expect(result.spdxId).toBe('GPL-3.0');
      expect(result.confidence).toBeGreaterThan(0.7);
    });

    it('should not detect license in empty text', () => {
      const result = detectLicense('');
      
      expect(result.detected).toBe(false);
      expect(result.confidence).toBe(0);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0].type).toBe('missing');
    });

    it('should warn about missing copyright notice', () => {
      const headerText = `
        Licensed under the Apache License, Version 2.0
      `;
      
      const result = detectLicense(headerText);
      
      const copyrightIssue = result.issues.find(issue => 
        issue.message.toLowerCase().includes('copyright')
      );
      expect(copyrightIssue).toBeDefined();
    });

    it('should warn about outdated copyright year', () => {
      const headerText = `
        Copyright (c) 2020 Test Company
        
        Licensed under the Apache License, Version 2.0
      `;
      
      const result = detectLicense(headerText);
      
      const yearIssue = result.issues.find(issue => 
        issue.type === 'outdated'
      );
      expect(yearIssue).toBeDefined();
    });
  });

  describe('generateLicenseHeader', () => {
    it('should generate Apache-2.0 header for JavaScript file', () => {
      const templates = getDefaultLicenseTemplates();
      const apacheTemplate = templates.find(t => t.spdxId === 'Apache-2.0')!;
      
      const header = generateLicenseHeader(
        'test.js',
        apacheTemplate,
        'Test Company',
        2025
      );
      
      expect(header).toContain('/*');
      expect(header).toContain('*/');
      expect(header).toContain('Copyright (c) 2025 Test Company');
      expect(header).toContain('Apache License');
    });

    it('should generate MIT header for Python file', () => {
      const templates = getDefaultLicenseTemplates();
      const mitTemplate = templates.find(t => t.spdxId === 'MIT')!;
      
      const header = generateLicenseHeader(
        'test.py',
        mitTemplate,
        'Test Company',
        2025
      );
      
      expect(header).toContain('# Copyright (c) 2025 Test Company');
      expect(header).toContain('# Permission is hereby granted');
      expect(header.split('\n').every(line => line.startsWith('#') || line.trim() === '')).toBe(true);
    });

    it('should throw error for unsupported file type', () => {
      const templates = getDefaultLicenseTemplates();
      const apacheTemplate = templates.find(t => t.spdxId === 'Apache-2.0')!;
      
      expect(() => {
        generateLicenseHeader(
          'test.unknown',
          apacheTemplate,
          'Test Company'
        );
      }).toThrow('Unsupported file type');
    });
  });

  describe('validateLicenseHeader', () => {
    it('should validate correct Apache-2.0 header', () => {
      const content = `/*
 * Copyright (c) 2025 Test Company
 * 
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 */

function test() {
  return 'hello';
}`;
      
      const result = validateLicenseHeader(content, 'test.js');
      
      expect(result.detection.detected).toBe(true);
      expect(result.detection.spdxId).toBe('Apache-2.0');
    });

    it('should fail validation for missing header', () => {
      const content = `function test() {
  return 'hello';
}`;
      
      const result = validateLicenseHeader(content, 'test.js');
      
      expect(result.isValid).toBe(false);
      expect(result.detection.detected).toBe(false);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it('should fail validation for prohibited license', () => {
      const content = `/*
 * Copyright (c) 2025 Test Company
 * 
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License
 */

function test() {
  return 'hello';
}`;
      
      const options: LicenseValidationOptions = {
        prohibitedLicenses: ['GPL-3.0']
      };
      
      const result = validateLicenseHeader(content, 'test.js', options);
      
      const prohibitedIssue = result.issues.find(issue => 
        issue.type === 'incompatible'
      );
      expect(prohibitedIssue).toBeDefined();
    });

    it('should pass validation for required license', () => {
      const content = `/*
 * Copyright (c) 2025 Test Company
 * 
 * Licensed under the Apache License, Version 2.0
 */

function test() {
  return 'hello';
}`;
      
      const options: LicenseValidationOptions = {
        requiredLicenses: ['Apache-2.0']
      };
      
      const result = validateLicenseHeader(content, 'test.js', options);
      
      expect(result.compliance.meets_requirements).toBe(true);
    });

    it('should provide suggestions for missing header', () => {
      const content = `function test() {
  return 'hello';
}`;
      
      const options: LicenseValidationOptions = {
        requiredLicenses: ['MIT']
      };
      
      const result = validateLicenseHeader(content, 'test.js', options);
      
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0].type).toBe('add');
      expect(result.suggestions[0].suggestedHeader).toContain('MIT');
    });
  });

  describe('validateLicenseHeaders', () => {
    it('should validate multiple files', () => {
      const files = [
        {
          path: 'test1.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the Apache License, Version 2.0
 */
function test1() {}`
        },
        {
          path: 'test2.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the MIT License
 */
function test2() {}`
        }
      ];
      
      const result = validateLicenseHeaders(files);
      
      expect(result.summary.totalFiles).toBe(2);
      expect(result.summary.licenseBreakdown['Apache-2.0']).toBe(1);
      expect(result.summary.licenseBreakdown['MIT']).toBe(1);
    });

    it('should handle files without headers', () => {
      const files = [
        {
          path: 'test1.js',
          content: 'function test1() {}'
        },
        {
          path: 'test2.js',
          content: 'function test2() {}'
        }
      ];
      
      const result = validateLicenseHeaders(files);
      
      expect(result.summary.missingHeaders).toBe(2);
      expect(result.summary.validFiles).toBe(0);
      expect(result.summary.invalidFiles).toBe(2);
    });

    it('should filter by allowed licenses', () => {
      const files = [
        {
          path: 'test1.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the Apache License, Version 2.0
 */
function test1() {}`
        },
        {
          path: 'test2.js',
          content: `/*
 * Copyright (c) 2025 Test Company
 * This program is free software under GPL-3.0
 */
function test2() {}`
        }
      ];
      
      const options: LicenseValidationOptions = {
        allowedLicenses: ['Apache-2.0']
      };
      
      const result = validateLicenseHeaders(files, options);
      
      // Apache file should be valid, GPL file should be invalid
      expect(result.results[0].isValid).toBe(true);
      expect(result.results[1].isValid).toBe(false);
    });
  });

  describe('getDefaultLicenseTemplates', () => {
    it('should return default license templates', () => {
      const templates = getDefaultLicenseTemplates();
      
      expect(Array.isArray(templates)).toBe(true);
      expect(templates.length).toBeGreaterThan(0);
      
      // Check for common licenses
      const licenseIds = templates.map(t => t.spdxId);
      expect(licenseIds).toContain('Apache-2.0');
      expect(licenseIds).toContain('MIT');
      expect(licenseIds).toContain('GPL-3.0');
      expect(licenseIds).toContain('BSD-3-Clause');
      expect(licenseIds).toContain('BSD-2-Clause');
    });

    it('should have valid template structure', () => {
      const templates = getDefaultLicenseTemplates();
      
      templates.forEach(template => {
        expect(template.name).toBeDefined();
        expect(template.spdxId).toBeDefined();
        expect(template.description).toBeDefined();
        expect(template.template).toBeDefined();
        expect(Array.isArray(template.requiredFields)).toBe(true);
        expect(Array.isArray(template.compatibility)).toBe(true);
        expect(['none', 'weak', 'strong']).toContain(template.copyleftLevel);
      });
    });
  });

  describe('checkLicenseCompatibility', () => {
    it('should check compatibility between MIT and Apache-2.0', () => {
      const result = checkLicenseCompatibility('MIT', 'Apache-2.0');
      
      expect(result.compatible).toBe(true);
      expect(result.issues.length).toBe(0);
    });

    it('should detect incompatibility between GPL and permissive licenses', () => {
      const result = checkLicenseCompatibility('GPL-3.0', 'MIT');
      
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('copyleft');
    });

    it('should handle unknown licenses', () => {
      const result = checkLicenseCompatibility('UNKNOWN-1.0', 'MIT');
      
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('Unknown license');
    });

    it('should provide warnings for manual verification', () => {
      const result = checkLicenseCompatibility('BSD-3-Clause', 'GPL-3.0');
      
      // This combination should have compatibility issues, not just warnings
      expect(result.compatible).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
      expect(result.issues[0]).toContain('copyleft');
    });
  });

  describe('Language-specific formatting', () => {
    it('should handle C-style comments', () => {
      const templates = getDefaultLicenseTemplates();
      const mitTemplate = templates.find(t => t.spdxId === 'MIT')!;
      
      const header = generateLicenseHeader(
        'test.cpp',
        mitTemplate,
        'Test Company'
      );
      
      expect(header).toContain('/*');
      expect(header).toContain('*/');
      expect(header.split('\n').some(line => line.includes(' * '))).toBe(true);
    });

    it('should handle shell-style comments', () => {
      const templates = getDefaultLicenseTemplates();
      const mitTemplate = templates.find(t => t.spdxId === 'MIT')!;
      
      const header = generateLicenseHeader(
        'test.sh',
        mitTemplate,
        'Test Company'
      );
      
      expect(header.split('\n').every(line => 
        line.startsWith('# ') || line.trim() === ''
      )).toBe(true);
    });

    it('should handle Go-style comments', () => {
      const templates = getDefaultLicenseTemplates();
      const mitTemplate = templates.find(t => t.spdxId === 'MIT')!;
      
      const header = generateLicenseHeader(
        'test.go',
        mitTemplate,
        'Test Company'
      );
      
      expect(header.split('\n').every(line => 
        line.startsWith('// ') || line.trim() === ''
      )).toBe(true);
    });
  });

  describe('Edge cases and error handling', () => {
    it('should handle very long headers', () => {
      const longHeader = 'a'.repeat(10000);
      const result = detectLicense(longHeader);
      
      expect(result).toBeDefined();
      expect(typeof result.confidence).toBe('number');
    });

    it('should handle files with no extension', () => {
      expect(() => {
        const templates = getDefaultLicenseTemplates();
        const mitTemplate = templates.find(t => t.spdxId === 'MIT')!;
        generateLicenseHeader('README', mitTemplate, 'Test Company');
      }).toThrow();
    });

    it('should handle malformed content gracefully', () => {
      const malformedContent = '\x00\x01\x02invalid\x03\x04';
      
      expect(() => {
        validateLicenseHeader(malformedContent, 'test.js');
      }).not.toThrow();
    });

    it('should handle empty file content', () => {
      const result = validateLicenseHeader('', 'test.js');
      
      expect(result.isValid).toBe(false);
      expect(result.detection.detected).toBe(false);
    });
  });

  describe('Performance', () => {
    it('should process large numbers of files efficiently', () => {
      const files = Array(100).fill(null).map((_, i) => ({
        path: `test${i}.js`,
        content: `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the MIT License
 */
function test${i}() {}`
      }));
      
      const startTime = Date.now();
      const result = validateLicenseHeaders(files);
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(5000); // Should complete within 5 seconds
      expect(result.summary.totalFiles).toBe(100);
    });

    it('should handle large file content efficiently', () => {
      const largeContent = `/*
 * Copyright (c) 2025 Test Company
 * Licensed under the Apache License, Version 2.0
 */

` + 'const data = "' + 'x'.repeat(50000) + '";';
      
      const startTime = Date.now();
      const result = validateLicenseHeader(largeContent, 'large-file.js');
      const endTime = Date.now();
      
      expect(endTime - startTime).toBeLessThan(1000); // Should complete within 1 second
      expect(result.detection.detected).toBe(true);
    });
  });
});