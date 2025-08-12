/**
 * License Header Validation System
 * Provides comprehensive license header detection, validation, and automatic suggestions
 */
/**
 * Default supported license templates
 */
const DEFAULT_LICENSE_TEMPLATES = [
    {
        name: 'Apache License 2.0',
        spdxId: 'Apache-2.0',
        description: 'Permissive license with patent protection',
        template: `Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
        requiredFields: ['copyright', 'license-url'],
        compatibility: ['MIT', 'BSD-3-Clause', 'BSD-2-Clause'],
        copyleftLevel: 'none'
    },
    {
        name: 'MIT License',
        spdxId: 'MIT',
        description: 'Simple permissive license',
        template: `Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
        requiredFields: ['copyright'],
        compatibility: ['Apache-2.0', 'BSD-3-Clause', 'BSD-2-Clause', 'GPL-2.0', 'GPL-3.0'],
        copyleftLevel: 'none'
    },
    {
        name: 'GNU General Public License v3.0',
        spdxId: 'GPL-3.0',
        description: 'Strong copyleft license',
        template: `This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.`,
        requiredFields: ['copyright', 'gpl-notice'],
        compatibility: ['GPL-2.0'],
        copyleftLevel: 'strong'
    },
    {
        name: 'BSD 3-Clause License',
        spdxId: 'BSD-3-Clause',
        description: 'Permissive license with attribution requirement',
        template: `Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
        requiredFields: ['copyright'],
        compatibility: ['MIT', 'Apache-2.0', 'BSD-2-Clause'],
        copyleftLevel: 'none'
    },
    {
        name: 'BSD 2-Clause License',
        spdxId: 'BSD-2-Clause',
        description: 'Simplified BSD license',
        template: `Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice,
   this list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
        requiredFields: ['copyright'],
        compatibility: ['MIT', 'Apache-2.0', 'BSD-3-Clause'],
        copyleftLevel: 'none'
    }
];
/**
 * Language-specific comment styles for header formatting
 */
const LANGUAGE_COMMENT_STYLES = [
    {
        blockStart: '/*',
        blockEnd: '*/',
        linePrefix: ' * ',
        extensions: ['.js', '.ts', '.jsx', '.tsx', '.java', '.c', '.cpp', '.h', '.hpp', '.cs', '.php', '.scala', '.kt', '.swift']
    },
    {
        blockStart: '#',
        blockEnd: '',
        linePrefix: '# ',
        extensions: ['.py', '.rb', '.sh', '.pl', '.yaml', '.yml', '.toml', '.r']
    },
    {
        blockStart: '--',
        blockEnd: '',
        linePrefix: '-- ',
        extensions: ['.sql', '.hs', '.elm']
    },
    {
        blockStart: '<!--',
        blockEnd: '-->',
        linePrefix: '   ',
        extensions: ['.html', '.xml', '.svg']
    },
    {
        blockStart: '%',
        blockEnd: '',
        linePrefix: '% ',
        extensions: ['.m', '.tex']
    },
    {
        blockStart: '//',
        blockEnd: '',
        linePrefix: '// ',
        extensions: ['.go', '.rs', '.dart']
    }
];
/**
 * Get language-specific comment style for a file
 */
function getCommentStyle(filePath) {
    const extension = filePath.substring(filePath.lastIndexOf('.'));
    return LANGUAGE_COMMENT_STYLES.find(style => style.extensions.includes(extension.toLowerCase())) || null;
}
/**
 * Extract potential license header from file content
 */
function extractLicenseHeader(content, maxLines = 50) {
    const lines = content.split('\n');
    // Look for license header in first maxLines
    let headerLines = [];
    let inHeader = false;
    let headerStart = -1;
    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
        const line = lines[i].trim();
        // Skip empty lines at the beginning
        if (!inHeader && line === '')
            continue;
        // Check for license-related keywords
        if (!inHeader && (line.toLowerCase().includes('license') ||
            line.toLowerCase().includes('copyright') ||
            line.toLowerCase().includes('permission') ||
            line.toLowerCase().includes('redistribution') ||
            line.toLowerCase().includes('apache') ||
            line.toLowerCase().includes('mit') ||
            line.toLowerCase().includes('gpl') ||
            line.toLowerCase().includes('bsd'))) {
            inHeader = true;
            headerStart = i;
        }
        if (inHeader) {
            headerLines.push(lines[i]);
            // Stop if we hit code-looking content
            if (line.includes('import ') ||
                line.includes('package ') ||
                line.includes('function ') ||
                line.includes('class ') ||
                line.includes('const ') ||
                line.includes('var ') ||
                line.includes('let ') ||
                (line.includes('{') && !line.includes('copyright')) ||
                line.includes('DOCTYPE')) {
                break;
            }
        }
    }
    return headerLines.join('\n').trim();
}
/**
 * Normalize license text for comparison
 */
function normalizeLicenseText(text) {
    return text
        .toLowerCase()
        .replace(/\s+/g, ' ')
        .replace(/[^\w\s]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
}
/**
 * Calculate similarity between two license texts
 */
function calculateSimilarity(text1, text2) {
    const norm1 = normalizeLicenseText(text1);
    const norm2 = normalizeLicenseText(text2);
    if (norm1 === norm2)
        return 1.0;
    // Check for unique license identifiers based on distinctive phrases
    // MIT License - very distinctive phrase
    if (norm1.includes('permission is hereby granted free of charge') &&
        norm1.includes('without restriction') &&
        norm1.includes('software is provided as is')) {
        if (norm2.includes(' mit ') || norm2.startsWith('mit ') || norm2.endsWith(' mit'))
            return 0.9;
    }
    // Apache License - distinctive URL and version
    if ((norm1.includes('apache license version 2 0') ||
        norm1.includes('http www apache org licenses license 2 0')) &&
        (norm1.includes('compliance with the license') || norm1.includes('licensed under the apache'))) {
        if (norm2.includes(' apache ') || norm2.startsWith('apache ') || norm2.endsWith(' apache'))
            return 0.9;
    }
    // GPL License - distinctive phrases
    if ((norm1.includes('gnu general public license') || norm1.includes('free software foundation')) &&
        norm1.includes('redistribute it and or modify')) {
        if (norm2.includes(' gpl ') || norm2.startsWith('gpl ') || norm2.endsWith(' gpl') || norm2.includes(' gnu ') || norm2.startsWith('gnu ') || norm2.endsWith(' gnu'))
            return 0.9;
    }
    // BSD License - distinctive redistribution clause
    if (norm1.includes('redistribution and use in source and binary forms') &&
        norm1.includes('following conditions are met')) {
        if (norm2.includes(' bsd ') || norm2.startsWith('bsd ') || norm2.endsWith(' bsd'))
            return 0.9;
    }
    // Fall back to Jaccard similarity
    const words1 = new Set(norm1.split(' '));
    const words2 = new Set(norm2.split(' '));
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    return intersection.size / union.size;
}
/**
 * Detect license from header text
 */
export function detectLicense(headerText) {
    if (!headerText.trim()) {
        return {
            detected: false,
            confidence: 0,
            location: { startLine: 0, endLine: 0, headerText: '' },
            issues: [{
                    type: 'missing',
                    severity: 'error',
                    message: 'No license header found'
                }]
        };
    }
    const lines = headerText.split('\n');
    let bestMatch = null;
    // Try to match against known license templates
    for (const template of DEFAULT_LICENSE_TEMPLATES) {
        let confidence = calculateSimilarity(headerText, template.template);
        // Also try matching against template name/SPDX for short headers
        const templateKeywordMatch = calculateSimilarity(headerText, template.name + ' ' + template.spdxId);
        confidence = Math.max(confidence, templateKeywordMatch);
        // Check for short form license references
        const normalizedHeader = normalizeLicenseText(headerText);
        if (normalizedHeader.includes('licensed under') || normalizedHeader.includes('license')) {
            if (template.spdxId === 'Apache-2.0' && normalizedHeader.includes('apache')) {
                confidence = Math.max(confidence, 0.8);
            }
            else if (template.spdxId === 'MIT' && normalizedHeader.includes('mit')) {
                confidence = Math.max(confidence, 0.8);
            }
            else if (template.spdxId === 'GPL-3.0' && (normalizedHeader.includes('gpl') || normalizedHeader.includes('gnu'))) {
                confidence = Math.max(confidence, 0.8);
            }
            else if ((template.spdxId === 'BSD-3-Clause' || template.spdxId === 'BSD-2-Clause') && normalizedHeader.includes('bsd')) {
                confidence = Math.max(confidence, 0.8);
            }
        }
        if (!bestMatch || confidence > bestMatch.confidence) {
            bestMatch = { template, confidence };
        }
    }
    const issues = [];
    // Check for copyright notice
    const hasCopyright = /copyright\s+(\(c\)\s*)?(\d{4})/i.test(headerText);
    if (!hasCopyright) {
        issues.push({
            type: 'missing',
            severity: 'warning',
            message: 'Copyright notice not found or incomplete'
        });
    }
    // Check for year currency
    const currentYear = new Date().getFullYear();
    const yearMatch = headerText.match(/copyright\s+(?:\(c\)\s*)?(\d{4})(?:-(\d{4}))?/i);
    if (yearMatch) {
        const startYear = parseInt(yearMatch[1]);
        const endYear = yearMatch[2] ? parseInt(yearMatch[2]) : startYear;
        if (endYear < currentYear - 1) {
            issues.push({
                type: 'outdated',
                severity: 'info',
                message: `Copyright year may be outdated (found ${endYear}, current ${currentYear})`
            });
        }
    }
    if (bestMatch && bestMatch.confidence >= 0.7) {
        return {
            detected: true,
            licenseName: bestMatch.template.name,
            spdxId: bestMatch.template.spdxId,
            confidence: bestMatch.confidence,
            location: {
                startLine: 1,
                endLine: lines.length,
                headerText
            },
            issues
        };
    }
    return {
        detected: false,
        confidence: bestMatch?.confidence || 0,
        location: {
            startLine: 1,
            endLine: lines.length,
            headerText
        },
        issues: [
            ...issues,
            {
                type: 'invalid',
                severity: 'error',
                message: 'License header found but could not identify license type'
            }
        ]
    };
}
/**
 * Generate license header suggestion for a file
 */
export function generateLicenseHeader(filePath, licenseTemplate, copyrightHolder, year) {
    const commentStyle = getCommentStyle(filePath);
    if (!commentStyle) {
        throw new Error(`Unsupported file type: ${filePath}`);
    }
    const currentYear = year || new Date().getFullYear();
    const copyrightLine = `Copyright (c) ${currentYear} ${copyrightHolder}`;
    // Build header content
    let headerContent = copyrightLine + '\n\n' + licenseTemplate.template;
    // Format with comment style
    const lines = headerContent.split('\n');
    let formattedHeader = '';
    if (commentStyle.blockStart && commentStyle.blockEnd) {
        // Block comment style
        formattedHeader = commentStyle.blockStart + '\n';
        lines.forEach(line => {
            formattedHeader += commentStyle.linePrefix + line + '\n';
        });
        formattedHeader += commentStyle.blockEnd + '\n';
    }
    else {
        // Line comment style
        lines.forEach(line => {
            formattedHeader += commentStyle.linePrefix + line + '\n';
        });
    }
    return formattedHeader;
}
/**
 * Validate license header in file content
 */
export function validateLicenseHeader(content, filePath, options = {}) {
    const { requiredLicenses = [], allowedLicenses = [], prohibitedLicenses = [], maxHeaderLines = 50, strictMatching = false } = options;
    const headerText = extractLicenseHeader(content, maxHeaderLines);
    const detection = detectLicense(headerText);
    const issues = [...detection.issues];
    const suggestions = [];
    // Check license requirements
    if (requiredLicenses.length > 0 && detection.detected) {
        if (!requiredLicenses.includes(detection.spdxId)) {
            issues.push({
                type: 'invalid',
                severity: 'error',
                message: `License ${detection.spdxId} is not in required licenses: ${requiredLicenses.join(', ')}`
            });
        }
    }
    if (allowedLicenses.length > 0 && detection.detected) {
        if (!allowedLicenses.includes(detection.spdxId)) {
            issues.push({
                type: 'invalid',
                severity: 'error',
                message: `License ${detection.spdxId} is not in allowed licenses: ${allowedLicenses.join(', ')}`
            });
        }
    }
    if (prohibitedLicenses.length > 0 && detection.detected) {
        if (prohibitedLicenses.includes(detection.spdxId)) {
            issues.push({
                type: 'incompatible',
                severity: 'error',
                message: `License ${detection.spdxId} is prohibited`
            });
        }
    }
    // Generate suggestions
    if (!detection.detected || detection.confidence < 0.8) {
        const defaultLicense = requiredLicenses[0] || allowedLicenses[0] || 'Apache-2.0';
        const template = DEFAULT_LICENSE_TEMPLATES.find(t => t.spdxId === defaultLicense);
        if (template) {
            try {
                const suggestedHeader = generateLicenseHeader(filePath, template, '[COPYRIGHT_HOLDER]');
                suggestions.push({
                    type: detection.detected ? 'update' : 'add',
                    description: `${detection.detected ? 'Update' : 'Add'} ${template.name} header`,
                    suggestedHeader,
                    location: { line: 1, column: 1 }
                });
            }
            catch (error) {
                // Ignore if file type not supported
            }
        }
    }
    const compliance = {
        meets_requirements: requiredLicenses.length === 0 ||
            (detection.detected && requiredLicenses.includes(detection.spdxId)),
        license_compatibility: prohibitedLicenses.length === 0 ||
            !detection.detected ||
            !prohibitedLicenses.includes(detection.spdxId),
        header_format_valid: detection.detected && detection.confidence > 0.7
    };
    return {
        isValid: issues.filter(i => i.severity === 'error').length === 0,
        file: filePath,
        detection,
        suggestions,
        issues,
        compliance
    };
}
/**
 * Validate license headers across multiple files
 */
export function validateLicenseHeaders(files, options = {}) {
    const results = files.map(file => validateLicenseHeader(file.content, file.path, options));
    const licenseBreakdown = {};
    results.forEach(result => {
        if (result.detection.detected && result.detection.spdxId) {
            licenseBreakdown[result.detection.spdxId] =
                (licenseBreakdown[result.detection.spdxId] || 0) + 1;
        }
    });
    return {
        results,
        summary: {
            totalFiles: results.length,
            validFiles: results.filter(r => r.isValid).length,
            invalidFiles: results.filter(r => !r.isValid).length,
            missingHeaders: results.filter(r => !r.detection.detected).length,
            licenseBreakdown
        }
    };
}
/**
 * Get default license templates
 */
export function getDefaultLicenseTemplates() {
    return [...DEFAULT_LICENSE_TEMPLATES];
}
/**
 * Get supported language comment styles
 */
export function getSupportedLanguages() {
    return [...LANGUAGE_COMMENT_STYLES];
}
/**
 * Check license compatibility between two licenses
 */
export function checkLicenseCompatibility(license1, license2) {
    const template1 = DEFAULT_LICENSE_TEMPLATES.find(t => t.spdxId === license1);
    const template2 = DEFAULT_LICENSE_TEMPLATES.find(t => t.spdxId === license2);
    if (!template1 || !template2) {
        return {
            compatible: false,
            issues: ['Unknown license(s) cannot be checked for compatibility'],
            warnings: []
        };
    }
    const issues = [];
    const warnings = [];
    // Strong copyleft licenses are generally incompatible with permissive licenses
    if (template1.copyleftLevel === 'strong' && template2.copyleftLevel === 'none') {
        issues.push(`${license1} (copyleft) may not be compatible with ${license2} (permissive)`);
    }
    if (template2.copyleftLevel === 'strong' && template1.copyleftLevel === 'none') {
        issues.push(`${license2} (copyleft) may not be compatible with ${license1} (permissive)`);
    }
    // Check explicit compatibility
    const explicitlyCompatible = template1.compatibility.includes(license2) ||
        template2.compatibility.includes(license1);
    // If there are issues (incompatibilities), not compatible regardless of explicit list
    const compatible = explicitlyCompatible && issues.length === 0;
    if (!explicitlyCompatible && issues.length === 0) {
        warnings.push(`License compatibility between ${license1} and ${license2} should be verified manually`);
    }
    return {
        compatible,
        issues,
        warnings
    };
}
