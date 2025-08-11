# REQUIREMENTS.md

## Overview

This document defines the requirements for the Copilot Skillset Reviewer - a hybrid AI code review and compliance checking system that provides multiple interfaces for automated code review, security analysis, and policy enforcement.

## Project Scope

The system shall provide AI-powered code review capabilities through multiple interfaces (HTTP API, MCP server, VS Code extension) with configurable guidance packs for different compliance frameworks and coding standards.

---

## Functional Requirements

### R1 - HTTP API Server
**Description**: The system shall provide a REST API server for code review operations.
- **R1.1**: Server shall listen on configurable port (default 8080)
- **R1.2**: Server shall support CORS for cross-origin requests
- **R1.3**: Server shall accept JSON payloads up to 10MB
- **R1.4**: Server shall provide health check endpoint at `/healthz`
- **R1.5**: Server shall return structured error responses with codes and messages

**Acceptance Criteria**:
- API responds to health checks within 100ms
- All endpoints return proper HTTP status codes
- Error responses include machine-readable error codes

### R2 - Rule Management
**Description**: The system shall load and manage coding rules from multiple sources.
- **R2.1**: Load rules from GitHub repositories via `/load-rules` endpoint
- **R2.2**: Support bundled guidance packs (baseline-secure, oss-apache-2, enterprise-strict, pci-dss, pii-redaction, design-doc-reviewer)
- **R2.3**: Summarize rules into actionable checklists via `/summarize-rules` endpoint
- **R2.4**: Support rule combination modes: org-only, repo-only, merged
- **R2.5**: Load file contents from GitHub repositories for context

**Acceptance Criteria**:
- Rules loaded from valid GitHub repos within 5 seconds
- Checklist generation produces maximum 400 actionable items
- All bundled packs contain valid personas and policies

### R3 - Diff Processing
**Description**: The system shall process and normalize git diffs for analysis.
- **R3.1**: Parse unified diff format via `/normalize-diff` endpoint
- **R3.2**: Extract changed file paths from diffs
- **R3.3**: Support configurable strip levels for path normalization
- **R3.4**: Handle various diff formats (git, standard unified)

**Acceptance Criteria**:
- Successfully parse diffs with >99% accuracy
- Extract all modified file paths correctly
- Handle edge cases (binary files, renames, deletions)

### R4 - Compliance Checking
**Description**: The system shall perform automated compliance checks on code changes.
- **R4.1**: Check for presence of tests when `requireTests=true`
- **R4.2**: Detect exposed secrets in code changes
- **R4.3**: Validate license headers in source files
- **R4.4**: Enforce import restrictions based on deny-lists
- **R4.5**: Check for required file patterns and structures
- **R4.6**: Validate PR labels and commit message formatting
- **R4.7**: Respect maximum file size limits (default 500KB)

**Acceptance Criteria**:
- Secret detection with <0.1% false negative rate
- License header validation covers all supported languages
- Test presence detection accuracy >95%

### R5 - MCP Server Integration
**Description**: The system shall provide Model Context Protocol server interface with .claude directory management.
- **R5.1**: Accept JSON-RPC requests over stdio
- **R5.2**: Expose all HTTP API functionality via MCP Skills interface
- **R5.3**: Handle graceful shutdown on SIGINT
- **R5.4**: Provide structured error responses for invalid requests
- **R5.5**: Provide individual access to `.claude/claude-instructions.md` file
- **R5.6**: List with summary and individual access to `.claude/agents/instructions/*.md` files
- **R5.7**: List with summary and individual access to `.claude/agents/personas/*.md` files
- **R5.8**: Support adding new instructions and personas to `.claude/agents/` directories
- **R5.9**: Support updating existing instructions and personas files
- **R5.10**: Validate instruction and persona file formats against established schemas

**Acceptance Criteria**:
- MCP server responds to valid JSON-RPC within 200ms
- All HTTP endpoints accessible via MCP interface
- Proper error handling for malformed JSON
- Claude instructions file accessible within 100ms via MCP
- Instructions listing includes file names, summaries, and last modified dates
- Personas listing includes names, roles, and capability summaries
- File creation/updates preserve existing directory structure and naming conventions
- All .claude file operations include validation against persona/instruction schemas

### R6 - VS Code Extension
**Description**: The system shall provide VS Code integration capabilities.
- **R6.1**: Status bar pack switcher for guidance selection
- **R6.2**: Guidance preview functionality
- **R6.3**: Pack linting capabilities
- **R6.4**: Build and packaging support

**Acceptance Criteria**:
- Extension loads in VS Code without errors
- Pack switching updates active guidance within 1 second
- Linting identifies pack validation issues

### R7 - GitHub Integration & Multi-IDE Support
**Description**: The system shall integrate with GitHub for PR reviews and support multiple IDEs/editors.
- **R7.1**: Support GitHub App authentication via manifest setup
- **R7.2**: Generate Check Runs with file annotations
- **R7.3**: Load repo-specific rules from `.copilot/` directories
- **R7.4**: Infer quality gates from project files (package.json, pyproject.toml, etc.)
- **R7.5**: Support PR comment generation
- **R7.6**: Build `.claude/commands/` functionality into skillset APIs
- **R7.7**: Support integration with GitHub Copilot via skillset commands
- **R7.8**: Support integration with Cursor IDE via MCP interface
- **R7.9**: Support integration with WindSurf editor via API endpoints
- **R7.10**: Support integration with Claude Code via MCP server

**Acceptance Criteria**:
- GitHub App setup completes via manifest in <60 seconds
- Check Runs appear in PR interface within 30 seconds
- Quality gate inference accuracy >90% for supported project types
- Commands from `.claude/commands/` accessible via all supported IDEs
- Multi-IDE integration maintains consistent functionality across platforms
- Integration APIs respond within 500ms for command execution

### R8 - Claude Directory Management
**Description**: The system shall provide comprehensive management of .claude project structures.
- **R8.1**: Read and parse `.claude/claude-instructions.md` with metadata extraction
- **R8.2**: Enumerate all instruction files in `.claude/agents/instructions/` with summaries
- **R8.3**: Enumerate all persona files in `.claude/agents/personas/` with role descriptions
- **R8.4**: Validate instruction file format against language-specific templates
- **R8.5**: Validate persona file format against persona schema requirements
- **R8.6**: Create new instruction files with proper headers and structure
- **R8.7**: Create new persona files following established template patterns
- **R8.8**: Update existing files while preserving version history and metadata
- **R8.9**: Index personas by capability tags and specialization areas
- **R8.10**: Maintain personas-index.md with automated updates

**Acceptance Criteria**:
- All .claude files parsed and indexed within 1 second of discovery
- Instruction summaries include applyTo scope, language focus, and key guidelines  
- Persona summaries include role, goals, tools, and behavioral directives
- File validation catches format errors with specific line-level feedback
- New files follow established naming conventions and directory structure
- Updates preserve original file structure and metadata sections
- Index maintenance keeps personas-index.md current with directory contents

### R9 - Commands Integration
**Description**: The system shall integrate .claude/commands functionality into the skillset framework.
- **R9.1**: Discover and parse command definitions from `.claude/commands/` directory
- **R9.2**: Expose commands via HTTP API endpoints with proper routing
- **R9.3**: Integrate commands into MCP Skills interface for Claude Code access
- **R9.4**: Validate command syntax and parameter schemas before execution
- **R9.5**: Map commands to appropriate personas and instructions for context
- **R9.6**: Support command composition and chaining for complex workflows
- **R9.7**: Provide command help and documentation generation
- **R9.8**: Log command execution with correlation IDs and performance metrics
- **R9.9**: Support command versioning and backward compatibility
- **R9.10**: Enable command discovery and autocomplete in supported IDEs

**Acceptance Criteria**:
- Commands discovered and registered automatically on system startup
- Command execution latency <500ms for simple operations
- Parameter validation prevents malformed command invocation
- Command help documentation generated from metadata and schemas
- Execution logging includes timing, parameters, and results (sanitized)
- IDE autocomplete provides command signatures and examples
- Versioned commands maintain backward compatibility across updates

---

## Non-Functional Requirements

### R10 - Performance
- **R10.1**: API response time <2 seconds for typical requests
- **R10.2**: Support concurrent requests up to 100 simultaneous connections
- **R10.3**: Memory usage <512MB under normal load
- **R10.4**: Container startup time <10 seconds
- **R10.5**: .claude file operations complete within 1 second
- **R10.6**: Command execution latency <500ms for simple operations

### R11 - Reliability
- **R11.1**: System uptime >99.9% excluding planned maintenance
- **R11.2**: Graceful handling of GitHub API rate limits
- **R11.3**: Automatic retry logic with exponential backoff
- **R11.4**: Circuit breaker pattern for external dependencies
- **R11.5**: File system operations with atomic updates and rollback capability
- **R11.6**: Command execution with error recovery and graceful degradation

### R12 - Security
- **R12.1**: GitHub App private keys stored securely (environment variables)
- **R12.2**: No hardcoded secrets in source code
- **R12.3**: Input validation on all API endpoints
- **R12.4**: HTTPS enforcement for production deployments
- **R12.5**: Audit logging for sensitive operations
- **R12.6**: File system access controls for .claude directory operations
- **R12.7**: Command execution sandboxing and privilege restrictions

### R13 - Scalability
- **R13.1**: Horizontal scaling support via container orchestration
- **R13.2**: Stateless design for load balancing
- **R13.3**: Database-free architecture for simplified deployment
- **R13.4**: Resource limits configurable per deployment
- **R13.5**: Multi-tenant isolation for .claude directory access
- **R13.6**: Command execution queuing and rate limiting per tenant

---

## Technical Requirements

### R14 - Architecture
- **R14.1**: TypeScript/Node.js implementation with ES modules
- **R14.2**: Express.js framework for HTTP server
- **R14.3**: Container-first deployment model
- **R14.4**: Multi-interface design (HTTP, MCP, VS Code)
- **R14.5**: File system abstraction layer for .claude directory operations
- **R14.6**: Command execution framework with plugin architecture

### R15 - Data Formats
- **R15.1**: JSON for all API request/response bodies
- **R15.2**: Unified diff format for code changes
- **R15.3**: Markdown for guidance and policy documents
- **R15.4**: YAML/JSON for configuration files
- **R15.5**: Structured metadata format for personas and instructions
- **R15.6**: Command definition schema with versioning support

### R16 - Dependencies
- **R16.1**: Minimal external dependencies for security
- **R16.2**: Well-maintained packages with active development
- **R16.3**: License compatibility (MIT/Apache-2 preferred)
- **R16.4**: Regular dependency updates and security patches
- **R16.5**: File system libraries with atomic operation support
- **R16.6**: Markdown parsing and validation libraries

---

## Compliance & Standards

### R17 - Code Quality
- **R17.1**: TypeScript strict mode enforcement
- **R17.2**: ESLint configuration for code consistency
- **R17.3**: Unit test coverage >80%
- **R17.4**: Integration tests for all API endpoints
- **R17.5**: Automated testing for .claude file operations
- **R17.6**: Command execution validation and testing

### R18 - Documentation
- **R18.1**: API documentation via OpenAPI/Swagger
- **R18.2**: README with setup and usage instructions
- **R18.3**: Code comments for complex business logic
- **R18.4**: Architecture documentation in CLAUDE.md
- **R18.5**: Command reference documentation with examples
- **R18.6**: Persona and instruction template documentation

### R19 - Licensing
- **R19.1**: Open source license compatibility
- **R19.2**: Clear license headers in source files
- **R19.3**: Third-party license compliance
- **R19.4**: License scanning in CI/CD pipeline
- **R19.5**: Compliance with .claude content licensing requirements

---

## Environment Requirements

### R20 - Runtime Environment
- **R20.1**: Node.js 18+ runtime support
- **R20.2**: Docker container compatibility
- **R20.3**: Linux/macOS/Windows development support
- **R20.4**: Cloud deployment ready (AWS, GCP, Azure)
- **R20.5**: File system permissions for .claude directory access
- **R20.6**: Multi-IDE compatibility (VS Code, Cursor, WindSurf)

### R21 - Configuration
- **R21.1**: Environment variable configuration
- **R21.2**: `.env` file support for development
- **R21.3**: Container orchestration compatibility
- **R21.4**: Configurable logging levels
- **R21.5**: Configurable .claude directory paths and permissions
- **R21.6**: IDE-specific configuration templates

---

## Acceptance Criteria Summary

### System Integration Tests
1. End-to-end PR review workflow completes successfully
2. All guidance packs load and validate without errors
3. MCP server integrates with Claude without issues
4. VS Code extension installs and functions properly
5. Container deployment succeeds in target environments
6. .claude directory management works across all IDEs (GitHub Copilot, Cursor, WindSurf, Claude Code)
7. Commands execution and discovery functions in all supported editors
8. Persona and instruction file operations maintain data integrity

### Performance Benchmarks
1. API handles 1000 requests/minute under normal load
2. Diff processing completes within SLA for typical PR sizes
3. Memory footprint remains stable under sustained load
4. Container scales horizontally without data corruption
5. .claude file operations complete within 1 second performance target
6. Command execution latency meets <500ms requirement
7. Multi-IDE integration maintains consistent response times

### Security Validation
1. Penetration testing shows no critical vulnerabilities
2. Secret scanning prevents credential exposure
3. GitHub App permissions follow principle of least privilege
4. All external communications use secure protocols
5. File system access controls prevent unauthorized .claude directory access
6. Command execution sandboxing prevents privilege escalation
7. Multi-tenant isolation maintains data separation

---

## Future Enhancements (Out of Scope)

- Machine learning model training for custom rule detection
- Real-time collaboration features for .claude directory editing
- Multi-language support beyond English
- Advanced analytics and reporting dashboard
- Custom rule DSL for policy authoring
- Visual persona and instruction editors
- AI-powered command suggestion and generation
- Cross-repository .claude content synchronization
- Advanced command orchestration and workflow automation
- Integration with additional IDEs and editors beyond current scope

---

## Requirement Mapping to Personas

Based on `.claude/agents/personas-index.md`, the following personas should be involved in implementing these requirements:

### R5, R8, R9 - MCP & Claude Integration
- **Lead**: `mcp-expert.md` - MCP server design and safety controls
- **Support**: `senior-nodejs-developer.md` - Node.js implementation
- **Review**: `security-engineer.md` - Security validation

### R7, R9 - Multi-IDE Integration  
- **Lead**: `vscode-extension-developer.md` - VS Code integration
- **Support**: `api-developer.md` - API endpoint design
- **Review**: `qa-engineer.md` - Cross-platform testing

### R8 - File System Operations
- **Lead**: `senior-nodejs-developer.md` - File system abstraction
- **Support**: `technical-writer.md` - Documentation validation
- **Review**: `security-engineer.md` - File access controls

### R17-R21 - Quality & Documentation
- **Lead**: `technical-writer.md` - Documentation standards
- **Support**: `qa-engineer.md` - Testing frameworks
- **Review**: `expert-report-writer.md` - Requirement validation

---

## Instructions Alignment

Requirements align with `.claude/claude-instructions.md` standards:
- **R17**: Follows universal coding standards and testing requirements (80% coverage)
- **R18**: Maintains documentation standards including README and API docs
- **R8**: Supports persona-driven development per instruction guidelines
- **R9**: Enables .claude/commands integration as requested in ASK.md

[TODO: Validate command schema format against existing .claude/commands structure when directory is created]