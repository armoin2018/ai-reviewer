import { 
  normalizeUnifiedDiff, 
  extractDiffFiles, 
  validateDiff,
  DiffProcessingOptions 
} from '../../src/diff.js';

describe('Diff Processing', () => {
  describe('normalizeUnifiedDiff', () => {
    describe('Git diff format', () => {
      it('should parse basic git diff', () => {
        const gitDiff = `diff --git a/src/file.ts b/src/file.ts
index 1234567..abcdefg 100644
--- a/src/file.ts
+++ b/src/file.ts
@@ -1,4 +1,5 @@
 export function hello() {
+  console.log('debug');
   return 'world';
 }`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('git');
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('src/file.ts');
        expect(file.additions).toBe(1);
        expect(file.deletions).toBe(0);
        expect(file.binary).toBe(false);
        expect(file.renamed).toBe(false);
        expect(file.created).toBe(false);
        expect(file.deleted).toBe(false);
        expect(file.hunks).toHaveLength(1);
        
        const hunk = file.hunks[0];
        expect(hunk.oldStart).toBe(1);
        expect(hunk.oldLines).toBe(4);
        expect(hunk.newStart).toBe(1);
        expect(hunk.newLines).toBe(5);
        expect(hunk.lines).toHaveLength(4);
        
        // Check line types and content
        expect(hunk.lines[0].type).toBe('context');
        expect(hunk.lines[0].content).toBe('export function hello() {');
        expect(hunk.lines[1].type).toBe('addition');
        expect(hunk.lines[1].content).toBe("  console.log('debug');");
        expect(hunk.lines[2].type).toBe('context');
        expect(hunk.lines[2].content).toBe("  return 'world';");
        expect(hunk.lines[3].type).toBe('context');
        expect(hunk.lines[3].content).toBe('}');
      });
      
      it('should handle file renames', () => {
        const gitDiff = `diff --git a/old/path.js b/new/path.js
similarity index 100%
rename from old/path.js
rename to new/path.js`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('new/path.js');
        expect(file.oldPath).toBe('old/path.js');
        expect(file.renamed).toBe(true);
      });
      
      it('should handle new file creation', () => {
        const gitDiff = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..abcdef1
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,3 @@
+export function newFunction() {
+  return 'hello';
+}`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('new-file.ts');
        expect(file.created).toBe(true);
        expect(file.additions).toBe(3);
        expect(file.deletions).toBe(0);
      });
      
      it('should handle file deletion', () => {
        const gitDiff = `diff --git a/deleted-file.ts b/deleted-file.ts
deleted file mode 100644
index abcdef1..0000000
--- a/deleted-file.ts
+++ /dev/null
@@ -1,3 +0,0 @@
-export function oldFunction() {
-  return 'goodbye';
-}`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('deleted-file.ts');
        expect(file.deleted).toBe(true);
        expect(file.additions).toBe(0);
        expect(file.deletions).toBe(3);
      });
      
      it('should handle binary files', () => {
        const gitDiff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('image.png');
        expect(file.binary).toBe(true);
        expect(file.additions).toBe(0);
        expect(file.deletions).toBe(0);
      });
    });
    
    describe('Unified diff format', () => {
      it('should parse standard unified diff', () => {
        const unifiedDiff = `--- a/src/test.js
+++ b/src/test.js
@@ -10,7 +10,8 @@ function test() {
   const value = 42;
   console.log('testing');
-  return value;
+  const result = value * 2;
+  return result;
 }`;
        
        const result = normalizeUnifiedDiff(unifiedDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.format).toBe('unified');
        expect(result.files).toHaveLength(1);
        
        const file = result.files[0];
        expect(file.path).toBe('src/test.js');
        expect(file.additions).toBe(2);
        expect(file.deletions).toBe(1);
        expect(file.hunks).toHaveLength(1);
        
        const hunk = file.hunks[0];
        expect(hunk.oldStart).toBe(10);
        expect(hunk.newStart).toBe(10);
        expect(hunk.lines).toHaveLength(6);
      });
      
      it('should handle multiple files in unified diff', () => {
        const unifiedDiff = `--- a/file1.js
+++ b/file1.js
@@ -1,3 +1,4 @@
 line1
+added line
 line2
 line3
--- a/file2.js
+++ b/file2.js
@@ -1,2 +1,1 @@
-removed line
 remaining line`;
        
        const result = normalizeUnifiedDiff(unifiedDiff);
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(2);
        
        expect(result.files[0].path).toBe('file1.js');
        expect(result.files[0].additions).toBe(1);
        expect(result.files[0].deletions).toBe(0);
        
        expect(result.files[1].path).toBe('file2.js');
        expect(result.files[1].additions).toBe(0);
        expect(result.files[1].deletions).toBe(1);
        
        expect(result.totalAdditions).toBe(1);
        expect(result.totalDeletions).toBe(1);
        expect(result.totalFiles).toBe(2);
      });
    });
    
    describe('Strip level processing', () => {
      it('should apply strip level to file paths', () => {
        const gitDiff = `diff --git a/prefix/src/file.ts b/prefix/src/file.ts
index 1234567..abcdefg 100644
--- a/prefix/src/file.ts
+++ b/prefix/src/file.ts
@@ -1,1 +1,1 @@
-old line
+new line`;
        
        const result = normalizeUnifiedDiff(gitDiff, { stripLevel: 1 });
        
        expect(result.isValid).toBe(true);
        expect(result.stripLevel).toBe(1);
        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toBe('src/file.ts');
      });
      
      it('should handle strip level larger than path components', () => {
        const gitDiff = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,1 +1,1 @@
-old line
+new line`;
        
        const result = normalizeUnifiedDiff(gitDiff, { stripLevel: 5 });
        
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
        expect(result.files[0].path).toBe('file.ts'); // Falls back to original path
      });
    });
    
    describe('Error handling and validation', () => {
      it('should handle empty diff', () => {
        const result = normalizeUnifiedDiff('');
        
        expect(result.isValid).toBe(false);
        expect(result.errors).toContain('Empty diff content');
        expect(result.files).toHaveLength(0);
      });
      
      it('should handle malformed diff', () => {
        const malformedDiff = `this is not a diff
just random text
with no structure`;
        
        const result = normalizeUnifiedDiff(malformedDiff);
        
        expect(result.isValid).toBe(false);
        expect(result.format).toBe('unknown');
        expect(result.errors).toContain('Unsupported or unrecognized diff format');
      });
      
      it('should handle diff size limits', () => {
        const largeDiff = 'diff --git a/file.txt b/file.txt\\n'.repeat(10000);
        
        const result = normalizeUnifiedDiff(largeDiff, { 
          maxFileSize: 1000,
          strictValidation: true 
        });
        
        expect(result.isValid).toBe(false);
        expect(result.errors[0]).toContain('Diff size exceeds maximum limit');
      });
      
      it('should reject binary files when not allowed', () => {
        const binaryDiff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;
        
        const result = normalizeUnifiedDiff(binaryDiff, { allowBinary: false });
        
        expect(result.isValid).toBe(true); // Still valid but with error
        expect(result.errors).toContain('Binary file not allowed: image.png');
      });
      
      it('should handle invalid hunk headers gracefully', () => {
        const invalidHunkDiff = `--- a/file.txt
+++ b/file.txt
@@ invalid hunk header @@
 some content`;
        
        const result = normalizeUnifiedDiff(invalidHunkDiff);
        
        // Should not crash, but may not parse correctly
        expect(result.isValid).toBe(true);
        expect(result.files).toHaveLength(1);
      });
    });
    
    describe('Line number tracking', () => {
      it('should correctly track line numbers in hunks', () => {
        const gitDiff = `diff --git a/file.js b/file.js
index 1234567..abcdefg 100644
--- a/file.js
+++ b/file.js
@@ -5,6 +5,7 @@ function test() {
   line5
   line6
   line7
+  added line
   line8
   line9
   line10`;
        
        const result = normalizeUnifiedDiff(gitDiff);
        
        expect(result.isValid).toBe(true);
        const hunk = result.files[0].hunks[0];
        
        // Check that line numbers are correctly assigned
        expect(hunk.lines[0].oldLineNumber).toBe(5);
        expect(hunk.lines[0].newLineNumber).toBe(5);
        
        // Added line should only have new line number
        const addedLine = hunk.lines.find(line => line.content === '  added line');
        expect(addedLine?.type).toBe('addition');
        expect(addedLine?.oldLineNumber).toBeUndefined();
        expect(addedLine?.newLineNumber).toBeDefined();
      });
    });
  });
  
  describe('extractDiffFiles', () => {
    it('should extract file paths from diff', () => {
      const gitDiff = `diff --git a/file1.ts b/file1.ts
index 1234567..abcdefg 100644
--- a/file1.ts
+++ b/file1.ts
@@ -1,1 +1,1 @@
-old
+new
diff --git a/path/file2.js b/path/file2.js
index 2345678..bcdefgh 100644
--- a/path/file2.js
+++ b/path/file2.js
@@ -1,1 +1,1 @@
-old
+new`;
      
      const files = extractDiffFiles(gitDiff);
     
     expect(files).toEqual(['file1.ts', 'path/file2.js']);
    });
    
    it('should apply strip level to extracted paths', () => {
      const gitDiff = `diff --git a/prefix/src/file.ts b/prefix/src/file.ts
index 1234567..abcdefg 100644
--- a/prefix/src/file.ts
+++ b/prefix/src/file.ts
@@ -1,1 +1,1 @@
-old
+new`;
      
      const files = extractDiffFiles(gitDiff, 1);
      
      expect(files).toEqual(['src/file.ts']);
    });
  });
  
  describe('validateDiff', () => {
    it('should validate correct diff', () => {
      const validDiff = `diff --git a/file.ts b/file.ts
index 1234567..abcdefg 100644
--- a/file.ts
+++ b/file.ts
@@ -1,1 +1,1 @@
-old line
+new line`;
      
      const validation = validateDiff(validDiff);
      
      expect(validation.isValid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });
    
    it('should detect invalid diff', () => {
      const invalidDiff = 'not a valid diff format';
      
      const validation = validateDiff(invalidDiff);
      
      expect(validation.isValid).toBe(false);
      expect(validation.errors.length).toBeGreaterThan(0);
    });
  });
  
  describe('Edge cases and regression tests', () => {
    it('should handle Windows line endings', () => {
      const windowsDiff = "diff --git a/file.txt b/file.txt\r\nindex 123..456 100644\r\n--- a/file.txt\r\n+++ b/file.txt\r\n@@ -1,1 +1,1 @@\r\n-old\r\n+new\r\n";
      
      const result = normalizeUnifiedDiff(windowsDiff);
      
      expect(result.isValid).toBe(true);
      expect(result.files).toHaveLength(1);
    });
    
    it('should handle mixed line endings', () => {
      const mixedDiff = "diff --git a/file.txt b/file.txt\r\nindex 123..456 100644\n--- a/file.txt\r\n+++ b/file.txt\n@@ -1,1 +1,1 @@\r\n-old\n+new\r\n";
      
      const result = normalizeUnifiedDiff(mixedDiff);
      
      expect(result.isValid).toBe(true);
      expect(result.files).toHaveLength(1);
    });
    
    it('should handle files with no extensions', () => {
      const gitDiff = `diff --git a/Makefile b/Makefile
index 1234567..abcdefg 100644
--- a/Makefile
+++ b/Makefile
@@ -1,1 +1,1 @@
-old rule
+new rule`;
      
      const result = normalizeUnifiedDiff(gitDiff);
      
      expect(result.isValid).toBe(true);
      expect(result.files[0].path).toBe('Makefile');
    });
    
    it('should handle empty file creation', () => {
      const gitDiff = `diff --git a/empty.txt b/empty.txt
new file mode 100644
index 0000000..e69de29`;
      
      const result = normalizeUnifiedDiff(gitDiff);
      
      expect(result.isValid).toBe(true);
      expect(result.files[0].created).toBe(true);
      expect(result.files[0].additions).toBe(0);
      expect(result.files[0].deletions).toBe(0);
    });
    
    it('should handle files with spaces in names', () => {
      const gitDiff = `diff --git a/file with spaces.txt b/file with spaces.txt
index 1234567..abcdefg 100644
--- a/file with spaces.txt
+++ b/file with spaces.txt
@@ -1,1 +1,1 @@
-old content
+new content`;
      
      const result = normalizeUnifiedDiff(gitDiff);
      
      expect(result.isValid).toBe(true);
      expect(result.files[0].path).toBe('file with spaces.txt');
    });
  });
});