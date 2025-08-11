# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

**Build and Development:**

```bash
npm i                    # Install dependencies
npm run build           # Compile TypeScript to dist/
npm run dev             # Start HTTP server on :8080 (development mode)
npm start               # Start HTTP server using compiled dist/server.js
```

**MCP Server:**

```bash
npm run mcp             # Start MCP server (JSON-RPC over stdio)
```

**VS Code Extension:**

```bash
npm run ext:install     # Install extension dependencies
npm run ext:build       # Build the VS Code extension
npm run ext:package     # Package the extension
```

**Pack Management:**

```bash
npm run pack:lint bundled/_template-pack    # Lint a guidance pack
```

**Container Operations:**

```bash
make build              # Build Docker image (armoin2018/copilot-skillset:v0.9.0)
make push               # Push to registry
make run                # Run container with .env file
docker compose up -d    # Build and run via docker-compose
```

## Architecture Overview

This is a **Copilot Skillset Reviewer** - a hybrid system providing multiple interfaces for AI code review and compliance checking:

### Core Components

1. **HTTP API Server** (`src/server.ts`)
   - Express-based REST API on port 8080
   - Main endpoints: `/load-rules`, `/assert-compliance`, `/normalize-diff`, `/summarize-rules`
   - Supports GitHub App integration for PR reviews

2. **MCP Server** (`src/mcp.ts`)
   - JSON-RPC interface over stdio for Claude MCP integration
   - Exposes same functionality as HTTP API via Skills interface

3. **VS Code Extension** (`vscode-extension/`)
   - Status bar pack switcher
   - Guidance preview and pack linting capabilities

### Key Modules

- **`src/rules.ts`**: Rule summarization and checklist generation
- **`src/diff.ts`**: Unified diff parsing and normalization
- **`src/assert.ts`**: Compliance checking against rules and diffs
- **`src/github.ts`**: GitHub API integration for loading rules and file contents
- **`src/bundled.ts`**: Management of bundled guidance packs
- **`src/lib.ts`**: Unified Skills interface for MCP

### Bundled Guidance Packs

The system includes pre-built guidance packs in `bundled/`:

- `baseline-secure`: Basic security and compliance
- `oss-apache-2`: Apache-2 license enforcement
- `enterprise-strict`: Enterprise coding standards
- `pci-dss`: Payment card industry compliance
- `pii-redaction`: Personal data protection
- `design-doc-reviewer`: Architectural review guidance

Each pack contains `personas/reviewer.md` and `policies/*.md` files that define review criteria.

### Data Flow

1. **Rule Loading**: Loads guidance from GitHub repos or bundled packs
2. **Diff Processing**: Normalizes git diffs and extracts changed files
3. **Compliance Checking**: Runs deterministic checks (secrets, tests, license headers, etc.)
4. **Review Generation**: Creates structured feedback with annotations for GitHub PRs

### GitHub Integration

- Supports GitHub App authentication via manifest-based setup
- Can load repo-specific rules from `.copilot/` directories
- Generates Check Runs with file annotations for PR reviews
- Infers quality gates (lint/test commands) from project files

## Environment Variables

- `PORT`: HTTP server port (default: 8080)
- `GH_APP_ID`: GitHub App ID for API access
- `GH_APP_PRIVATE_KEY`: GitHub App private key (PEM format)

## Project Conventions

- Uses ES modules throughout (`"type": "module"` in package.json)
- TypeScript compilation outputs to `dist/` directory
- All source files use `.js` imports for compiled compatibility
- Express server with CORS enabled and 10MB body limit
- Error responses include structured error objects with codes
