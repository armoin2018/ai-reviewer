
# Container build and deployment automation

VERSION ?= v0.9.0
IMAGE_PROD ?= armoin2018/copilot-skillset:$(VERSION)
IMAGE_DEV ?= armoin2018/copilot-skillset:dev
REGISTRY ?= armoin2018

# Default target
.DEFAULT_GOAL := help

.PHONY: help build build-dev build-prod push run dev test clean tag-latest push-all

help: ## Show this help message
	@echo 'Usage: make [target]'
	@echo ''
	@echo 'Targets:'
	@awk 'BEGIN {FS = ":.*?## "} /^[a-zA-Z_-]+:.*?## / {printf "  %-15s %s\n", $$1, $$2}' $(MAKEFILE_LIST)

# Development targets
dev: ## Start development environment with hot reload
	docker compose -f docker-compose.yml up skillset-dev

dev-build: ## Build development image
	docker build --target development -t $(IMAGE_DEV) .

dev-down: ## Stop development environment
	docker compose down

# Production targets
build: build-prod ## Build production image (alias for build-prod)

build-prod: ## Build production image
	docker build --target production -t $(IMAGE_PROD) .

build-all: build-dev build-prod ## Build both development and production images

# Container operations
run: ## Run production container locally
	docker run --rm -p 8080:8080 --env-file .env -e PORT=8080 $(IMAGE_PROD)

run-dev: ## Run development container locally with debugging
	docker run --rm -p 8080:8080 -p 9229:9229 --env-file .env -e NODE_ENV=development $(IMAGE_DEV)

# Docker Compose operations
up: ## Start all services (production)
	docker compose up -d

up-dev: ## Start development services
	docker compose -f docker-compose.yml up -d skillset-dev

down: ## Stop all services
	docker compose down

logs: ## View logs from all services
	docker compose logs -f

logs-dev: ## View development service logs
	docker compose logs -f skillset-dev

# Registry operations
push: build-prod ## Build and push production image
	docker push $(IMAGE_PROD)

push-dev: build-dev ## Build and push development image
	docker push $(IMAGE_DEV)

tag-latest: ## Tag production image as latest
	docker tag $(IMAGE_PROD) $(REGISTRY)/copilot-skillset:latest

push-all: push tag-latest ## Push production image and tag as latest
	docker push $(REGISTRY)/copilot-skillset:latest

# Testing
test: ## Run tests in container
	docker compose run --rm skillset npm test

test-coverage: ## Run tests with coverage in container
	docker compose run --rm skillset npm run test:coverage

# Maintenance
clean: ## Remove all containers and images
	docker compose down --remove-orphans
	docker image prune -f
	docker system prune -f

clean-all: ## Remove all containers, images, and volumes
	docker compose down --volumes --remove-orphans
	docker image prune -a -f
	docker system prune -a -f --volumes

# Health check
health: ## Check service health
	curl -f http://localhost:8080/healthz || exit 1

# Multi-architecture builds (for production deployment)
build-multi: ## Build multi-architecture image for production
	docker buildx build --platform linux/amd64,linux/arm64 --target production -t $(IMAGE_PROD) --push .

# Development utilities
shell: ## Open shell in running development container
	docker compose exec skillset-dev sh

shell-prod: ## Open shell in running production container  
	docker compose exec skillset sh

restart: ## Restart all services
	docker compose restart

restart-dev: ## Restart development service
	docker compose restart skillset-dev
