/**
 * Example Unit Test
 * Demonstrates testing patterns and verifies Jest configuration
 */

import { TEST_CONFIG } from '../setup';

describe('Jest Configuration Test', () => {
  it('should have correct test environment setup', () => {
    expect(process.env.NODE_ENV).toBe('test');
    expect(TEST_CONFIG.timeout).toBe(10000);
  });

  it('should support custom matchers', () => {
    const testValue = 15;
    expect(testValue).toBeWithinRange(10, 20);
  });

  it('should handle async operations', async () => {
    const asyncOperation = () =>
      new Promise((resolve) => setTimeout(() => resolve('success'), 100));

    const result = await asyncOperation();
    expect(result).toBe('success');
  });

  it('should mock console methods', () => {
    console.log('This should be mocked');
    console.info('This should be mocked');

    expect(console.log).toHaveBeenCalledWith('This should be mocked');
    expect(console.info).toHaveBeenCalledWith('This should be mocked');
  });
});

describe('TypeScript Integration Test', () => {
  interface TestInterface {
    id: number;
    name: string;
    active?: boolean;
  }

  it('should handle TypeScript interfaces correctly', () => {
    const testObject: TestInterface = {
      id: 1,
      name: 'test-object',
      active: true,
    };

    expect(testObject.id).toBe(1);
    expect(testObject.name).toBe('test-object');
    expect(testObject.active).toBe(true);
  });

  it('should support generic types', () => {
    function identity<T>(arg: T): T {
      return arg;
    }

    const stringResult = identity('hello');
    const numberResult = identity(42);

    expect(stringResult).toBe('hello');
    expect(numberResult).toBe(42);
  });
});
