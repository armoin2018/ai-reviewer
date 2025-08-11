# WHITELIST.md

This file contains approved libraries and modules for the Copilot Skillset Reviewer project. All dependencies must be listed here with proper justification before being added to the project.

## Approval Criteria

Dependencies must meet the following criteria:

- **License**: MIT, Apache-2.0, ISC, or BSD licenses preferred
- **Security**: No known critical vulnerabilities
- **Maintenance**: Active maintenance with recent updates
- **Community**: Established community trust and adoption
- **Purpose**: Clear justification for project needs

---

## Production Dependencies

### Core Server Framework

- **express@4.19.2**
  - **License**: MIT
  - **Purpose**: HTTP server framework for REST API endpoints
  - **Justification**: Industry standard, lightweight, extensive middleware ecosystem
  - **Security**: Clean vulnerability scan, actively maintained
  - **Added**: 2025-08-11

### HTTP Client & Authentication

- **node-fetch@3.3.2**
  - **License**: MIT
  - **Purpose**: HTTP client for GitHub API integration
  - **Justification**: Native fetch API compatibility, Promise-based
  - **Security**: Clean vulnerability scan, widely trusted
  - **Added**: 2025-08-11

- **jsonwebtoken@9.0.2**
  - **License**: MIT
  - **Purpose**: JWT token handling for GitHub App authentication
  - **Justification**: Standard JWT library with extensive validation options
  - **Security**: Actively maintained, security-focused development
  - **Added**: 2025-08-11

### Middleware & Utilities

- **body-parser@1.20.2**
  - **License**: MIT
  - **Purpose**: Express middleware for JSON payload parsing
  - **Justification**: Official Express middleware, 10MB limit support
  - **Security**: Well-maintained, part of Express ecosystem
  - **Added**: 2025-08-11

- **cors@2.8.5**
  - **License**: MIT
  - **Purpose**: Cross-Origin Resource Sharing middleware
  - **Justification**: Standard CORS handling for multi-IDE integration
  - **Security**: Simple, focused functionality, minimal attack surface
  - **Added**: 2025-08-11

---

## Development Dependencies

### TypeScript Toolchain

- **typescript@5.5.4**
  - **License**: Apache-2.0
  - **Purpose**: TypeScript compiler for strict mode enforcement (R17.1)
  - **Justification**: Core requirement for type safety and ES module support
  - **Security**: Microsoft-maintained, extensive security review
  - **Added**: 2025-08-11

- **tsx@4.16.2**
  - **License**: MIT
  - **Purpose**: TypeScript execution for development and MCP server
  - **Justification**: Fast TypeScript execution without compilation step
  - **Security**: Actively maintained, minimal dependencies
  - **Added**: 2025-08-11

### Type Definitions

- **@types/express@4.17.21**
  - **License**: MIT
  - **Purpose**: TypeScript definitions for Express.js
  - **Justification**: Required for TypeScript strict mode compliance
  - **Security**: Microsoft DefinitelyTyped maintained
  - **Added**: 2025-08-11

- **@types/node@20.11.30**
  - **License**: MIT
  - **Purpose**: Node.js TypeScript definitions
  - **Justification**: Core Node.js type support for development
  - **Security**: Microsoft DefinitelyTyped maintained
  - **Added**: 2025-08-11

- **@types/jsonwebtoken@9.0.6**
  - **License**: MIT
  - **Purpose**: TypeScript definitions for jsonwebtoken
  - **Justification**: Required for JWT handling with TypeScript strict mode
  - **Security**: DefinitelyTyped maintained
  - **Added**: 2025-08-11

- **@types/cors@2.8.17**
  - **License**: MIT
  - **Purpose**: TypeScript definitions for cors middleware
  - **Justification**: Required for CORS handling with TypeScript strict mode
  - **Security**: DefinitelyTyped maintained
  - **Added**: 2025-08-11

### Testing Framework (Pending Implementation)

- **jest@29.7.0**
  - **License**: MIT
  - **Purpose**: Testing framework for 80% coverage requirement (R17.3)
  - **Justification**: Industry standard, TypeScript support, coverage reporting
  - **Security**: Meta/Facebook maintained, extensive community usage
  - **Status**: Approved for Story 1.3 implementation

- **@types/jest@29.5.5**
  - **License**: MIT
  - **Purpose**: TypeScript definitions for Jest
  - **Justification**: Required for TypeScript test development
  - **Security**: DefinitelyTyped maintained
  - **Status**: Approved for Story 1.3 implementation

- **ts-jest@29.1.2**
  - **License**: MIT
  - **Purpose**: TypeScript preprocessor for Jest
  - **Justification**: Required for Jest to work with TypeScript files
  - **Security**: Actively maintained, official Jest TypeScript integration
  - **Added**: 2025-08-11

### Code Quality Tools (Planned)

- **eslint@8.57.0**
  - **License**: MIT
  - **Purpose**: Code linting for style consistency (R17.2)
  - **Justification**: Standard linting tool with TypeScript support
  - **Status**: Planned for Story 2.1

- **prettier@3.3.3**
  - **License**: MIT
  - **Purpose**: Code formatting for consistency
  - **Justification**: Automated formatting, team consistency
  - **Status**: Planned for Story 2.1

---

## Container & Build Dependencies

### Docker Base Images

- **node:20-alpine**
  - **License**: MIT (Node.js), Various (Alpine)
  - **Purpose**: Production container base image
  - **Justification**: Minimal attack surface, official Node.js image
  - **Security**: Regularly updated, security patches
  - **Added**: 2025-08-11

### Build Tools

- **make**
  - **License**: GPL-3.0 (build tool only)
  - **Purpose**: Build automation and container management
  - **Justification**: Standard build tool, already in use
  - **Security**: System-level tool, not distributed
  - **Added**: 2025-08-11

---

## Approved Libraries by Category

### HTTP & Networking

- express (server framework)
- node-fetch (HTTP client)
- cors (CORS middleware)
- body-parser (request parsing)

### Security & Authentication

- jsonwebtoken (JWT handling)
- helmet (security headers) - planned
- bcrypt (password hashing) - if needed

### Development & Build

- typescript (compiler)
- tsx (execution)
- jest (testing)
- eslint (linting)
- prettier (formatting)

### TypeScript Support

- @types/express
- @types/node
- @types/jest

---

## Review Process

1. **Request**: Add dependency request to REVIEW.md
2. **Analysis**: Security scan, license check, alternatives evaluation
3. **Approval**: Add to WHITELIST.md with full justification
4. **Installation**: Add to package.json after approval
5. **Monitoring**: Regular security updates and maintenance

## Update Policy

- **Security Updates**: Applied immediately upon availability
- **Minor Updates**: Reviewed monthly, applied if no breaking changes
- **Major Updates**: Requires full review cycle and testing
- **EOL Dependencies**: Must be replaced before end-of-life

---

_Last Updated: 2025-08-11_  
_Review Frequency: Monthly_  
_Next Review Due: 2025-09-11_
