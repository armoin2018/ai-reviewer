/**
 * Jest Test Setup
 * Global test configuration and setup hooks
 */

// Global test timeout - matches jest.config.js setting
jest.setTimeout(10000);

// Mock console methods to avoid noise in test output unless testing logging
const originalConsole = { ...console };

beforeAll(() => {
  // Mock console methods to reduce test noise
  global.console = {
    ...console,
    log: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: originalConsole.error // Keep error for debugging
  };
});

afterAll(() => {
  // Restore original console
  global.console = originalConsole;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
    }
  }
}

// Custom matchers
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
});

// Environment variable setup for tests
process.env.NODE_ENV = 'test';
process.env.PORT = '0'; // Use random port for test server

// Global test constants
export const TEST_CONFIG = {
  timeout: 10000,
  server: {
    host: 'localhost',
    port: 0 // Random port assignment
  },
  auth: {
    testToken: 'test-jwt-token',
    testUserId: 'test-user-123'
  }
};

// Mock GitHub API responses for tests
export const MOCK_GITHUB_RESPONSES = {
  pullRequest: {
    id: 123456,
    number: 42,
    title: "Test PR",
    body: "Test description",
    state: "open",
    user: {
      login: "test-user"
    },
    head: {
      sha: "abc123"
    },
    base: {
      ref: "main"
    }
  },
  installation: {
    id: 12345,
    account: {
      login: "test-org"
    }
  }
};

// Test database cleanup utilities
export async function cleanupTestData() {
  // Implementation will be added when database is introduced
  // For now, this is a placeholder
}

beforeEach(async () => {
  // Reset all mocks before each test
  jest.clearAllMocks();
});

afterEach(async () => {
  // Cleanup after each test
  await cleanupTestData();
});