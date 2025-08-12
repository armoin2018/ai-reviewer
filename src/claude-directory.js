"use strict";
/**
 * .claude Directory Management System
 * Provides comprehensive file operations for Claude Code integration
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateFileContent = validateFileContent;
exports.readMainInstructions = readMainInstructions;
exports.listClaudeDirectory = listClaudeDirectory;
exports.readClaudeFile = readClaudeFile;
exports.writeClaudeFile = writeClaudeFile;
exports.deleteClaudeFile = deleteClaudeFile;
exports.executeBatchOperations = executeBatchOperations;
exports.discoverCommands = discoverCommands;
const fs_1 = require("fs");
const path_1 = require("path");
const crypto_1 = require("crypto");
// Default .claude directory structure
const CLAUDE_DIR = '.claude';
const AGENTS_DIR = (0, path_1.join)(CLAUDE_DIR, 'agents');
const INSTRUCTIONS_DIR = (0, path_1.join)(AGENTS_DIR, 'instructions');
const PERSONAS_DIR = (0, path_1.join)(AGENTS_DIR, 'personas');
const COMMANDS_DIR = (0, path_1.join)(CLAUDE_DIR, 'commands');
const MAIN_INSTRUCTION_FILE = (0, path_1.join)(CLAUDE_DIR, 'claude-instructions.md');
/**
 * Check if a path is within the allowed .claude directory structure
 */
function validatePath(filePath) {
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
function getFileType(filePath) {
    const normalizedPath = filePath.replace(/\\/g, '/');
    if (normalizedPath === '.claude/claude-instructions.md') {
        return 'main-instruction';
    }
    else if (normalizedPath.startsWith('.claude/agents/instructions/')) {
        return 'instruction';
    }
    else if (normalizedPath.startsWith('.claude/agents/personas/')) {
        return 'persona';
    }
    else if (normalizedPath.startsWith('.claude/commands/')) {
        return 'command';
    }
    throw new Error(`Unsupported file location: ${filePath}`);
}
/**
 * Validate file content based on type
 */
function validateFileContent(filePath, content) {
    const result = {
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
    }
    catch (error) {
        result.errors.push(error instanceof Error ? error.message : 'Validation error');
        result.isValid = false;
    }
    return result;
}
/**
 * Read the main Claude instructions file
 */
async function readMainInstructions() {
    const start = Date.now();
    try {
        validatePath(MAIN_INSTRUCTION_FILE);
        const content = await fs_1.promises.readFile(MAIN_INSTRUCTION_FILE, 'utf-8');
        const stats = await fs_1.promises.stat(MAIN_INSTRUCTION_FILE);
        return {
            path: MAIN_INSTRUCTION_FILE,
            name: 'claude-instructions.md',
            content,
            size: stats.size,
            lastModified: stats.mtime,
            type: 'main-instruction'
        };
    }
    catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error('Main Claude instructions file not found');
        }
        throw error;
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Read main instructions: ${duration}ms`);
    }
}
/**
 * List all files in .claude directory structure
 */
async function listClaudeDirectory() {
    const start = Date.now();
    const result = {
        instructions: [],
        personas: [],
        commands: []
    };
    try {
        // Read main instruction file
        try {
            const stats = await fs_1.promises.stat(MAIN_INSTRUCTION_FILE);
            result.mainInstruction = {
                path: MAIN_INSTRUCTION_FILE,
                name: 'claude-instructions.md',
                size: stats.size,
                lastModified: stats.mtime,
                type: 'main-instruction'
            };
        }
        catch {
            // Main instruction file doesn't exist, that's okay
        }
        // Read instructions directory
        try {
            const instructionFiles = await fs_1.promises.readdir(INSTRUCTIONS_DIR);
            for (const file of instructionFiles) {
                if (file.endsWith('.md')) {
                    const filePath = (0, path_1.join)(INSTRUCTIONS_DIR, file).replace(/\\/g, '/');
                    const stats = await fs_1.promises.stat(filePath);
                    result.instructions.push({
                        path: filePath,
                        name: file,
                        size: stats.size,
                        lastModified: stats.mtime,
                        type: 'instruction'
                    });
                }
            }
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
        // Read personas directory
        try {
            const personaFiles = await fs_1.promises.readdir(PERSONAS_DIR);
            for (const file of personaFiles) {
                if (file.endsWith('.md')) {
                    const filePath = (0, path_1.join)(PERSONAS_DIR, file).replace(/\\/g, '/');
                    const stats = await fs_1.promises.stat(filePath);
                    result.personas.push({
                        path: filePath,
                        name: file,
                        size: stats.size,
                        lastModified: stats.mtime,
                        type: 'persona'
                    });
                }
            }
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
        // Read commands directory
        try {
            const commandFiles = await fs_1.promises.readdir(COMMANDS_DIR);
            for (const file of commandFiles) {
                if (file.endsWith('.md')) {
                    const filePath = (0, path_1.join)(COMMANDS_DIR, file).replace(/\\/g, '/');
                    const stats = await fs_1.promises.stat(filePath);
                    result.commands.push({
                        path: filePath,
                        name: file,
                        size: stats.size,
                        lastModified: stats.mtime,
                        type: 'command'
                    });
                }
            }
        }
        catch (error) {
            if (error?.code !== 'ENOENT') {
                throw error;
            }
        }
        // Sort by name
        result.instructions.sort((a, b) => a.name.localeCompare(b.name));
        result.personas.sort((a, b) => a.name.localeCompare(b.name));
        result.commands.sort((a, b) => a.name.localeCompare(b.name));
        return result;
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Listed directory: ${duration}ms`);
    }
}
/**
 * Read a specific file from .claude directory
 */
async function readClaudeFile(filePath) {
    const start = Date.now();
    try {
        validatePath(filePath);
        const content = await fs_1.promises.readFile(filePath, 'utf-8');
        const stats = await fs_1.promises.stat(filePath);
        const type = getFileType(filePath);
        return {
            path: filePath,
            name: (0, path_1.basename)(filePath),
            content,
            size: stats.size,
            lastModified: stats.mtime,
            type
        };
    }
    catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Read file ${filePath}: ${duration}ms`);
    }
}
/**
 * Write a file to .claude directory with validation
 */
async function writeClaudeFile(filePath, content) {
    const start = Date.now();
    try {
        validatePath(filePath);
        // Validate content
        const validation = validateFileContent(filePath, content);
        if (!validation.isValid) {
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
        // Ensure directory exists
        const dir = (0, path_1.dirname)(filePath);
        await fs_1.promises.mkdir(dir, { recursive: true });
        // Create backup if file exists
        let backupPath;
        try {
            await fs_1.promises.access(filePath);
            backupPath = `${filePath}.backup.${Date.now()}`;
            await fs_1.promises.copyFile(filePath, backupPath);
        }
        catch {
            // File doesn't exist, no backup needed
        }
        try {
            await fs_1.promises.writeFile(filePath, content, 'utf-8');
            // Clean up old backup if write succeeded and we made a backup
            if (backupPath) {
                // Keep only the most recent backup
                setTimeout(async () => {
                    try {
                        await fs_1.promises.unlink(backupPath);
                    }
                    catch {
                        // Ignore cleanup errors
                    }
                }, 5000);
            }
        }
        catch (error) {
            // Restore from backup if write failed
            if (backupPath) {
                try {
                    await fs_1.promises.copyFile(backupPath, filePath);
                }
                catch {
                    // Ignore restore errors
                }
            }
            throw error;
        }
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Wrote file ${filePath}: ${duration}ms`);
    }
}
/**
 * Delete a file from .claude directory
 */
async function deleteClaudeFile(filePath) {
    const start = Date.now();
    try {
        validatePath(filePath);
        // Create backup before deletion
        const backupPath = `${filePath}.deleted.${Date.now()}`;
        await fs_1.promises.copyFile(filePath, backupPath);
        await fs_1.promises.unlink(filePath);
        // Clean up backup after 24 hours
        setTimeout(async () => {
            try {
                await fs_1.promises.unlink(backupPath);
            }
            catch {
                // Ignore cleanup errors
            }
        }, 24 * 60 * 60 * 1000);
    }
    catch (error) {
        if (error?.code === 'ENOENT') {
            throw new Error(`File not found: ${filePath}`);
        }
        throw error;
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Deleted file ${filePath}: ${duration}ms`);
    }
}
/**
 * Batch file operations with atomicity support
 */
async function executeBatchOperations(operations) {
    const operationId = (0, crypto_1.randomUUID)();
    const start = Date.now();
    console.log(`[CLAUDE-DIR] Starting batch operation ${operationId} with ${operations.length} operations`);
    const result = {
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
        }
        catch (error) {
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
                    throw new Error(`Unsupported operation type: ${op.type}`);
            }
            result.completed++;
        }
        catch (error) {
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
async function discoverCommands() {
    const start = Date.now();
    const commands = [];
    try {
        const commandFiles = await fs_1.promises.readdir(COMMANDS_DIR);
        for (const file of commandFiles) {
            if (file.endsWith('.md')) {
                const filePath = (0, path_1.join)(COMMANDS_DIR, file).replace(/\\/g, '/');
                try {
                    const command = await readClaudeFile(filePath);
                    // Basic command validation
                    if (command.content.includes('# Command:') ||
                        command.content.includes('## Usage')) {
                        commands.push(command);
                    }
                }
                catch (error) {
                    console.warn(`[CLAUDE-DIR] Failed to read command file ${file}:`, error);
                }
            }
        }
        return commands.sort((a, b) => a.name.localeCompare(b.name));
    }
    catch (error) {
        if (error?.code !== 'ENOENT') {
            console.error('[CLAUDE-DIR] Error discovering commands:', error);
        }
        return [];
    }
    finally {
        const duration = Date.now() - start;
        console.log(`[CLAUDE-DIR] Discovered ${commands.length} commands: ${duration}ms`);
    }
}
//# sourceMappingURL=claude-directory.js.map