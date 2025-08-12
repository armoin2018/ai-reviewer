import request from 'supertest';
import { app } from '../../src/server.js';

describe('/normalize-diff endpoint', () => {
  describe('POST /normalize-diff', () => {
    it('should normalize a basic git diff', async () => {
      const gitDiff = `diff --git a/src/test.ts b/src/test.ts
index 1234567..abcdefg 100644
--- a/src/test.ts
+++ b/src/test.ts
@@ -1,3 +1,4 @@
 export function test() {
+  console.log('debug');
   return 'hello world';
 }`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: gitDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.format).toBe('git');
      expect(response.body.files).toHaveLength(1);
      
      const file = response.body.files[0];
      expect(file.path).toBe('src/test.ts');
      expect(file.additions).toBe(1);
      expect(file.deletions).toBe(0);
      expect(file.binary).toBe(false);
      expect(file.hunks).toHaveLength(1);
      
      expect(response.body.totalAdditions).toBe(1);
      expect(response.body.totalDeletions).toBe(0);
      expect(response.body.totalFiles).toBe(1);
    });

    it('should handle strip level parameter', async () => {
      const gitDiff = `diff --git a/prefix/src/file.ts b/prefix/src/file.ts
index 1234567..abcdefg 100644
--- a/prefix/src/file.ts
+++ b/prefix/src/file.ts
@@ -1,1 +1,1 @@
-old line
+new line`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ 
          diff: gitDiff,
          strip: 1
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.stripLevel).toBe(1);
      expect(response.body.files[0].path).toBe('src/file.ts');
    });

    it('should handle multiple files', async () => {
      const multiFileDiff = `diff --git a/file1.js b/file1.js
index 1111111..aaaaaaa 100644
--- a/file1.js
+++ b/file1.js
@@ -1,1 +1,2 @@
 console.log('file1');
+console.log('added');
diff --git a/file2.js b/file2.js
index 2222222..bbbbbbb 100644
--- a/file2.js
+++ b/file2.js
@@ -1,2 +1,1 @@
-console.log('removed');
 console.log('file2');`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: multiFileDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.files).toHaveLength(2);
      expect(response.body.totalAdditions).toBe(1);
      expect(response.body.totalDeletions).toBe(1);
      expect(response.body.totalFiles).toBe(2);
    });

    it('should handle binary files', async () => {
      const binaryDiff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: binaryDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].binary).toBe(true);
      expect(response.body.files[0].path).toBe('image.png');
    });

    it('should handle file operations (create, delete, rename)', async () => {
      const fileOpsDiff = `diff --git a/new-file.ts b/new-file.ts
new file mode 100644
index 0000000..1234567
--- /dev/null
+++ b/new-file.ts
@@ -0,0 +1,2 @@
+export const newFunction = () => {
+  return 'created';
+};
diff --git a/old-file.ts b/old-file.ts
deleted file mode 100644
index abcdefg..0000000
--- a/old-file.ts
+++ /dev/null
@@ -1,2 +0,0 @@
-export const oldFunction = () => {
-  return 'deleted';
-};
diff --git a/original.ts b/renamed.ts
similarity index 100%
rename from original.ts
rename to renamed.ts`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: fileOpsDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.files).toHaveLength(3);
      
      const [newFile, deletedFile, renamedFile] = response.body.files;
      
      expect(newFile.created).toBe(true);
      expect(newFile.additions).toBe(2);
      
      expect(deletedFile.deleted).toBe(true);
      expect(deletedFile.deletions).toBe(2);
      
      expect(renamedFile.renamed).toBe(true);
      expect(renamedFile.oldPath).toBe('original.ts');
      expect(renamedFile.path).toBe('renamed.ts');
    });

    it('should handle unified diff format', async () => {
      const unifiedDiff = `--- a/test.js
+++ b/test.js
@@ -1,3 +1,4 @@
 function test() {
+  console.log('added');
   return true;
 }`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: unifiedDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.format).toBe('unified');
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0].path).toBe('test.js');
      expect(response.body.files[0].additions).toBe(1);
    });

    it('should handle validation options', async () => {
      const validDiff = `diff --git a/file.js b/file.js
index 1234567..abcdefg 100644
--- a/file.js
+++ b/file.js
@@ -1,1 +1,1 @@
-old
+new`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ 
          diff: validDiff,
          strictValidation: true,
          allowBinary: false,
          maxFileSize: 10000
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.files).toHaveLength(1);
    });

    it('should reject binary files when not allowed', async () => {
      const binaryDiff = `diff --git a/image.png b/image.png
index 1234567..abcdefg 100644
Binary files a/image.png and b/image.png differ`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ 
          diff: binaryDiff,
          allowBinary: false
        })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.errors).toContain('Binary file not allowed: image.png');
    });

    it('should return 400 for invalid diff with strict validation', async () => {
      const invalidDiff = 'this is not a valid diff';

      const response = await request(app)
        .post('/normalize-diff')
        .send({ 
          diff: invalidDiff,
          strictValidation: true
        })
        .expect(400);

      expect(response.body.isValid).toBe(false);
      expect(response.body.message).toBe('Diff validation failed');
      expect(response.body.errors.length).toBeGreaterThan(0);
    });

    it('should handle empty diff gracefully', async () => {
      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: '' })
        .expect(200);

      expect(response.body.isValid).toBe(false);
      expect(response.body.errors).toContain('Empty diff content');
      expect(response.body.files).toHaveLength(0);
    });

    it('should include correlation ID in audit logs', async () => {
      const gitDiff = `diff --git a/audit-test.js b/audit-test.js
index 1234567..abcdefg 100644
--- a/audit-test.js
+++ b/audit-test.js
@@ -1,1 +1,1 @@
-test
+audit`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: gitDiff })
        .expect(200);

      // Response should include correlation ID header
      expect(response.headers['x-correlation-id']).toBeDefined();
      expect(response.body.isValid).toBe(true);
    });

    it('should handle malformed requests', async () => {
      const response = await request(app)
        .post('/normalize-diff')
        .send({ invalidField: 'test' })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should enforce rate limiting', async () => {
      const gitDiff = `diff --git a/rate-limit-test.js b/rate-limit-test.js
index 1234567..abcdefg 100644
--- a/rate-limit-test.js
+++ b/rate-limit-test.js
@@ -1,1 +1,1 @@
-test
+rate-limit`;

      // Make multiple requests quickly to test rate limiting
      const requests = Array(25).fill(null).map(() => 
        request(app)
          .post('/normalize-diff')
          .send({ diff: gitDiff })
      );

      const responses = await Promise.all(requests);
      
      // Some requests should succeed, others might be rate limited
      const successCount = responses.filter((r: any) => r.status === 200).length;
      const rateLimitedCount = responses.filter((r: any) => r.status === 429).length;
      
      expect(successCount + rateLimitedCount).toBe(25);
    });

    it('should handle large diffs within limits', async () => {
      // Create a moderately large diff
      const lines = Array(100).fill(null).map((_, i) => `+line ${i}`).join('\n');
      const largeDiff = `diff --git a/large-file.js b/large-file.js
index 1234567..abcdefg 100644
--- a/large-file.js
+++ b/large-file.js
@@ -1,0 +1,100 @@
${lines}`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: largeDiff })
        .expect(200);

      expect(response.body.isValid).toBe(true);
      expect(response.body.files[0].additions).toBe(100);
    });
  });

  describe('Error handling', () => {
    it('should handle server errors gracefully', async () => {
      // Send extremely malformed data to trigger server error
      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: null })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/normalize-diff')
        .send({})
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });
});