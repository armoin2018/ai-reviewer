import {
  readMainInstructions,
  listClaudeDirectory,
  readClaudeFile,
  writeClaudeFile,
  deleteClaudeFile,
  executeBatchOperations,
  discoverCommands,
  validateFileContent
} from '../../src/claude-directory.js';
import { promises as fs } from 'fs';
import { join } from 'path';

describe('Claude Directory Management', () => {
  const testDir = '.claude-test';
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
    await fs.writeFile('.claude/claude-instructions.md', '# Claude Instructions\n\nTest main instructions file.');
    await fs.writeFile('.claude/agents/instructions/test-instruction.md', '# Test Instruction\n\nThis is a test instruction.');
    await fs.writeFile('.claude/agents/personas/test-persona.md', '# Persona: Test\n\n## Role\nTest persona');
    await fs.writeFile('.claude/commands/test-command.md', '# Command: Test\n\n## Usage\nTest command usage');
  });
  
  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('readMainInstructions', () => {
    it('should read main Claude instructions file', async () => {
      const result = await readMainInstructions();
      
      expect(result.path).toBe('.claude/claude-instructions.md');
      expect(result.name).toBe('claude-instructions.md');
      expect(result.content).toContain('Claude Instructions');
      expect(result.type).toBe('main-instruction');
      expect(typeof result.size).toBe('number');
      expect(result.lastModified).toBeDefined();
    });
    
    it('should throw error if main instructions file does not exist', async () => {
      await fs.unlink('.claude/claude-instructions.md');
      
      await expect(readMainInstructions()).rejects.toThrow('Main Claude instructions file not found');
    });
  });

  describe('listClaudeDirectory', () => {
    it('should list all files in .claude directory structure', async () => {
      const result = await listClaudeDirectory();
      
      expect(result.mainInstruction).toBeDefined();
      expect(result.mainInstruction?.name).toBe('claude-instructions.md');
      expect(result.mainInstruction?.type).toBe('main-instruction');
      
      expect(result.instructions).toHaveLength(1);
      expect(result.instructions[0].name).toBe('test-instruction.md');
      expect(result.instructions[0].type).toBe('instruction');
      
      expect(result.personas).toHaveLength(1);
      expect(result.personas[0].name).toBe('test-persona.md');
      expect(result.personas[0].type).toBe('persona');
      
      expect(result.commands).toHaveLength(1);
      expect(result.commands[0].name).toBe('test-command.md');
      expect(result.commands[0].type).toBe('command');
    });
    
    it('should handle missing directories gracefully', async () => {
      await fs.rm('.claude/agents/instructions', { recursive: true, force: true });
      await fs.rm('.claude/agents/personas', { recursive: true, force: true });
      
      const result = await listClaudeDirectory();
      
      expect(result.instructions).toHaveLength(0);
      expect(result.personas).toHaveLength(0);
      expect(result.commands).toHaveLength(1); // Still has commands
    });
  });

  describe('readClaudeFile', () => {
    it('should read instruction files', async () => {
      const result = await readClaudeFile('.claude/agents/instructions/test-instruction.md');
      
      expect(result.name).toBe('test-instruction.md');
      expect(result.content).toContain('Test Instruction');
      expect(result.type).toBe('instruction');
    });
    
    it('should read persona files', async () => {
      const result = await readClaudeFile('.claude/agents/personas/test-persona.md');
      
      expect(result.name).toBe('test-persona.md');
      expect(result.content).toContain('Test persona');
      expect(result.type).toBe('persona');
    });
    
    it('should read command files', async () => {
      const result = await readClaudeFile('.claude/commands/test-command.md');
      
      expect(result.name).toBe('test-command.md');
      expect(result.content).toContain('Test command');
      expect(result.type).toBe('command');
    });
    
    it('should throw error for non-existent files', async () => {
      await expect(readClaudeFile('.claude/agents/instructions/nonexistent.md'))
        .rejects.toThrow('File not found');
    });
    
    it('should prevent path traversal attacks', async () => {
      await expect(readClaudeFile('.claude/../../../etc/passwd'))
        .rejects.toThrow('Path traversal not allowed');
    });
    
    it('should reject files outside .claude directory', async () => {
      await expect(readClaudeFile('package.json'))
        .rejects.toThrow('File must be within .claude directory');
    });
  });

  describe('writeClaudeFile', () => {
    it('should write new instruction files', async () => {
      const filePath = '.claude/agents/instructions/new-instruction.md';
      const content = '# New Instruction\n\nThis is a new instruction file.';
      
      await writeClaudeFile(filePath, content);
      
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });
    
    it('should write new persona files', async () => {
      const filePath = '.claude/agents/personas/new-persona.md';
      const content = '# Persona: New\n\n## Role\nNew test persona';
      
      await writeClaudeFile(filePath, content);
      
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });
    
    it('should create directories if they do not exist', async () => {
      await fs.rm('.claude/agents/instructions', { recursive: true, force: true });
      
      const filePath = '.claude/agents/instructions/created-instruction.md';
      const content = '# Created Instruction\n\nThis should create the directory.';
      
      await writeClaudeFile(filePath, content);
      
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(content);
    });
    
    it('should create backup when overwriting existing files', async () => {
      const filePath = '.claude/agents/instructions/test-instruction.md';
      const newContent = '# Updated Instruction\n\nThis is updated content.';
      
      await writeClaudeFile(filePath, newContent);
      
      const written = await fs.readFile(filePath, 'utf-8');
      expect(written).toBe(newContent);
      
      // Check that backup was created (will be cleaned up after 5 seconds)
      const files = await fs.readdir('.claude/agents/instructions');
      const backupFiles = files.filter(f => f.includes('backup'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
    
    it('should prevent path traversal in write operations', async () => {
      await expect(writeClaudeFile('.claude/../malicious.md', 'malicious content'))
        .rejects.toThrow('Path traversal not allowed');
    });
    
    it('should validate file content before writing', async () => {
      await expect(writeClaudeFile('.claude/agents/instructions/empty.md', ''))
        .rejects.toThrow('File validation failed');
    });
  });

  describe('deleteClaudeFile', () => {
    it('should delete existing files', async () => {
      const filePath = '.claude/agents/instructions/test-instruction.md';
      
      await deleteClaudeFile(filePath);
      
      await expect(fs.access(filePath)).rejects.toThrow();
    });
    
    it('should create backup before deletion', async () => {
      const filePath = '.claude/agents/instructions/test-instruction.md';
      
      await deleteClaudeFile(filePath);
      
      // Check that backup was created
      const files = await fs.readdir('.claude/agents/instructions');
      const backupFiles = files.filter(f => f.includes('deleted'));
      expect(backupFiles.length).toBeGreaterThan(0);
    });
    
    it('should throw error for non-existent files', async () => {
      await expect(deleteClaudeFile('.claude/agents/instructions/nonexistent.md'))
        .rejects.toThrow('File not found');
    });
  });

  describe('validateFileContent', () => {
    it('should validate persona files', () => {
      const result = validateFileContent(
        '.claude/agents/personas/test.md', 
        '# Persona: Test\n\n## Role\nTest role'
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should validate instruction files', () => {
      const result = validateFileContent(
        '.claude/agents/instructions/test.md', 
        'applyTo: "**/*.ts"\n\n# Test Instructions'
      );
      
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should reject empty content', () => {
      const result = validateFileContent('.claude/agents/personas/empty.md', '');
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File content cannot be empty');
    });
    
    it('should detect potentially dangerous content', () => {
      const result = validateFileContent(
        '.claude/agents/instructions/dangerous.md', 
        '# Dangerous\n\neval("malicious code")'
      );
      
      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('File content contains potentially dangerous code execution');
    });
    
    it('should provide warnings for incomplete files', () => {
      const result = validateFileContent(
        '.claude/agents/personas/incomplete.md', 
        '# Incomplete Persona\n\nMissing role definition'
      );
      
      expect(result.isValid).toBe(true);
      expect(result.warnings).toContain('Persona file should include role definition');
    });
  });

  describe('executeBatchOperations', () => {
    it('should execute multiple read operations', async () => {
      const operations = [
        { type: 'read' as const, path: '.claude/agents/instructions/test-instruction.md' },
        { type: 'read' as const, path: '.claude/agents/personas/test-persona.md' }
      ];
      
      const result = await executeBatchOperations(operations);
      
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });
    
    it('should execute mixed operations', async () => {
      const operations = [
        { 
          type: 'create' as const, 
          path: '.claude/agents/instructions/batch-created.md',
          content: '# Batch Created\n\nCreated via batch operation'
        },
        {
          type: 'read' as const,
          path: '.claude/agents/personas/test-persona.md'
        }
      ];
      
      const result = await executeBatchOperations(operations);
      
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(0);
      
      // Verify file was created
      const created = await fs.readFile('.claude/agents/instructions/batch-created.md', 'utf-8');
      expect(created).toContain('Batch Created');
    });
    
    it('should handle failed operations gracefully', async () => {
      const operations = [
        { type: 'read' as const, path: '.claude/agents/instructions/test-instruction.md' },
        { type: 'read' as const, path: '.claude/agents/instructions/nonexistent.md' },
        { 
          type: 'create' as const, 
          path: '.claude/agents/personas/batch-test.md',
          content: '# Batch Test\n\n## Role\nTest persona'
        }
      ];
      
      const result = await executeBatchOperations(operations);
      
      expect(result.completed).toBe(2);
      expect(result.failed).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('nonexistent.md');
    });
    
    it('should validate all operations before executing any', async () => {
      const operations = [
        { 
          type: 'create' as const, 
          path: '.claude/agents/instructions/valid.md',
          content: '# Valid\n\nValid content'
        },
        { 
          type: 'create' as const, 
          path: '.claude/../malicious.md', // Invalid path
          content: 'malicious content'
        }
      ];
      
      await expect(executeBatchOperations(operations))
        .rejects.toThrow('Batch operation validation failed');
      
      // Verify no files were created
      await expect(fs.access('.claude/agents/instructions/valid.md')).rejects.toThrow();
    });
  });

  describe('discoverCommands', () => {
    it('should discover command files', async () => {
      const commands = await discoverCommands();
      
      expect(commands).toHaveLength(1);
      expect(commands[0].name).toBe('test-command.md');
      expect(commands[0].type).toBe('command');
      expect(commands[0].content).toContain('Command: Test');
    });
    
    it('should return empty array if commands directory does not exist', async () => {
      await fs.rm('.claude/commands', { recursive: true, force: true });
      
      const commands = await discoverCommands();
      
      expect(commands).toHaveLength(0);
    });
    
    it('should filter out invalid command files', async () => {
      // Create invalid command file
      await fs.writeFile('.claude/commands/invalid.md', '# Not a command\n\nJust some text');
      
      const commands = await discoverCommands();
      
      expect(commands).toHaveLength(1); // Should only include valid command
      expect(commands[0].name).toBe('test-command.md');
    });
    
    it('should sort commands by name', async () => {
      await fs.writeFile('.claude/commands/a-command.md', '# Command: A\n\n## Usage\nCommand A');
      await fs.writeFile('.claude/commands/z-command.md', '# Command: Z\n\n## Usage\nCommand Z');
      
      const commands = await discoverCommands();
      
      expect(commands).toHaveLength(3);
      expect(commands[0].name).toBe('a-command.md');
      expect(commands[1].name).toBe('test-command.md');
      expect(commands[2].name).toBe('z-command.md');
    });
  });

  describe('Security Tests', () => {
    it('should prevent directory traversal in all file operations', async () => {
      const maliciousPaths = [
        '.claude/../../../etc/passwd',
        '.claude\\..\\..\\windows\\system32\\config',
        '.claude/agents/../../malicious.md',
        '.claude/commands/../../../secret.txt'
      ];
      
      for (const path of maliciousPaths) {
        await expect(readClaudeFile(path)).rejects.toThrow('Path traversal not allowed');
        await expect(writeClaudeFile(path, 'content')).rejects.toThrow('Path traversal not allowed');
        await expect(deleteClaudeFile(path)).rejects.toThrow('Path traversal not allowed');
      }
    });
    
    it('should reject files with invalid characters', async () => {
      const invalidPaths = [
        '.claude/agents/instructions/file\0.md',
        '.claude/agents/personas/file<>.md',
        '.claude/commands/file\x00.md'
      ];
      
      for (const path of invalidPaths) {
        await expect(writeClaudeFile(path, 'content')).rejects.toThrow('Invalid characters in file path');
      }
    });
    
    it('should only allow files within .claude directory', async () => {
      const externalPaths = [
        'package.json',
        '../package.json',
        '/etc/passwd',
        'C:\\Windows\\system.ini'
      ];
      
      for (const path of externalPaths) {
        await expect(readClaudeFile(path)).rejects.toThrow();
        await expect(writeClaudeFile(path, 'content')).rejects.toThrow();
      }
    });
  });

  describe('Performance Tests', () => {
    it('should complete file operations within 100ms for small files', async () => {
      const start = Date.now();
      
      await readClaudeFile('.claude/agents/instructions/test-instruction.md');
      
      const duration = Date.now() - start;
      expect(duration).toBeLessThan(100);
    });
    
    it('should handle batch operations efficiently', async () => {
      // Create multiple operations
      const operations = [];
      for (let i = 0; i < 10; i++) {
        operations.push({
          type: 'create' as const,
          path: `.claude/agents/instructions/perf-test-${i}.md`,
          content: `# Performance Test ${i}\n\nTest file for performance testing.`
        });
      }
      
      const start = Date.now();
      const result = await executeBatchOperations(operations);
      const duration = Date.now() - start;
      
      expect(result.completed).toBe(10);
      expect(result.failed).toBe(0);
      expect(duration).toBeLessThan(2000); // Should complete within 2 seconds
    });
  });
});