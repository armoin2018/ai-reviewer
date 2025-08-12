/**
 * .claude Directory Management System
 * Provides comprehensive file operations for Claude Code integration
 */

import { promises as fs } from 'fs';
import { join, dirname, basename, extname } from 'path';
import { randomUUID } from 'crypto';

export interface ClaudeFile {
  path: string;
  name: string;
  content: string;
  size: number;
  lastModified: Date;
  type: 'instruction' | 'persona' | 'command' | 'main-instruction';
}

export interface ClaudeFileMetadata {
  path: string;
  name: string;
  size: number;
  lastModified: Date;
  type: 'instruction' | 'persona' | 'command' | 'main-instruction';
}

export interface ClaudeDirectoryListing {
  instructions: ClaudeFileMetadata[];
  personas: ClaudeFileMetadata[];
  commands: ClaudeFileMetadata[];
  mainInstruction?: ClaudeFileMetadata;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export interface BatchOperation {
  operationId: string;
  operations: FileOperation[];
  completed: number;
  failed: number;
  errors: string[];
}

export interface FileOperation {
  type: 'read' | 'write' | 'delete' | 'create';
  path: string;
  content?: string;
  backup?: string;
}

// Default .claude directory structure
const CLAUDE_DIR = '.claude';
const AGENTS_DIR = join(CLAUDE_DIR, 'agents');
const INSTRUCTIONS_DIR = join(AGENTS_DIR, 'instructions');
const PERSONAS_DIR = join(AGENTS_DIR, 'personas');
const COMMANDS_DIR = join(CLAUDE_DIR, 'commands');
const MAIN_INSTRUCTION_FILE = join(CLAUDE_DIR, 'claude-instructions.md');

/**
 * Check if a path is within the allowed .claude directory structure
 */
function validatePath(filePath: string): void {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath.includes('..')) {
    throw new Error('Path traversal not allowed');
  }
  
  if (!normalizedPath.startsWith('.claude/')) {
    throw new Error('File must be within .claude directory');
  }
  
  // Additional security checks
  if (normalizedPath.includes('\0') || 
      normalizedPath.includes('<') || 
      normalizedPath.includes('>')) {
    throw new Error('Invalid characters in file path');
  }
}

/**
 * Determine file type based on path
 */
function getFileType(filePath: string): ClaudeFile['type'] {
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  if (normalizedPath === '.claude/claude-instructions.md') {
    return 'main-instruction';
  } else if (normalizedPath.startsWith('.claude/agents/instructions/')) {
    return 'instruction';
  } else if (normalizedPath.startsWith('.claude/agents/personas/')) {
    return 'persona';
  } else if (normalizedPath.startsWith('.claude/commands/')) {
    return 'command';
  }
  
  throw new Error(`Unsupported file location: ${filePath}`);
}

/**
 * Validate file content based on type
 */
export function validateFileContent(filePath: string, content: string): FileValidationResult {
  const result: FileValidationResult = {
    isValid: true,
    errors: [],
    warnings: []
  };
  
  try {
    const fileType = getFileType(filePath);
    
    // Basic validation
    if (!content.trim()) {
      result.errors.push('File content cannot be empty');
      result.isValid = false;
    }
    
    // Type-specific validation
    switch (fileType) {
      case 'persona':
        if (!content.includes('# Persona:') && !content.includes('## Role')) {
          result.warnings.push('Persona file should include role definition');
        }
        break;
        
      case 'instruction':
        if (!content.includes('applyTo:') && !content.includes('# ')) {
          result.warnings.push('Instruction file should include clear headings');
        }
        break;
        
      case 'command':
        if (!content.includes('# Command:') && !content.includes('## Usage')) {
          result.warnings.push('Command file should include usage instructions');
        }
        break;
        
      case 'main-instruction':
        if (!content.includes('Claude Instructions') && !content.includes('Project Overview')) {
          result.warnings.push('Main instruction file should include project overview');
        }
        break;
    }
    
    // Check for potential security issues
    if (content.includes('eval(') || content.includes('exec(')) {
      result.errors.push('File content contains potentially dangerous code execution');
      result.isValid = false;
    }
    
  } catch (error) {
    result.errors.push(error instanceof Error ? error.message : 'Validation error');
    result.isValid = false;
  }
  
  return result;
}

/**
 * Read the main Claude instructions file
 */
export async function readMainInstructions(): Promise<ClaudeFile> {
  const start = Date.now();
  
  try {
    validatePath(MAIN_INSTRUCTION_FILE);
    
    const content = await fs.readFile(MAIN_INSTRUCTION_FILE, 'utf-8');
    const stats = await fs.stat(MAIN_INSTRUCTION_FILE);
    
    return {
      path: MAIN_INSTRUCTION_FILE,
      name: 'claude-instructions.md',
      content,
      size: stats.size,
      lastModified: stats.mtime,
      type: 'main-instruction'
    };
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      throw new Error('Main Claude instructions file not found');
    }
    throw error;
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Read main instructions: ${duration}ms`);
  }
}

/**
 * List all files in .claude directory structure
 */
export async function listClaudeDirectory(): Promise<ClaudeDirectoryListing> {
  const start = Date.now();
  const result: ClaudeDirectoryListing = {
    instructions: [],
    personas: [],
    commands: []
  };
  
  try {
    // Read main instruction file
    try {
      const stats = await fs.stat(MAIN_INSTRUCTION_FILE);
      result.mainInstruction = {
        path: MAIN_INSTRUCTION_FILE,
        name: 'claude-instructions.md',
        size: stats.size,
        lastModified: stats.mtime,
        type: 'main-instruction'
      };
    } catch {
      // Main instruction file doesn't exist, that's okay
    }
    
    // Read instructions directory
    try {
      const instructionFiles = await fs.readdir(INSTRUCTIONS_DIR);
      for (const file of instructionFiles) {
        if (file.endsWith('.md')) {
          const filePath = join(INSTRUCTIONS_DIR, file).replace(/\\/g, '/');
          const stats = await fs.stat(filePath);
          result.instructions.push({
            path: filePath,
            name: file,
            size: stats.size,
            lastModified: stats.mtime,
            type: 'instruction'
          });
        }
      }
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Read personas directory
    try {
      const personaFiles = await fs.readdir(PERSONAS_DIR);
      for (const file of personaFiles) {
        if (file.endsWith('.md')) {
          const filePath = join(PERSONAS_DIR, file).replace(/\\/g, '/');
          const stats = await fs.stat(filePath);
          result.personas.push({
            path: filePath,
            name: file,
            size: stats.size,
            lastModified: stats.mtime,
            type: 'persona'
          });
        }
      }
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Read commands directory
    try {
      const commandFiles = await fs.readdir(COMMANDS_DIR);
      for (const file of commandFiles) {
        if (file.endsWith('.md')) {
          const filePath = join(COMMANDS_DIR, file).replace(/\\/g, '/');
          const stats = await fs.stat(filePath);
          result.commands.push({
            path: filePath,
            name: file,
            size: stats.size,
            lastModified: stats.mtime,
            type: 'command'
          });
        }
      }
    } catch (error) {
      if ((error as any)?.code !== 'ENOENT') {
        throw error;
      }
    }
    
    // Sort by name
    result.instructions.sort((a, b) => a.name.localeCompare(b.name));
    result.personas.sort((a, b) => a.name.localeCompare(b.name));
    result.commands.sort((a, b) => a.name.localeCompare(b.name));
    
    return result;
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Listed directory: ${duration}ms`);
  }
}

/**
 * Read a specific file from .claude directory
 */
export async function readClaudeFile(filePath: string): Promise<ClaudeFile> {
  const start = Date.now();
  
  try {
    validatePath(filePath);
    
    const content = await fs.readFile(filePath, 'utf-8');
    const stats = await fs.stat(filePath);
    const type = getFileType(filePath);
    
    return {
      path: filePath,
      name: basename(filePath),
      content,
      size: stats.size,
      lastModified: stats.mtime,
      type
    };
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Read file ${filePath}: ${duration}ms`);
  }
}

/**
 * Write a file to .claude directory with validation
 */
export async function writeClaudeFile(filePath: string, content: string): Promise<void> {
  const start = Date.now();
  
  try {
    validatePath(filePath);
    
    // Validate content
    const validation = validateFileContent(filePath, content);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }
    
    // Ensure directory exists
    const dir = dirname(filePath);
    await fs.mkdir(dir, { recursive: true });
    
    // Create backup if file exists
    let backupPath: string | undefined;
    try {
      await fs.access(filePath);
      backupPath = `${filePath}.backup.${Date.now()}`;
      await fs.copyFile(filePath, backupPath);
    } catch {
      // File doesn't exist, no backup needed
    }
    
    try {
      await fs.writeFile(filePath, content, 'utf-8');
      
      // Clean up old backup if write succeeded and we made a backup
      if (backupPath) {
        // Keep only the most recent backup
        setTimeout(async () => {
          try {
            await fs.unlink(backupPath!);
          } catch {
            // Ignore cleanup errors
          }
        }, 5000);
      }
    } catch (error) {
      // Restore from backup if write failed
      if (backupPath) {
        try {
          await fs.copyFile(backupPath, filePath);
        } catch {
          // Ignore restore errors
        }
      }
      throw error;
    }
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Wrote file ${filePath}: ${duration}ms`);
  }
}

/**
 * Delete a file from .claude directory
 */
export async function deleteClaudeFile(filePath: string): Promise<void> {
  const start = Date.now();
  
  try {
    validatePath(filePath);
    
    // Create backup before deletion
    const backupPath = `${filePath}.deleted.${Date.now()}`;
    await fs.copyFile(filePath, backupPath);
    
    await fs.unlink(filePath);
    
    // Clean up backup after 24 hours
    setTimeout(async () => {
      try {
        await fs.unlink(backupPath);
      } catch {
        // Ignore cleanup errors
      }
    }, 24 * 60 * 60 * 1000);
  } catch (error) {
    if ((error as any)?.code === 'ENOENT') {
      throw new Error(`File not found: ${filePath}`);
    }
    throw error;
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Deleted file ${filePath}: ${duration}ms`);
  }
}

/**
 * Batch file operations with atomicity support
 */
export async function executeBatchOperations(operations: FileOperation[]): Promise<BatchOperation> {
  const operationId = randomUUID();
  const start = Date.now();
  
  console.log(`[CLAUDE-DIR] Starting batch operation ${operationId} with ${operations.length} operations`);
  
  const result: BatchOperation = {
    operationId,
    operations: [...operations],
    completed: 0,
    failed: 0,
    errors: []
  };
  
  // Validate all operations first
  for (const op of operations) {
    try {
      validatePath(op.path);
      if (op.content) {
        const validation = validateFileContent(op.path, op.content);
        if (!validation.isValid) {
          throw new Error(`Validation failed: ${validation.errors.join(', ')}`);
        }
      }
    } catch (error) {
      result.errors.push(`Operation ${op.type} on ${op.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.failed++;
    }
  }
  
  // If validation failed for any operation, abort all
  if (result.failed > 0) {
    throw new Error(`Batch operation validation failed: ${result.errors.join('; ')}`);
  }
  
  // Execute operations
  for (const op of operations) {
    try {
      switch (op.type) {
        case 'read':
          // Read operations don't modify state
          await readClaudeFile(op.path);
          break;
          
        case 'write':
        case 'create':
          if (!op.content) {
            throw new Error('Content required for write/create operations');
          }
          await writeClaudeFile(op.path, op.content);
          break;
          
        case 'delete':
          await deleteClaudeFile(op.path);
          break;
          
        default:
          throw new Error(`Unsupported operation type: ${(op as any).type}`);
      }
      
      result.completed++;
    } catch (error) {
      result.failed++;
      result.errors.push(`Operation ${op.type} on ${op.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  const duration = Date.now() - start;
  console.log(`[CLAUDE-DIR] Completed batch operation ${operationId}: ${result.completed} succeeded, ${result.failed} failed (${duration}ms)`);
  
  return result;
}

/**
 * Discover and validate command files in .claude/commands directory
 */
export async function discoverCommands(): Promise<ClaudeFile[]> {
  const start = Date.now();
  const commands: ClaudeFile[] = [];
  
  try {
    const commandFiles = await fs.readdir(COMMANDS_DIR);
    
    for (const file of commandFiles) {
      if (file.endsWith('.md')) {
        const filePath = join(COMMANDS_DIR, file).replace(/\\/g, '/');
        try {
          const command = await readClaudeFile(filePath);
          
          // Basic command validation
          if (command.content.includes('# Command:') || 
              command.content.includes('## Usage')) {
            commands.push(command);
          }
        } catch (error) {
          console.warn(`[CLAUDE-DIR] Failed to read command file ${file}:`, error);
        }
      }
    }
    
    return commands.sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    if ((error as any)?.code !== 'ENOENT') {
      console.error('[CLAUDE-DIR] Error discovering commands:', error);
    }
    return [];
  } finally {
    const duration = Date.now() - start;
    console.log(`[CLAUDE-DIR] Discovered ${commands.length} commands: ${duration}ms`);
  }
}