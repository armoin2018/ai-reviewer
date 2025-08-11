---
applyTo: "**/*.ts,**/*.tsx"
---

# TypeScript Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for TypeScript development. These include AI linting hints to automatically enforce type safety and maintain clean, performant, and type-safe TypeScript code.

⸻

📂 Project Architecture

✅ Rule: Enforce strict type safety

- Use strict TypeScript configuration
- Avoid `any` type except in legacy code migration
- Implement proper interface and type definitions
- Use type guards for runtime type checking

✅ Rule: Modern TypeScript practices

- Use ES6+ features with TypeScript annotations
- Implement proper module structure with exports/imports
- Use async/await with proper Promise typing
- Leverage TypeScript utility types

✅ Rule: Code organization

- Separate types/interfaces into dedicated files
- Use barrel exports for clean imports
- Implement proper namespace organization
- Use path mapping for cleaner imports

✅ Rule: Error handling

- Use custom error types with proper inheritance
- Implement proper Promise error handling
- Use Result/Either patterns for error-prone operations
- Type error responses appropriately

⸻

📜 TypeScript Configuration

✅ Rule: Strict configuration

- Enable strict mode in `tsconfig.json`
- Use appropriate target and module settings
- Configure path mapping for imports
- Enable source maps for debugging

✅ Example tsconfig.json:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "strict": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "exactOptionalPropertyTypes": true,
    "sourceMap": true,
    "declaration": true,
    "baseUrl": "./src",
    "paths": {
      "@types/*": ["types/*"],
      "@utils/*": ["utils/*"],
      "@services/*": ["services/*"]
    }
  }
}
```

⸻

🖋 TypeScript Coding Standards

✅ Type Definitions

- Define explicit interfaces for objects
- Use union types for restricted values
- Implement generic types for reusability
- Use utility types for type transformations

✅ Example:

```typescript
// Interface definitions
interface User {
  readonly id: number;
  username: string;
  email: string;
  status: 'active' | 'inactive' | 'suspended';
  createdAt: Date;
  profile?: UserProfile;
}

interface UserProfile {
  firstName: string;
  lastName: string;
  bio?: string;
  avatarUrl?: string;
}

// Generic interface for API responses
interface ApiResponse<T> {
  success: boolean;
  data: T;
  message: string;
  errors?: string[];
}

// Utility types
type UserUpdate = Partial<Pick<User, 'username' | 'email'>>;
type UserSummary = Pick<User, 'id' | 'username' | 'status'>;
```

⸻

✅ Function Typing

- Define explicit parameter and return types
- Use function overloads for multiple signatures
- Implement proper async function typing
- Use type guards for runtime validation

✅ Example:

```typescript
// Explicit function typing
const processUser = async (
  userId: number,
  options: { includeProfile?: boolean } = {}
): Promise<ApiResponse<User>> => {
  try {
    const user = await fetchUser(userId);
    
    if (!isValidUser(user)) {
      return {
        success: false,
        data: {} as User,
        message: 'Invalid user data',
        errors: ['User validation failed']
      };
    }
    
    if (options.includeProfile) {
      user.profile = await fetchUserProfile(userId);
    }
    
    return {
      success: true,
      data: user,
      message: 'User processed successfully'
    };
  } catch (error) {
    return {
      success: false,
      data: {} as User,
      message: 'Failed to process user',
      errors: [error instanceof Error ? error.message : 'Unknown error']
    };
  }
};

// Type guard function
const isValidUser = (user: unknown): user is User => {
  return (
    typeof user === 'object' &&
    user !== null &&
    'id' in user &&
    'username' in user &&
    'email' in user &&
    typeof (user as User).id === 'number' &&
    typeof (user as User).username === 'string' &&
    typeof (user as User).email === 'string'
  );
};
```

⸻

✅ Class Implementation

- Use access modifiers appropriately
- Implement interfaces for class contracts
- Use readonly for immutable properties
- Type constructor parameters properly

✅ Example:

```typescript
// Abstract base class
abstract class BaseProcessor<TInput, TOutput> {
  protected readonly config: ProcessorConfig;
  
  constructor(config: ProcessorConfig) {
    this.config = { ...config };
  }
  
  abstract process(input: TInput): Promise<TOutput>;
  
  protected log(message: string, level: 'info' | 'warn' | 'error' = 'info'): void {
    console.log(`[${level.toUpperCase()}] ${this.constructor.name}: ${message}`);
  }
}

// Concrete implementation
class UserProcessor extends BaseProcessor<UserInput, ProcessedUser> {
  private readonly userService: UserService;
  
  constructor(config: ProcessorConfig, userService: UserService) {
    super(config);
    this.userService = userService;
  }
  
  async process(input: UserInput): Promise<ProcessedUser> {
    this.log('Processing user input');
    
    const validated = await this.validateInput(input);
    const processed = await this.transformUser(validated);
    
    this.log('User processing completed');
    return processed;
  }
  
  private async validateInput(input: UserInput): Promise<ValidatedUserInput> {
    // Validation logic
    if (!input.email || !this.isValidEmail(input.email)) {
      throw new ValidationError('Invalid email address');
    }
    
    return input as ValidatedUserInput;
  }
  
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }
  
  private async transformUser(input: ValidatedUserInput): Promise<ProcessedUser> {
    // Transformation logic
    return {
      id: await this.userService.generateId(),
      ...input,
      processedAt: new Date()
    };
  }
}

// Supporting types
interface ProcessorConfig {
  timeout: number;
  retries: number;
}

interface UserInput {
  username: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface ValidatedUserInput extends UserInput {
  readonly isValid: true;
}

interface ProcessedUser extends UserInput {
  readonly id: string;
  readonly processedAt: Date;
}

class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}
```

⸻

✅ Async/Promise Handling

- Type Promise returns explicitly
- Use proper error handling with typed catches
- Implement timeout handling
- Use async/await over Promise chains

✅ Example:

```typescript
// Service with proper async typing
class ApiService {
  private readonly baseUrl: string;
  private readonly timeout: number;
  
  constructor(baseUrl: string, timeout = 5000) {
    this.baseUrl = baseUrl;
    this.timeout = timeout;
  }
  
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.timeout);
      
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }
      
      const data: T = await response.json();
      
      return {
        success: true,
        data,
        message: 'Request successful'
      };
    } catch (error) {
      if (error instanceof ApiError) {
        return {
          success: false,
          data: {} as T,
          message: error.message,
          errors: [`API Error: ${error.status}`]
        };
      }
      
      return {
        success: false,
        data: {} as T,
        message: 'Request failed',
        errors: [error instanceof Error ? error.message : 'Unknown error']
      };
    }
  }
  
  async post<TInput, TOutput>(
    endpoint: string, 
    data: TInput
  ): Promise<ApiResponse<TOutput>> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      });
      
      if (!response.ok) {
        throw new ApiError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }
      
      const result: TOutput = await response.json();
      
      return {
        success: true,
        data: result,
        message: 'Post successful'
      };
    } catch (error) {
      throw error instanceof ApiError ? error : new Error('Post request failed');
    }
  }
}

class ApiError extends Error {
  constructor(message: string, public readonly status: number) {
    super(message);
    this.name = 'ApiError';
  }
}
```

⸻

✅ Advanced Type Patterns

- Use conditional types for complex logic
- Implement mapped types for transformations
- Use template literal types for string patterns
- Leverage discriminated unions

✅ Example:

```typescript
// Conditional types
type ApiEndpoint<T extends string> = T extends `users/${string}` 
  ? UserEndpoint 
  : T extends `orders/${string}` 
  ? OrderEndpoint 
  : GenericEndpoint;

// Mapped types
type Optional<T> = {
  [K in keyof T]?: T[K];
};

type Required<T, K extends keyof T> = T & {
  [P in K]-?: T[P];
};

// Template literal types
type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
type ApiRoute = `/${string}`;
type ApiCall = `${HttpMethod} ${ApiRoute}`;

// Discriminated unions
type LoadingState = {
  status: 'loading';
  progress?: number;
};

type SuccessState<T> = {
  status: 'success';
  data: T;
};

type ErrorState = {
  status: 'error';
  error: string;
};

type AsyncState<T> = LoadingState | SuccessState<T> | ErrorState;

// Usage with type guards
const handleAsyncState = <T>(state: AsyncState<T>): string => {
  switch (state.status) {
    case 'loading':
      return `Loading... ${state.progress ?? 0}%`;
    case 'success':
      return `Success: ${JSON.stringify(state.data)}`;
    case 'error':
      return `Error: ${state.error}`;
    default:
      // TypeScript ensures exhaustive checking
      const _exhaustiveCheck: never = state;
      return _exhaustiveCheck;
  }
};
```

⸻

🧪 TypeScript Testing

✅ Type Testing

- Use tools like `tsd` for type testing
- Test generic type behavior
- Verify type inference works correctly
- Test edge cases in type definitions

✅ Example:

```typescript
// Type tests using jest and custom type assertions
describe('Type Safety Tests', () => {
  test('should enforce correct User type', () => {
    const user: User = {
      id: 1,
      username: 'testuser',
      email: 'test@example.com',
      status: 'active',
      createdAt: new Date()
    };
    
    expect(typeof user.id).toBe('number');
    expect(typeof user.username).toBe('string');
    expect(['active', 'inactive', 'suspended']).toContain(user.status);
  });
  
  test('should handle async operations with proper typing', async () => {
    const apiService = new ApiService('https://api.example.com');
    const result = await apiService.get<User[]>('/users');
    
    expect(result.success).toBeDefined();
    expect(result.data).toBeDefined();
    expect(result.message).toBeDefined();
    
    if (result.success) {
      expect(Array.isArray(result.data)).toBe(true);
    }
  });
});

// Helper function for type assertions
const assertType = <T>(_value: T): void => {
  // This function does nothing at runtime but ensures type safety at compile time
};

// Usage in tests
test('type assertions', () => {
  const response: ApiResponse<User> = {
    success: true,
    data: {} as User,
    message: 'test'
  };
  
  assertType<ApiResponse<User>>(response);
  assertType<boolean>(response.success);
  assertType<User>(response.data);
});
```

⸻

🚦 TypeScript AI Enforcement Summary

✅ Enforce strict TypeScript configuration
✅ Block usage of `any` type (prefer `unknown`)
✅ Require explicit return type annotations
✅ Enforce proper interface definitions
✅ Require type guards for runtime validation
✅ Block implicit any in function parameters
✅ Enforce proper Promise/async typing
✅ Require proper error type handling
✅ Enforce utility type usage over manual type definitions
✅ Auto-fix violations where possible
