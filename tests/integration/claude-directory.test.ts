import request from 'supertest';
import { app } from '../../src/server.js';
import { promises as fs } from 'fs';

describe('Claude Directory API Endpoints', () => {
  const testDir = '.claude-test-integration';
  const originalCwd = process.cwd();
  
  beforeEach(async () => {
    // Create test directory structure
    await fs.mkdir(testDir, { recursive: true });
    process.chdir(testDir);
    
    // Create .claude directory structure
    await fs.mkdir('.claude', { recursive: true });
    await fs.mkdir('.claude/agents', { recursive: true });
    await fs.mkdir('.claude/agents/instructions', { recursive: true });
    await fs.mkdir('.claude/agents/personas', { recursive: true });
    await fs.mkdir('.claude/commands', { recursive: true });
    
    // Create test files
    await fs.writeFile('.claude/claude-instructions.md', '# Claude Instructions\n\nTest main instructions file for API.');
    await fs.writeFile('.claude/agents/instructions/api-test.md', '# API Test Instruction\n\nThis is for API testing.');
    await fs.writeFile('.claude/agents/personas/api-persona.md', '# Persona: API Test\n\n## Role\nAPI testing persona');
    await fs.writeFile('.claude/commands/api-command.md', '# Command: API Test\n\n## Usage\nAPI test command');
  });
  
  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('GET /claude-instructions', () => {
    it('should return main Claude instructions', async () => {
      const response = await request(app)
        .get('/claude-instructions')
        .expect(200);

      expect(response.body.path).toBe('.claude/claude-instructions.md');
      expect(response.body.name).toBe('claude-instructions.md');
      expect(response.body.content).toContain('Claude Instructions');
      expect(response.body.type).toBe('main-instruction');
      expect(typeof response.body.size).toBe('number');
      expect(response.body.lastModified).toBeDefined();
    });

    it('should return 500 if instructions file does not exist', async () => {
      await fs.unlink('.claude/claude-instructions.md');
      
      const response = await request(app)
        .get('/claude-instructions')
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.message).toContain('not found');
    });

    it('should include correlation ID in response headers', async () => {
      const response = await request(app)
        .get('/claude-instructions')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });
  });

  describe('GET /claude-directory', () => {
    it('should list all .claude directory contents', async () => {
      const response = await request(app)
        .get('/claude-directory')
        .expect(200);

      expect(response.body.mainInstruction).toBeDefined();
      expect(response.body.mainInstruction.name).toBe('claude-instructions.md');
      
      expect(response.body.instructions).toHaveLength(1);
      expect(response.body.instructions[0].name).toBe('api-test.md');
      
      expect(response.body.personas).toHaveLength(1);
      expect(response.body.personas[0].name).toBe('api-persona.md');
      
      expect(response.body.commands).toHaveLength(1);
      expect(response.body.commands[0].name).toBe('api-command.md');
    });

    it('should handle empty directories gracefully', async () => {
      await fs.rm('.claude/agents', { recursive: true, force: true });
      await fs.rm('.claude/commands', { recursive: true, force: true });
      
      const response = await request(app)
        .get('/claude-directory')
        .expect(200);

      expect(response.body.instructions).toHaveLength(0);
      expect(response.body.personas).toHaveLength(0);
      expect(response.body.commands).toHaveLength(0);
      expect(response.body.mainInstruction).toBeDefined(); // Still has main instruction
    });
  });

  describe('GET /claude-file', () => {
    it('should read specific Claude files', async () => {
      const response = await request(app)
        .get('/claude-file')
        .query({ path: '.claude/agents/instructions/api-test.md' })
        .expect(200);

      expect(response.body.name).toBe('api-test.md');
      expect(response.body.content).toContain('API Test Instruction');
      expect(response.body.type).toBe('instruction');
    });

    it('should return 400 if path parameter is missing', async () => {
      const response = await request(app)
        .get('/claude-file')
        .expect(400);

      expect(response.body.error.message).toBe('File path is required');
    });

    it('should return 500 for non-existent files', async () => {
      const response = await request(app)
        .get('/claude-file')
        .query({ path: '.claude/agents/instructions/nonexistent.md' })
        .expect(500);

      expect(response.body.error.message).toContain('not found');
    });

    it('should prevent path traversal attacks', async () => {
      const response = await request(app)
        .get('/claude-file')
        .query({ path: '.claude/../../../etc/passwd' })
        .expect(500);

      expect(response.body.error.message).toContain('Path traversal not allowed');
    });
  });

  describe('POST /claude-file', () => {
    it('should create new Claude files', async () => {
      const filePath = '.claude/agents/instructions/new-api-test.md';
      const content = '# New API Test\n\nCreated via API endpoint.';
      
      const response = await request(app)
        .post('/claude-file')
        .send({ filePath, content })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('File written');
      
      // Verify file was created
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });

    it('should update existing files', async () => {
      const filePath = '.claude/agents/instructions/api-test.md';
      const newContent = '# Updated API Test\n\nUpdated via API endpoint.';
      
      await request(app)
        .post('/claude-file')
        .send({ filePath, content: newContent })
        .expect(200);
      
      // Verify file was updated
      const updated = await fs.readFile(filePath, 'utf-8');
      expect(updated).toBe(newContent);
    });

    it('should return 400 for missing parameters', async () => {
      const response = await request(app)
        .post('/claude-file')
        .send({ filePath: '.claude/test.md' }) // Missing content
        .expect(400);

      expect(response.body.error.message).toBe('File path and content are required');
    });

    it('should return 500 for validation errors', async () => {
      const response = await request(app)
        .post('/claude-file')
        .send({ 
          filePath: '.claude/agents/instructions/empty.md', 
          content: '' 
        })
        .expect(500);

      expect(response.body.error.message).toContain('validation failed');
    });

    it('should enforce rate limiting', async () => {
      const requests = Array(25).fill(null).map(() => 
        request(app)
          .post('/claude-file')
          .send({ 
            filePath: '.claude/agents/instructions/rate-limit-test.md', 
            content: '# Rate Limit Test\n\nTest content.' 
          })
      );

      const responses = await Promise.all(requests);
      const rateLimited = responses.filter(r => r.status === 429);
      
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('DELETE /claude-file', () => {
    it('should delete existing files', async () => {
      const filePath = '.claude/agents/instructions/api-test.md';
      
      const response = await request(app)
        .delete('/claude-file')
        .query({ path: filePath })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toContain('File deleted');
      
      // Verify file was deleted
      await expect(fs.access(filePath)).rejects.toThrow();
    });

    it('should return 400 if path parameter is missing', async () => {
      const response = await request(app)
        .delete('/claude-file')
        .expect(400);

      expect(response.body.error.message).toBe('File path is required');
    });

    it('should return 500 for non-existent files', async () => {
      const response = await request(app)
        .delete('/claude-file')
        .query({ path: '.claude/agents/instructions/nonexistent.md' })
        .expect(500);

      expect(response.body.error.message).toContain('not found');
    });
  });

  describe('POST /claude-batch-operations', () => {
    it('should execute batch read operations', async () => {
      const operations = [
        { type: 'read', path: '.claude/agents/instructions/api-test.md' },
        { type: 'read', path: '.claude/agents/personas/api-persona.md' }
      ];
      
      const response = await request(app)
        .post('/claude-batch-operations')
        .send({ operations })
        .expect(200);

      expect(response.body.completed).toBe(2);
      expect(response.body.failed).toBe(0);
      expect(response.body.operationId).toBeDefined();
    });

    it('should execute mixed batch operations', async () => {
      const operations = [
        {
          type: 'create',
          path: '.claude/agents/instructions/batch-created.md',
          content: '# Batch Created\n\nCreated via batch API.'
        },
        {
          type: 'read',
          path: '.claude/agents/personas/api-persona.md'
        }
      ];
      
      const response = await request(app)
        .post('/claude-batch-operations')
        .send({ operations })
        .expect(200);

      expect(response.body.completed).toBe(2);
      expect(response.body.failed).toBe(0);
      
      // Verify file was created
      const created = await fs.readFile('.claude/agents/instructions/batch-created.md', 'utf-8');
      expect(created).toContain('Batch Created');
    });

    it('should handle failed operations in batch', async () => {
      const operations = [
        { type: 'read', path: '.claude/agents/instructions/api-test.md' },
        { type: 'read', path: '.claude/agents/instructions/nonexistent.md' }
      ];
      
      const response = await request(app)
        .post('/claude-batch-operations')
        .send({ operations })
        .expect(200);

      expect(response.body.completed).toBe(1);
      expect(response.body.failed).toBe(1);
      expect(response.body.errors).toHaveLength(1);
    });

    it('should return 400 for invalid operations parameter', async () => {
      const response = await request(app)
        .post('/claude-batch-operations')
        .send({ operations: 'not an array' })
        .expect(400);

      expect(response.body.error.message).toBe('Operations array is required');
    });

    it('should validate all operations before execution', async () => {
      const operations = [
        {
          type: 'create',
          path: '.claude/agents/instructions/valid.md',
          content: '# Valid\n\nValid content'
        },
        {
          type: 'create',
          path: '.claude/../malicious.md',
          content: 'malicious'
        }
      ];
      
      const response = await request(app)
        .post('/claude-batch-operations')
        .send({ operations })
        .expect(500);

      expect(response.body.error.message).toContain('validation failed');
      
      // Verify no files were created
      await expect(fs.access('.claude/agents/instructions/valid.md')).rejects.toThrow();
    });
  });

  describe('GET /claude-commands', () => {
    it('should discover available commands', async () => {
      const response = await request(app)
        .get('/claude-commands')
        .expect(200);

      expect(response.body.commands).toHaveLength(1);
      expect(response.body.commands[0].name).toBe('api-command.md');
      expect(response.body.commands[0].type).toBe('command');
      expect(response.body.count).toBe(1);
      expect(response.body.timestamp).toBeDefined();
    });

    it('should return empty list if no commands exist', async () => {
      await fs.rm('.claude/commands', { recursive: true, force: true });
      
      const response = await request(app)
        .get('/claude-commands')
        .expect(200);

      expect(response.body.commands).toHaveLength(0);
      expect(response.body.count).toBe(0);
    });

    it('should filter invalid command files', async () => {
      await fs.writeFile('.claude/commands/invalid.md', '# Not a Command\n\nJust text');
      
      const response = await request(app)
        .get('/claude-commands')
        .expect(200);

      expect(response.body.commands).toHaveLength(1); // Only valid command
      expect(response.body.commands[0].name).toBe('api-command.md');
    });
  });

  describe('Error Handling and Security', () => {
    it('should return structured error responses', async () => {
      const response = await request(app)
        .get('/claude-file')
        .query({ path: '.claude/agents/instructions/nonexistent.md' })
        .expect(500);

      expect(response.body.error).toBeDefined();
      expect(response.body.error.code).toBeDefined();
      expect(response.body.error.message).toBeDefined();
      expect(response.body.error.correlationId).toBeDefined();
      expect(response.body.error.timestamp).toBeDefined();
    });

    it('should include correlation IDs in all responses', async () => {
      const response = await request(app)
        .get('/claude-directory')
        .expect(200);

      expect(response.headers['x-correlation-id']).toBeDefined();
    });

    it('should prevent path traversal in all endpoints', async () => {
      const maliciousPath = '.claude/../../../etc/passwd';
      
      // Test all endpoints that accept file paths
      await request(app)
        .get('/claude-file')
        .query({ path: maliciousPath })
        .expect(500);
        
      await request(app)
        .post('/claude-file')
        .send({ filePath: maliciousPath, content: 'test' })
        .expect(500);
        
      await request(app)
        .delete('/claude-file')
        .query({ path: maliciousPath })
        .expect(500);
    });

    it('should enforce authentication for sensitive operations', async () => {
      // Write and delete operations should be rate limited (indicating they're sensitive)
      const writeRequests = Array(25).fill(null).map(() => 
        request(app)
          .post('/claude-file')
          .send({ 
            filePath: '.claude/agents/instructions/auth-test.md', 
            content: '# Auth Test\n\nTest content.' 
          })
      );

      const responses = await Promise.all(writeRequests);
      const rateLimited = responses.filter(r => r.status === 429);
      expect(rateLimited.length).toBeGreaterThan(0);
    });
  });

  describe('Performance Tests', () => {
    it('should respond to directory listing within 100ms', async () => {
      const start = Date.now();
      
      await request(app)
        .get('/claude-directory')
        .expect(200);
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(200); // Allow some overhead for HTTP
    });

    it('should handle concurrent requests efficiently', async () => {
      const requests = Array(10).fill(null).map(() => 
        request(app).get('/claude-directory')
      );

      const start = Date.now();
      const responses = await Promise.all(requests);
      const duration = Date.now() - start;

      expect(responses.every(r => r.status === 200)).toBe(true);
      expect(duration).toBeLessThan(1000); // Should handle 10 concurrent requests quickly
    });
  });
});