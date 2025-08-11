---
applyTo: "**/*.js,**/*.mjs,**/*.jsx"
---

# JavaScript Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for JavaScript development. These include AI linting hints to automatically enforce style rules and maintain clean, performant, and modern JavaScript code.

⸻

📂 Project Architecture

✅ Rule: Enforce modular architecture

- Use ES6 modules (import/export) for code organization
- Keep functions focused and single-purpose
- Implement clear separation between business logic and presentation
- Use async/await for asynchronous operations

✅ Rule: Strict separation of concerns

- JavaScript → Business logic, API calls, and DOM manipulation
- HTML → Structural markup only (no inline JavaScript)
- CSS → External stylesheets only
- Configuration → Environment variables and config files

✅ Rule: Modern JavaScript practices

- Use ES6+ features (arrow functions, destructuring, template literals)
- Prefer const and let over var
- Use async/await instead of callback chains
- Implement proper error handling with try/catch

✅ Rule: Variable Functions & Classes

- Use variable functions instead of switch/case statements when appropriate
- Follow Node-RED pattern: single msg argument, return modified msg.payload
- Enables dynamic function calls and reduces code complexity

⸻

📜 Approved Libraries & Frameworks

✅ Rule: Use only approved libraries

- jQuery for DOM manipulation and AJAX calls
- Lodash for utility functions (e.g., _.cloneDeep, _.uniqBy)
- Moment.js for date/time handling
- Bootstrap for responsive UI components
- Font Awesome for icons

✅ Rule: Asset Management

- Keep all scripts in external files (no inline JavaScript in HTML)
- Use versioning for cache busting (e.g., script.js?v=1.0.3)
- Minimize and concatenate production assets

⸻

🖋 JavaScript Coding Standards

✅ Variable Declaration

- Use const for values that don't change
- Use let for values that need reassignment
- Never use var (block scoping issues)
- Initialize variables when declared

✅ Example:

```javascript
const API_BASE_URL = 'https://api.example.com';
const users = [];
let currentUser = null;

// Good: Descriptive variable names
const userAuthenticationToken = localStorage.getItem('token');
```

⸻

✅ Function Design

- Use arrow functions for simple operations
- Use async/await for asynchronous operations
- Implement proper error handling
- Use destructuring for function parameters

❌ Bad:

```javascript
function processUser(user) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            if (user.name) {
                resolve(user.name.toUpperCase());
            } else {
                reject('No name provided');
            }
        }, 1000);
    });
}
```

✅ Good:

```javascript
const processUser = async ({ name, email }) => {
    if (!name) {
        throw new Error('Name is required');
    }
    
    try {
        const result = await apiCall('/process-user', { name, email });
        return result.data;
    } catch (error) {
        console.error('User processing failed:', error);
        throw error;
    }
};
```

⸻

✅ Loops & Memory (JavaScript)

- 🚫 Avoid string accumulation inside loops:
  - Do not use `+=` for concatenating strings
  - Do not use `array.push('string')` to build up strings
- ✅ Instead, precompute values and join them outside the loop

❌ Bad:

```javascript
let result = '';
for (const line of lines) {
    result += line; // prohibited
}

// Also bad - array accumulation for strings
let parts = [];
for (const line of lines) {
    parts.push(line); // prohibited string accumulation
}
let result = parts.join('\n');
```

✅ Good:

```javascript
const result = lines.join('\n');

// For complex transformations
const result = lines
    .map(line => line.trim())
    .filter(line => line.length > 0)
    .join('\n');
```

⸻

✅ Variable Functions Pattern

- Use variable functions instead of switch/case statements when appropriate
- Follow Node-RED pattern: single msg argument, return modified msg.payload
- Enables dynamic function calls and reduces code complexity

✅ Example:

```javascript
// Bad: Multiple case statements
function processMessage(action, data) {
    switch (action) {
        case 'validate':
            return validateData(data);
        case 'transform':
            return transformData(data);
        case 'save':
            return saveData(data);
        default:
            throw new Error(`Unknown action: ${action}`);
    }
}

// Good: Variable function pattern
const processMessage = (msg) => {
    const functionName = msg.action + 'Handler';
    if (typeof window[functionName] === 'function') {
        return window[functionName](msg);
    }
    throw new Error(`Handler not found: ${functionName}`);
};

const validateHandler = (msg) => {
    // Process validation
    msg.payload = validateData(msg.payload);
    return msg;
};

const transformHandler = (msg) => {
    // Process transformation
    msg.payload = transformData(msg.payload);
    return msg;
};
```

⸻

✅ Variable Classes Pattern

- Implement consistent class interface: constructor, destructor, get, set, main
- Use internal data object for state management
- Enable dynamic class instantiation

✅ Example:

```javascript
class BaseProcessor {
    constructor(config = {}) {
        this.data = { ...config };
    }
    
    destructor() {
        // Cleanup if needed
        this.data = null;
    }
    
    get(key) {
        return this.data[key];
    }
    
    set(key, value) {
        this.data[key] = value;
        return this;
    }
    
    main(msg) {
        // Main processing logic
        msg.payload = this.process(msg.payload);
        return msg;
    }
    
    process(payload) {
        // Override in child classes
        return payload;
    }
}

// Usage with variable classes
const className = msg.processor + 'Processor';
if (typeof window[className] === 'function') {
    const processor = new window[className](config);
    const result = processor.main(msg);
}
```

⸻

✅ DOM Manipulation

- Cache DOM selectors to avoid repeated queries
- Use event delegation for dynamic content
- Batch DOM updates to prevent reflows
- Use modern DOM APIs (querySelector, classList)

✅ Example:

```javascript
// IIFE to avoid global scope pollution
(($, _) => {
    // Cache selectors
    const $userList = $('#user-list');
    const $loadingSpinner = $('.loading-spinner');
    
    // Event delegation
    $userList.on('click', '.user-item', function() {
        const userId = $(this).data('user-id');
        showUserDetails(userId);
    });
    
    // Batch DOM updates
    const renderUsers = (users) => {
        const userElements = users.map(user => 
            `<div class="user-item" data-user-id="${user.id}">
                ${user.name}
            </div>`
        );
        
        $userList.html(userElements.join(''));
    };
    
})(jQuery, _);
```

⸻

✅ Error Handling

- Use try/catch for async operations
- Implement specific error types
- Log errors appropriately
- Provide user-friendly error messages

✅ Example:

```javascript
class ApiError extends Error {
    constructor(message, status) {
        super(message);
        this.name = 'ApiError';
        this.status = status;
    }
}

const apiCall = async (endpoint, data) => {
    try {
        const response = await fetch(API_BASE_URL + endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getAuthToken()}`
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            throw new ApiError(`API call failed: ${response.statusText}`, response.status);
        }
        
        return await response.json();
    } catch (error) {
        console.error('API call failed:', error);
        
        if (error instanceof ApiError) {
            showUserMessage(`Server error: ${error.message}`);
        } else {
            showUserMessage('Network error. Please try again.');
        }
        
        throw error;
    }
};
```

⸻

🧠 Performance Guidelines

- Minimize DOM queries in loops by caching selectors
- Batch DOM updates to prevent excessive reflows and repaints
- Use debouncing for frequent events (scroll, resize, input)
- Lazy load resources when appropriate

✅ Example:

```javascript
// Debounced search
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

const searchUsers = debounce(async (query) => {
    if (query.length < 3) return;
    
    try {
        const users = await apiCall('/search-users', { query });
        renderUsers(users);
    } catch (error) {
        console.error('Search failed:', error);
    }
}, 300);
```

⸻

🧪 Testing Standards

✅ Unit Testing

- Use testing frameworks like Jest or Mocha
- Test async functions with proper await/expect patterns
- Mock external dependencies
- Test error scenarios and edge cases

✅ Example:

```javascript
// Jest test example
describe('UserProcessor', () => {
    test('should process user data correctly', async () => {
        const processor = new UserProcessor();
        const mockUser = { name: 'John Doe', email: 'john@example.com' };
        
        const result = await processor.processUser(mockUser);
        
        expect(result).toHaveProperty('processedName');
        expect(result.processedName).toBe('JOHN DOE');
    });
    
    test('should throw error for invalid user', async () => {
        const processor = new UserProcessor();
        const invalidUser = { email: 'john@example.com' }; // Missing name
        
        await expect(processor.processUser(invalidUser))
            .rejects
            .toThrow('Name is required');
    });
});
```

⸻

🚦 JavaScript AI Enforcement Summary

✅ Enforce modern ES6+ syntax over legacy patterns
✅ Block string concatenation inside loops (+=)
✅ Block array-based string accumulation (push for strings)
✅ Enforce const/let over var
✅ Require async/await over callback chains
✅ Enforce error handling with try/catch
✅ Prefer variable functions/classes over switch statements
✅ Enforce Node-RED style message patterns
✅ Require external scripts (no inline JavaScript)
✅ Auto-fix violations where possible
