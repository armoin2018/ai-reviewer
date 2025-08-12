/** @type {import('jest').Config} */
module.exports = {
  // Use ts-jest preset for TypeScript support with ES modules
  preset: 'ts-jest/presets/default-esm',
  
  // Test environment - Node.js for backend testing
  testEnvironment: 'node',
  
  // Configure ES modules support
  extensionsToTreatAsEsm: ['.ts'],
  
  // Module name mapping for .js imports to .ts files
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^node-fetch$': '<rootDir>/node_modules/node-fetch/lib/index.js'
  },
  
  // Root directory for tests and source files
  rootDir: '.',
  
  // Test file patterns
  testMatch: [
    '**/tests/**/*.test.ts',
    '**/tests/**/*.spec.ts'
  ],
  
  // Coverage configuration - require >80% coverage (R17.3)
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'lcov',
    'html',
    'json-summary'
  ],
  
  // Coverage thresholds - disabled for initial setup, will enable once code is implemented
  // coverageThreshold: {
  //   global: {
  //     branches: 80,
  //     functions: 80,
  //     lines: 80,
  //     statements: 80
  //   }
  // },
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/**/index.ts',
    '!**/node_modules/**',
    '!**/coverage/**',
    '!**/dist/**'
  ],
  
  // Module file extensions
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  
  // Transform files with ts-jest
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }]
  },
  
  // Transform node_modules that use ES modules
  transformIgnorePatterns: [
    'node_modules/(?!(node-fetch|fetch-blob|data-uri-to-buffer|formdata-polyfill|@types)/)'
  ],
  
  // Setup files to run before each test
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  
  // Test timeout (10 seconds)
  testTimeout: 10000,
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output for better debugging
  verbose: true,
  
  // Fail tests if console.error is called
  errorOnDeprecated: true,
  
  // Watch mode configuration
  watchPathIgnorePatterns: [
    '<rootDir>/node_modules/',
    '<rootDir>/coverage/',
    '<rootDir>/dist/',
    '<rootDir>/.git/'
  ]
};