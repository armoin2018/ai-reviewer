/**
 * Enhanced diff processing with comprehensive parsing and validation
 *
 * @param diff Raw diff content
 * @param options Processing configuration options
 * @returns Normalized diff information with structured data
 */
export function normalizeUnifiedDiff(diff, options = {}) {
    const { stripLevel = 0, maxFileSize = 1024 * 1024, // 1MB default
    allowBinary = true, strictValidation = false } = options;
    // Initialize result
    const result = {
        files: [],
        totalAdditions: 0,
        totalDeletions: 0,
        totalFiles: 0,
        stripLevel,
        format: 'unknown',
        isValid: true,
        errors: []
    };
    try {
        // Normalize line endings and validate input
        const normalizedDiff = diff.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
        if (!normalizedDiff.trim()) {
            result.errors.push('Empty diff content');
            result.isValid = false;
            return result;
        }
        if (normalizedDiff.length > maxFileSize) {
            result.errors.push(`Diff size exceeds maximum limit (${maxFileSize} bytes)`);
            if (strictValidation) {
                result.isValid = false;
                return result;
            }
        }
        // Detect diff format
        result.format = detectDiffFormat(normalizedDiff);
        // Parse based on detected format
        switch (result.format) {
            case 'git':
                parseGitDiff(normalizedDiff, result, stripLevel, allowBinary);
                break;
            case 'unified':
                parseUnifiedDiff(normalizedDiff, result, stripLevel, allowBinary);
                break;
            default:
                result.errors.push('Unsupported or unrecognized diff format');
                result.isValid = false;
                return result;
        }
        // Calculate totals
        result.totalFiles = result.files.length;
        result.totalAdditions = result.files.reduce((sum, file) => sum + file.additions, 0);
        result.totalDeletions = result.files.reduce((sum, file) => sum + file.deletions, 0);
        // Final validation
        if (strictValidation && result.errors.length > 0) {
            result.isValid = false;
        }
    }
    catch (error) {
        result.errors.push(`Diff parsing failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
        result.isValid = false;
    }
    return result;
}
/**
 * Detect the format of a diff
 */
function detectDiffFormat(diff) {
    const lines = diff.split('\n').slice(0, 10); // Check first 10 lines
    // Check for git diff format indicators
    const hasGitHeader = lines.some(line => line.startsWith('diff --git') ||
        line.startsWith('index ') ||
        line.startsWith('new file mode') ||
        line.startsWith('deleted file mode'));
    if (hasGitHeader) {
        return 'git';
    }
    // Check for unified diff format indicators
    const hasUnifiedHeader = lines.some(line => line.startsWith('--- ') ||
        line.startsWith('+++ ') ||
        line.match(/^@@ -\d+(?:,\d+)? \+\d+(?:,\d+)? @@/));
    if (hasUnifiedHeader) {
        return 'unified';
    }
    return 'unknown';
}
/**
 * Parse git-format diff
 */
function parseGitDiff(diff, result, stripLevel, allowBinary) {
    const lines = diff.split('\n');
    let currentFile = null;
    let currentHunk = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Git diff header: diff --git a/file b/file
        if (line.startsWith('diff --git ')) {
            // Finalize previous file
            if (currentFile) {
                finalizeFile(currentFile, result);
            }
            currentFile = {
                path: '',
                additions: 0,
                deletions: 0,
                binary: false,
                renamed: false,
                deleted: false,
                created: false,
                hunks: []
            };
            // Extract file paths from git header
            const match = line.match(/^diff --git a\/(.+) b\/(.+)$/);
            if (match) {
                const [, oldPath, newPath] = match;
                currentFile.path = applyStripLevel(newPath, stripLevel);
                if (oldPath !== newPath) {
                    currentFile.oldPath = applyStripLevel(oldPath, stripLevel);
                    currentFile.renamed = true;
                }
            }
            else {
                result.errors.push(`Invalid git diff header: ${line}`);
            }
            continue;
        }
        if (!currentFile)
            continue;
        // File mode changes
        if (line.startsWith('new file mode')) {
            currentFile.created = true;
            continue;
        }
        if (line.startsWith('deleted file mode')) {
            currentFile.deleted = true;
            continue;
        }
        // Binary file detection
        if (line.includes('Binary files') && line.includes('differ')) {
            currentFile.binary = true;
            if (!allowBinary) {
                result.errors.push(`Binary file not allowed: ${currentFile.path}`);
            }
            continue;
        }
        // File path headers (--- and +++)
        if (line.startsWith('--- ') || line.startsWith('+++ ')) {
            // Extract file path if not already set
            if (!currentFile.path) {
                const pathMatch = line.match(/^[+-]{3} (?:a\/|b\/)?(.*?)(?:\t.*)?$/);
                if (pathMatch && pathMatch[1] !== '/dev/null') {
                    currentFile.path = applyStripLevel(pathMatch[1], stripLevel);
                }
            }
            continue;
        }
        // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (hunkMatch) {
            // Finalize previous hunk
            if (currentHunk) {
                currentFile.hunks.push(currentHunk);
            }
            const [, oldStartStr, oldLinesStr, newStartStr, newLinesStr, context] = hunkMatch;
            currentHunk = {
                header: line,
                oldStart: parseInt(oldStartStr, 10),
                oldLines: oldLinesStr ? parseInt(oldLinesStr, 10) : 1,
                newStart: parseInt(newStartStr, 10),
                newLines: newLinesStr ? parseInt(newLinesStr, 10) : 1,
                lines: []
            };
            oldLineNum = currentHunk.oldStart ?? 0;
            newLineNum = currentHunk.newStart ?? 0;
            continue;
        }
        // Content lines
        if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
            const type = line.startsWith('+') ? 'addition' :
                line.startsWith('-') ? 'deletion' : 'context';
            const diffLine = {
                type,
                content: line.substring(1), // Remove +, -, or space prefix
            };
            // Assign line numbers
            if (type !== 'addition') {
                diffLine.oldLineNumber = oldLineNum++;
            }
            if (type !== 'deletion') {
                diffLine.newLineNumber = newLineNum++;
            }
            currentHunk.lines.push(diffLine);
            // Update file statistics
            if (type === 'addition') {
                currentFile.additions++;
            }
            else if (type === 'deletion') {
                currentFile.deletions++;
            }
        }
    }
    // Finalize the last file and hunk
    if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
    }
    if (currentFile) {
        finalizeFile(currentFile, result);
    }
}
/**
 * Parse standard unified diff format
 */
function parseUnifiedDiff(diff, result, stripLevel, allowBinary) {
    const lines = diff.split('\n');
    let currentFile = null;
    let currentHunk = null;
    let oldLineNum = 0;
    let newLineNum = 0;
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // File header: --- oldfile
        if (line.startsWith('--- ')) {
            // Finalize previous file
            if (currentFile) {
                finalizeFile(currentFile, result);
            }
            currentFile = {
                path: '',
                additions: 0,
                deletions: 0,
                binary: false,
                renamed: false,
                deleted: false,
                created: false,
                hunks: []
            };
            // Extract old file path
            const pathMatch = line.match(/^--- (.+?)(?:\t.*)?$/);
            if (pathMatch && pathMatch[1] !== '/dev/null') {
                // Strip 'a/' prefix for unified diff format
                const cleanPath = pathMatch[1].replace(/^a\//, '');
                currentFile.oldPath = applyStripLevel(cleanPath, stripLevel);
                if (pathMatch[1] === '/dev/null') {
                    currentFile.created = true;
                }
            }
            continue;
        }
        // File header: +++ newfile
        if (line.startsWith('+++ ') && currentFile) {
            const pathMatch = line.match(/^\+\+\+ (.+?)(?:\t.*)?$/);
            if (pathMatch) {
                if (pathMatch[1] === '/dev/null') {
                    currentFile.deleted = true;
                    currentFile.path = currentFile.oldPath || '';
                }
                else {
                    // Strip 'b/' prefix for unified diff format
                    const cleanPath = pathMatch[1].replace(/^b\//, '');
                    currentFile.path = applyStripLevel(cleanPath, stripLevel);
                    if (currentFile.oldPath && currentFile.oldPath !== currentFile.path) {
                        currentFile.renamed = true;
                    }
                }
            }
            continue;
        }
        if (!currentFile)
            continue;
        // Binary file detection
        if (line.includes('Binary files') && line.includes('differ')) {
            currentFile.binary = true;
            if (!allowBinary) {
                result.errors.push(`Binary file not allowed: ${currentFile.path}`);
            }
            continue;
        }
        // Hunk header: @@ -oldStart,oldLines +newStart,newLines @@
        const hunkMatch = line.match(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@(.*)$/);
        if (hunkMatch) {
            // Finalize previous hunk
            if (currentHunk) {
                currentFile.hunks.push(currentHunk);
            }
            const [, oldStartStr, oldLinesStr, newStartStr, newLinesStr] = hunkMatch;
            currentHunk = {
                header: line,
                oldStart: parseInt(oldStartStr, 10),
                oldLines: oldLinesStr ? parseInt(oldLinesStr, 10) : 1,
                newStart: parseInt(newStartStr, 10),
                newLines: newLinesStr ? parseInt(newLinesStr, 10) : 1,
                lines: []
            };
            oldLineNum = currentHunk.oldStart ?? 0;
            newLineNum = currentHunk.newStart ?? 0;
            continue;
        }
        // Content lines
        if (currentHunk && (line.startsWith(' ') || line.startsWith('+') || line.startsWith('-'))) {
            const type = line.startsWith('+') ? 'addition' :
                line.startsWith('-') ? 'deletion' : 'context';
            const diffLine = {
                type,
                content: line.substring(1),
            };
            // Assign line numbers
            if (type !== 'addition') {
                diffLine.oldLineNumber = oldLineNum++;
            }
            if (type !== 'deletion') {
                diffLine.newLineNumber = newLineNum++;
            }
            currentHunk.lines.push(diffLine);
            // Update file statistics
            if (type === 'addition') {
                currentFile.additions++;
            }
            else if (type === 'deletion') {
                currentFile.deletions++;
            }
        }
    }
    // Finalize the last file and hunk
    if (currentHunk && currentFile) {
        currentFile.hunks.push(currentHunk);
    }
    if (currentFile) {
        finalizeFile(currentFile, result);
    }
}
/**
 * Apply strip level to file path
 */
function applyStripLevel(path, stripLevel) {
    if (stripLevel === 0)
        return path;
    const parts = path.split('/');
    return parts.slice(stripLevel).join('/') || path;
}
/**
 * Finalize a file by adding it to the result
 */
function finalizeFile(file, result) {
    if (!file.path) {
        result.errors.push('File found without valid path');
        return;
    }
    result.files.push(file);
}
/**
 * Extract just the file paths from a diff (legacy compatibility)
 */
export function extractDiffFiles(diff, stripLevel = 0) {
    const normalized = normalizeUnifiedDiff(diff, { stripLevel });
    return normalized.files.map(file => file.path);
}
/**
 * Validate diff content for basic structural integrity
 */
export function validateDiff(diff) {
    const result = normalizeUnifiedDiff(diff, { strictValidation: true });
    return {
        isValid: result.isValid,
        errors: result.errors
    };
}
