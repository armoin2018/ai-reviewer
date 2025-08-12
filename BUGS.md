# BUGS.md

This file tracks bugs and issues identified during development of the Copilot Skillset Reviewer project.

## Bug Report Template

```markdown
## BUG-YYYY.MM.DD-### - [Title]

**Date**: YYYY-MM-DD  
**Priority**: [Critical|High|Medium|Low]  
**Category**: [Security|Performance|Functionality|UI/UX|Integration]  
**Reported By**: [Role/Persona]  
**Status**: [Open|In Progress|Fixed|Closed|Won't Fix]  
**Assigned To**: [Persona responsible for fix]

### Description

[Clear description of the bug]

### Steps to Reproduce

1. [Step 1]
2. [Step 2]
3. [Result]

### Expected Behavior

[What should happen]

### Actual Behavior

[What actually happens]

### Environment

- OS: [Operating System]
- Node.js: [Version]
- Browser: [If applicable]
- IDE: [If applicable]

### Impact Assessment

[How this bug affects users/system]

### Related Requirements

[Links to requirements that may be affected]

### Fix Approach

[Planned approach to resolve the issue]
```

---

## Active Bugs

## BUG-2025.08.12-001 - VS Code Extension TypeScript Build Issues

**Date**: 2025-08-12  
**Priority**: Medium  
**Category**: Integration  
**Reported By**: Implementation Engineer  
**Status**: Open  
**Assigned To**: `vscode-extension-developer.md`

### Description

VS Code extension build fails due to TypeScript configuration conflicts when importing from main project files. Root cause is the `rootDir` restriction in tsconfig.json preventing cross-directory imports.

### Steps to Reproduce

1. Navigate to vscode-extension directory
2. Run `npm run build`
3. Observe TypeScript compilation errors about files not under 'rootDir'

### Expected Behavior

Extension should build successfully with access to main project lib.ts exports.

### Actual Behavior

Build fails with TS6059 errors about files not being under rootDir.

### Environment

- OS: macOS Darwin 24.6.0
- Node.js: Current project version
- VS Code: ^1.85.0
- TypeScript: ^5.5.4

### Impact Assessment

- VS Code extension enhanced functionality cannot be tested
- Deployment of extension updates blocked
- Users cannot access new .claude directory management features via VS Code

### Fix Approach

1. Update vscode-extension tsconfig.json to allow parent directory imports
2. Add proper type declarations for VS Code API
3. Configure module resolution for cross-project dependencies
4. Consider using build output from main project instead of source imports

### Workaround

Extension functionality can be accessed via HTTP API mode by setting `skillset.serverMode` to `"http"` in VS Code settings.

### Related Requirements

- R6: VS Code Extension functionality
- R7: Multi-IDE support

---

## Fixed Bugs

### BUG-2025.08.12-002 - Unified Diff Path Extraction Bug

**Date**: 2025-08-12  
**Priority**: High  
**Category**: Functionality  
**Reported By**: Implementation Engineer  
**Status**: Fixed  
**Assigned To**: `senior-nodejs-developer.md`

#### Description

Unified diff format parser was not properly stripping 'a/' and 'b/' prefixes from file paths, causing tests to fail and incorrect path extraction.

#### Steps to Reproduce

1. Parse a unified diff with format `--- a/test.js` and `+++ b/test.js`
2. Check the extracted file path 
3. Path would be "b/test.js" instead of "test.js"

#### Expected Behavior

File path should be extracted as "test.js" after stripping standard prefixes.

#### Actual Behavior

File path was "b/test.js" including the prefix.

#### Fix Applied

- Updated `parseUnifiedDiff` function in `src/diff.ts` to strip 'a/' and 'b/' prefixes
- Added regex replacement: `cleanPath = pathMatch[1].replace(/^[ab]\//, '')`
- All tests now pass with correct path extraction

#### Impact Assessment

- Diff processing accuracy improved
- Test suite now passes completely  
- Better compatibility with standard diff tools

#### Related Requirements

- R3.2: Extract changed file paths accurately

### BUG-2025.08.12-003 - TypeScript Type Errors in GitHub Checks

**Date**: 2025-08-12  
**Priority**: Medium  
**Category**: Functionality  
**Reported By**: Implementation Engineer  
**Status**: Fixed  
**Assigned To**: `senior-nodejs-developer.md`

#### Description

TypeScript compiler was reporting 'result' is of type 'unknown' errors in github-checks.ts due to missing type annotations for API response parsing.

#### Steps to Reproduce

1. Run TypeScript compilation with `npm run typecheck`
2. Observe TS18046 errors in github-checks.ts lines 167, 170, 171, 226, 229, 230, 296, 299, 300

#### Expected Behavior

TypeScript should compile without errors with proper type safety.

#### Actual Behavior

TypeScript reported unknown type errors preventing compilation.

#### Fix Applied

- Added explicit type annotations to JSON response parsing
- Changed `response.json()` to `response.json() as Promise<{ id: number; html_url: string }>`
- Applied fix to all three GitHub API functions: createCheckRun, updateCheckRun, createPRComment

#### Impact Assessment

- TypeScript compilation now passes without errors
- Type safety improved for GitHub API interactions
- Better developer experience with proper typing

#### Related Requirements

- Development environment stability
- Type safety requirements

---

## Known Limitations

### LIMIT-2025.08.11-001 - GitHub API Rate Limiting

**Category**: Integration  
**Impact**: Medium  
**Status**: Acknowledged

#### Description

GitHub API has rate limits that may affect rule loading performance during high usage periods.

#### Mitigation Strategy

- Implement aggressive caching for GitHub API responses
- Use conditional requests with ETag headers
- Implement request queuing and retry logic
- Document rate limit handling for users

#### Related Requirements

- R11.2 - Graceful handling of GitHub API rate limits

### LIMIT-2025.08.11-002 - MCP Protocol Evolution

**Category**: Integration  
**Impact**: Medium  
**Status**: Monitoring

#### Description

MCP (Model Context Protocol) is an evolving specification that may introduce breaking changes.

#### Mitigation Strategy

- Monitor MCP specification updates closely
- Implement version compatibility checking
- Maintain fallback to HTTP API interface
- Version lock MCP dependencies appropriately

#### Related Requirements

- R5 - MCP Server Integration

### LIMIT-2025.08.11-003 - Multi-IDE Testing Complexity

**Category**: Testing  
**Impact**: Medium  
**Status**: Planned

#### Description

Testing across multiple IDEs (GitHub Copilot, Cursor, WindSurf, Claude Code) requires diverse development environments.

#### Mitigation Strategy

- Set up containerized testing environments
- Create automated testing scripts for each IDE
- Implement integration testing framework
- Document manual testing procedures

#### Related Requirements

- R7 - Multi-IDE Integration and Support

---

## Security Considerations

### SEC-2025.08.11-001 - File System Access Controls

**Category**: Security  
**Priority**: High  
**Status**: Design Phase

#### Description

.claude directory operations require careful access controls to prevent unauthorized modification of project instructions and personas.

#### Security Measures

- Implement file permission validation
- Add audit logging for all file operations
- Validate file paths to prevent directory traversal
- Implement atomic operations with rollback capability

#### Related Requirements

- R12.6 - File system access controls for .claude directory operations
- R8 - Claude Directory Management

### SEC-2025.08.11-002 - Command Execution Sandboxing

**Category**: Security  
**Priority**: High  
**Status**: Design Phase

#### Description

Command execution framework needs proper sandboxing to prevent privilege escalation and unauthorized system access.

#### Security Measures

- Implement command execution in restricted environment
- Validate all command parameters against schemas
- Limit file system and network access for commands
- Add comprehensive logging and monitoring

#### Related Requirements

- R12.7 - Command execution sandboxing and privilege restrictions
- R9 - Commands Integration

---

## Performance Notes

### PERF-2025.08.11-001 - Response Time Optimization

**Category**: Performance  
**Target**: <2s API response, <500ms commands, <1s file ops  
**Status**: Design Phase

#### Optimization Areas

1. **API Responses**: Caching, async processing, connection pooling
2. **Command Execution**: JIT compilation, result caching, parallel execution
3. **File Operations**: Memory mapping, batch operations, concurrent I/O

#### Monitoring Strategy

- Implement detailed performance metrics
- Set up alerting for SLA violations
- Create performance regression testing
- Monitor memory usage and connection counts

#### Related Requirements

- R10 - Performance Requirements
- R11.5 - File system operations with atomic updates

---

_This file will be updated as issues are identified during development and testing phases._
