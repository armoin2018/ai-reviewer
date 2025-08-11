# Copilot Skillset Reviewer

> AI-powered code review and compliance system with multi-IDE integration

[![Version](https://img.shields.io/badge/version-0.9.0-blue.svg)](https://github.com/armoin-llc/copilot-skillset-reviewer)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D20.0.0-brightgreen.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5%2B-blue.svg)](https://www.typescriptlang.org/)

## Overview

The Copilot Skillset Reviewer is a comprehensive AI-powered code review and compliance checking system that provides:

- **Multi-Interface Architecture**: HTTP API server, MCP server integration, and VS Code extension
- **Intelligent Code Analysis**: GitHub repository integration with automated rule loading
- **Compliance Checking**: Automated detection of secrets, license headers, test presence, and security vulnerabilities
- **Multi-IDE Support**: Works with GitHub Copilot, Cursor, WindSurf, Claude Code, and VS Code
- **Bundled Guidance Packs**: Pre-configured rule sets for various compliance frameworks

### Key Features

- **GitHub App Integration**: Repository-aware skillset API with webhook support
- **MCP Server**: JSON-RPC over stdio for Claude integration
- **VS Code Extension**: Status bar pack switcher, guidance preview, and pack linting
- **Deterministic Compliance Checks**: Secrets detection, test presence validation, license header verification
- **Bundled Rule Packs**: `baseline-secure`, `oss-apache-2`, `enterprise-strict`, `pci-dss`, `pii-redaction`, `design-doc-reviewer`
- **GitHub Actions Integration**: Automated PR comments and Check Runs with file annotations

## Quick Start

### Prerequisites

- **Node.js**: Version 20.0.0 or higher
- **npm**: Version 9.0.0 or higher
- **TypeScript**: Version 5.5.0 or higher
- **Docker**: (Optional) For containerized deployment

### Installation

```bash
# Clone the repository
git clone https://github.com/armoin-llc/copilot-skillset-reviewer.git
cd copilot-skillset-reviewer

# Install dependencies
npm install

# Build the project
npm run build
```

### Development Setup

```bash
# Start HTTP API server in development mode
npm run dev   # Starts server on http://localhost:8080

# Start MCP server for Claude integration
npm run mcp   # JSON-RPC over stdio

# Build and run VS Code extension
npm run ext:install  # Install extension dependencies
npm run ext:build    # Build the extension
npm run ext:package  # Package for installation
```

### Testing

```bash
# Run all tests
npm test

# Run tests with coverage report
npm run test:coverage

# Run tests in watch mode
npm run test:watch

# Run specific test suites
npm run test:unit        # Unit tests only
npm run test:integration # Integration tests only
```

## API Documentation

### HTTP API Endpoints

The server exposes a REST API on port 8080 (configurable via `PORT` environment variable):

#### Core Endpoints

- **`GET /healthz`** - Health check endpoint (responds within 100ms)
- **`POST /load-rules`** - Load coding rules from GitHub repositories or bundled packs
- **`POST /summarize-rules`** - Generate actionable checklists from rule documents
- **`POST /normalize-diff`** - Parse and normalize unified diff formats
- **`POST /assert-compliance`** - Run comprehensive compliance checks on code changes

#### Interactive Documentation

When the server is running, visit **http://localhost:8080/docs** for interactive API documentation powered by Swagger UI.

### MCP Server Integration

For Claude Code and other MCP-compatible clients:

```bash
npm run mcp  # Starts MCP server on stdio
```

### VS Code Extension

The extension provides:

- **Status Bar Pack Switcher**: Switch between guidance packs
- **Guidance Preview**: Preview rule content and checklists
- **Pack Linting**: Validate guidance pack structure

## Configuration

### Environment Variables

```bash
# Server Configuration
PORT=8080                    # HTTP server port (default: 8080)
NODE_ENV=production         # Environment mode

# GitHub Integration
GH_APP_ID=123456            # GitHub App ID
GH_APP_PRIVATE_KEY=...      # GitHub App private key (PEM format)

# Optional Configuration
LOG_LEVEL=info              # Logging level (debug, info, warn, error)
CORS_ORIGIN=*               # CORS allowed origins
```

### GitHub App Setup

1. **Create GitHub App**:
   - Go to GitHub → Settings → Developer settings → GitHub Apps → **New GitHub App**
   - Select **Create GitHub App from manifest**

2. **Use App Manifest**:

   ```bash
   # Upload .github/app/app-manifest.json or paste its contents
   ```

3. **Complete Setup**:

   ```bash
   # You'll receive a one-time code, then run:
   node scripts/create-github-app-from-manifest.mjs <one-time-code>
   ```

4. **Configure Environment**:
   - Save the private key file
   - Set `GH_APP_ID` and `GH_APP_PRIVATE_KEY` in your `.env` file

## Docker Deployment

### Quick Start with Docker

```bash
# Build and run with docker-compose
docker compose up -d

# Or build manually
make build  # Builds armoin2018/copilot-skillset:v0.9.0
make push   # Push to registry (requires login)

# Run the container
docker run -p 8080:8080 -e PORT=8080 armoin2018/copilot-skillset:v0.9.0
```

### Container Configuration

The Docker image supports:

- **Base Image**: `node:20-alpine` for minimal attack surface
- **Multi-stage Build**: Optimized production image <200MB
- **Health Checks**: Built-in container health monitoring
- **Security**: Non-root user execution

### Production Deployment

```bash
# Production build with version tagging
make build            # Builds armoin2018/copilot-skillset:v0.9.0
make tag-latest       # Tag as :latest
make push-all         # Push both versioned and latest tags
```

## Development Guide

### Project Structure

```
├── src/                     # TypeScript source code
│   ├── server.ts           # HTTP API server
│   ├── mcp.ts              # MCP server implementation
│   ├── lib.ts              # Skills interface library
│   ├── rules.ts            # Rule processing engine
│   ├── diff.ts             # Diff parsing utilities
│   ├── assert.ts           # Compliance checking
│   ├── github.ts           # GitHub API integration
│   └── bundled.ts          # Bundled pack management
├── tests/                   # Test suites
│   ├── unit/               # Unit tests
│   ├── integration/        # Integration tests
│   └── setup.ts            # Test configuration
├── bundled/                # Pre-packaged guidance packs
├── vscode-extension/       # VS Code extension source
├── .claude/                # Claude Code integration
│   ├── agents/
│   │   ├── instructions/   # Language-specific instructions
│   │   └── personas/       # Role-based personas
│   └── claude-instructions.md
└── docs/                   # Additional documentation
```

### Adding New Features

1. **Create Tests First**: Add test cases in `tests/unit/` or `tests/integration/`
2. **Implement Feature**: Add implementation in appropriate `src/` module
3. **Update Documentation**: Update README.md and add inline code documentation
4. **Verify Coverage**: Ensure >80% test coverage requirement is met
5. **Update API Docs**: Add OpenAPI specifications for new endpoints

### Code Style

- **TypeScript Strict Mode**: All code must pass strict type checking
- **ESLint Compliance**: Code must pass linting checks
- **Prettier Formatting**: Consistent code formatting enforced
- **Test Coverage**: Minimum 80% coverage required
- **Documentation**: JSDoc comments for all public APIs

## Troubleshooting

### Common Issues

**Server won't start**:

- Check that port 8080 is available
- Verify Node.js version is 20.0.0 or higher
- Ensure all dependencies are installed (`npm install`)

**GitHub Integration fails**:

- Verify `GH_APP_ID` and `GH_APP_PRIVATE_KEY` are correctly set
- Check that the GitHub App has required permissions
- Ensure webhook URLs are accessible if using webhooks

**MCP Server connection issues**:

- Verify Claude Code MCP configuration
- Check that `npm run mcp` starts without errors
- Validate JSON-RPC message format

**Tests failing**:

- Run `npm run build` to ensure TypeScript compilation succeeds
- Check test environment setup in `tests/setup.ts`
- Verify all test dependencies are installed

### Getting Help

- **Issues**: Report bugs at [GitHub Issues](https://github.com/armoin-llc/copilot-skillset-reviewer/issues)
- **Documentation**: See `CLAUDE.md` for architectural details
- **API Reference**: Visit `/docs` endpoint when server is running
- **Development**: Check `.claude/agents/` for role-specific guidance

## Contributing

1. **Fork the Repository**: Create your own fork on GitHub
2. **Create Feature Branch**: `git checkout -b feature/your-feature-name`
3. **Add Tests**: Ensure comprehensive test coverage
4. **Run Quality Checks**: `npm test && npm run build`
5. **Submit Pull Request**: Include clear description of changes

### Development Standards

- Follow existing code patterns and architecture
- Maintain backward compatibility for API changes
- Update documentation for all changes
- Ensure all tests pass and coverage remains >80%
- Use semantic versioning for releases

## License

This project is licensed under the MIT License. See [LICENSE](LICENSE) file for details.

---

_For detailed technical documentation, see [CLAUDE.md](CLAUDE.md)_
