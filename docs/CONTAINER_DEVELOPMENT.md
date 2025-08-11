# Container Development Guide

This guide covers containerized development workflows for the Copilot Skillset Reviewer project.

## Overview

The project supports multiple container configurations:
- **Development**: Hot reload, debugging support, development dependencies
- **Production**: Optimized build, minimal runtime, security hardening
- **MCP**: Specialized container for Claude integration

## Quick Start

### Development Environment

```bash
# Start development container with hot reload
make dev

# Or using docker-compose directly
docker compose up skillset-dev
```

### Production Testing

```bash
# Build and run production container
make build
make run

# Or using docker-compose
docker compose up skillset
```

## Container Targets

### Development Target
- **Image**: `armoin2018/copilot-skillset:dev`
- **Features**: Hot reload, debugging, development dependencies
- **Port**: 8080 (HTTP), 9229 (Debug)
- **Use Case**: Local development and testing

### Production Target  
- **Image**: `armoin2018/copilot-skillset:v0.9.0`
- **Features**: Optimized build, minimal size, security hardening
- **Port**: 8080 (HTTP)
- **Use Case**: Production deployment

## Development Workflow

### 1. Environment Setup

Create environment file from template:
```bash
cp .env.example .env
# Edit .env with your configuration
```

### 2. Development Container

Start development environment:
```bash
make dev
```

Features:
- **Hot Reload**: Code changes automatically restart the server
- **Debugging**: Debug port exposed on 9229
- **Volume Mounts**: Source code mounted for live editing
- **Development Dependencies**: All dev tools available

### 3. Testing in Container

Run tests:
```bash
make test
make test-coverage
```

### 4. Production Testing

Test production build locally:
```bash
make build-prod
make run
```

## Docker Compose Services

### Development Services

#### `skillset-dev`
- Development container with hot reload
- Source code mounted for live editing  
- Debug port exposed
- Development environment variables

### Production Services

#### `skillset`
- Production-optimized container
- Compiled JavaScript only
- Security hardening
- Health checks enabled

#### `skillset-mcp`  
- MCP server for Claude integration
- JSON-RPC over stdio
- .claude directory mounted

## Container Features

### Multi-Stage Build
```dockerfile
FROM node:20-alpine AS base       # Common dependencies
FROM base AS development          # Development target
FROM base AS build               # Build stage  
FROM node:20-alpine AS production # Production target
```

### Security Features
- Non-root user (nodejs:nodejs)
- Minimal attack surface
- Production dependency pruning
- Security headers

### Performance Optimizations
- Multi-stage builds for minimal size
- Production dependency pruning
- Health checks for monitoring
- Resource limits ready

## Development Commands

### Build Commands
```bash
make build-dev      # Build development image
make build-prod     # Build production image
make build-all      # Build all images
```

### Run Commands  
```bash
make dev           # Start development environment
make run           # Run production container
make run-dev       # Run development container
```

### Docker Compose Commands
```bash
make up            # Start all services (production)
make up-dev        # Start development services
make down          # Stop all services
make logs          # View service logs
make logs-dev      # View development logs
```

### Utility Commands
```bash
make shell         # Shell into development container
make shell-prod    # Shell into production container
make health        # Check service health
make clean         # Clean containers and images
```

## Debugging

### VS Code Debugging

1. Start development container:
   ```bash
   make dev
   ```

2. Use VS Code "Debug Server" configuration
   - Attaches to port 9229
   - Sets breakpoints in TypeScript code
   - Full debugging experience

### Manual Debugging

Connect debugger to port 9229:
```bash
node --inspect=0.0.0.0:9229 dist/server.js
```

## Environment Variables

### Required Variables
```bash
GH_APP_ID=123456                    # GitHub App ID
GH_APP_PRIVATE_KEY="-----BEGIN..."  # GitHub App private key
```

### Optional Variables  
```bash
PORT=8080                           # Server port
NODE_ENV=development                # Environment mode
LOG_LEVEL=debug                     # Logging level
CORS_ORIGIN=*                       # CORS origins
```

## Volume Mounts

### Development Mounts
```yaml
volumes:
  - ./src:/app/src:ro              # Source code (read-only)
  - ./tests:/app/tests:ro          # Test files
  - ./bundled:/app/bundled:ro      # Bundled packs
  - /app/node_modules              # Preserve container modules
```

### Production Mounts
```yaml
volumes:
  - ./.claude:/app/.claude:rw      # Claude directory (MCP only)
```

## Health Checks

All containers include health checks:
```bash
# HTTP health check
curl -f http://localhost:8080/healthz

# Docker health check  
docker ps  # Shows health status
```

## Build Optimization

### Production Build Size
- Base image: `node:20-alpine` (~40MB)
- Production dependencies only
- Compiled JavaScript only  
- Target size: <200MB

### Build Performance
- Multi-stage builds reduce final size
- Docker layer caching optimizes rebuilds
- Development hot reload minimizes restart time

## Deployment

### Local Development
```bash
make dev              # Start development
make logs-dev         # Monitor logs
make restart-dev      # Restart service
```

### Production Deployment
```bash
make build           # Build production image
make push            # Push to registry
make up              # Deploy services
```

## Troubleshooting

### Common Issues

**Port conflicts**: Change ports in docker-compose.yml
**Volume mount issues**: Check file permissions
**Build failures**: Check Dockerfile syntax
**Health check failures**: Verify service startup

### Debug Commands
```bash
make logs-dev        # View development logs
make shell          # Access container shell
docker compose ps   # Check service status
docker images       # List built images
```

## Best Practices

1. **Use development target for coding**
2. **Test with production target before deployment** 
3. **Keep .env file secure and backed up**
4. **Monitor container health and logs**
5. **Use multi-stage builds for optimal size**
6. **Implement proper security practices**

## Integration with IDE

The container setup integrates with:
- **VS Code**: Debug configuration included
- **Docker extension**: Container management
- **Remote development**: Work inside containers
- **Hot reload**: Live code updates

This container setup provides a complete development-to-production pipeline with optimal developer experience and production readiness.