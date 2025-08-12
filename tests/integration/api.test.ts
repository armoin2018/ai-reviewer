/**
 * Integration Tests for API endpoints and server functionality
 * Critical tests for production readiness
 */

import request from 'supertest';
import { MOCK_GITHUB_RESPONSES, TEST_CONFIG } from '../setup';

// Import the app for testing
let app: any;

beforeAll(async () => {
  // Dynamically import the server to avoid ES module issues
  const { default: server } = await import('../../src/server.js');
  app = server;
});

describe('API Integration Tests', () => {
  describe('Health Check Endpoint', () => {
    it('should respond with 200 OK for health check', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(response.body).toMatchObject({
        status: 'healthy',
        timestamp: expect.any(String)
      });
    });

    it('should return service status information', async () => {
      const response = await request(app)
        .get('/healthz')
        .expect(200);
      
      expect(response.body).toHaveProperty('uptime');
      expect(response.body).toHaveProperty('memory');
      expect(response.body).toHaveProperty('version');
      expect(typeof response.body.uptime).toBe('number');
    });
  });

  describe('Core API Endpoints', () => {
    it('should serve OpenAPI documentation', async () => {
      const response = await request(app)
        .get('/api-docs')
        .expect(200);
      
      expect(response.text).toContain('Copilot Skillset Reviewer API');
    });

    it('should handle CORS preflight requests', async () => {
      const response = await request(app)
        .options('/healthz')
        .set('Origin', 'http://localhost:3000')
        .set('Access-Control-Request-Method', 'GET')
        .expect(204);
      
      expect(response.headers['access-control-allow-origin']).toBeTruthy();
    });

    it('should return 404 for unknown endpoints', async () => {
      await request(app)
        .get('/nonexistent-endpoint')
        .expect(404);
    });
  });

  describe('Diff Processing Endpoint', () => {
    it('should normalize simple diff successfully', async () => {
      const testDiff = `--- a/test.js
+++ b/test.js
@@ -1,1 +1,2 @@
 line1
+line2`;

      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: testDiff })
        .expect(200);
      
      expect(response.body).toHaveProperty('files');
      expect(response.body.files).toHaveLength(1);
      expect(response.body.files[0]).toMatchObject({
        path: 'test.js',
        oldPath: 'test.js',
        created: false,
        deleted: false,
        renamed: false
      });
    });

    it('should handle malformed diff gracefully', async () => {
      const response = await request(app)
        .post('/normalize-diff')
        .send({ diff: 'invalid diff content' })
        .expect(200);
      
      expect(response.body).toHaveProperty('files');
      expect(response.body.files).toHaveLength(0);
    });
  });

  describe('Rule Management Endpoints', () => {
    it('should load bundled guidance packs', async () => {
      const response = await request(app)
        .get('/bundled-guidance')
        .expect(200);
      
      expect(response.body).toHaveProperty('packs');
      expect(Array.isArray(response.body.packs)).toBe(true);
      expect(response.body.packs.length).toBeGreaterThan(0);
    });

    it('should summarize rules from guidance text', async () => {
      const testGuidance = `
# Test Guidance

[ASSERT] All code must have tests
[REQUIRE] License headers in all files
[CHECK] No secrets in code

## Security Rules

- MUST validate all inputs
- SHOULD use HTTPS
- MAY implement rate limiting
      `;

      const response = await request(app)
        .post('/summarize-rules')
        .send({ guidanceText: testGuidance })
        .expect(200);
      
      expect(response.body).toHaveProperty('rules');
      expect(response.body).toHaveProperty('statistics');
      expect(Array.isArray(response.body.rules)).toBe(true);
      expect(response.body.rules.length).toBeGreaterThan(0);
    });
  });
});

describe('GitHub API Integration', () => {
  describe('Pull Request Processing', () => {
    it.todo('should fetch pull request data');
    it.todo('should analyze changed files');
    it.todo('should post review comments');
    it.todo('should update PR status checks');
  });

  describe('Repository Access', () => {
    it.todo('should list repository files');
    it.todo('should read file contents');
    it.todo('should handle private repositories');
  });
});

// Mock HTTP server for testing external API calls
describe('Mock Server Tests', () => {
  it('should handle mock GitHub API responses', () => {
    const mockPR = MOCK_GITHUB_RESPONSES.pullRequest;
    expect(mockPR.number).toBe(42);
    expect(mockPR.title).toBe('Test PR');
    expect(mockPR.state).toBe('open');
  });

  it('should handle mock installation data', () => {
    const mockInstallation = MOCK_GITHUB_RESPONSES.installation;
    expect(mockInstallation.id).toBe(12345);
    expect(mockInstallation.account.login).toBe('test-org');
  });
});
