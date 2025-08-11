---
applyTo: "**/*.c,**/*.h"
---

# C Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for C development. These include AI linting hints to automatically enforce style rules and maintain clean, performant, and maintainable C code.

⸻

📂 Project Architecture

✅ Rule: Enforce modular architecture

- Use header files (.h) for declarations and source files (.c) for implementations
- Keep functions focused and single-purpose
- Use static functions for internal module functionality
- Implement clear interfaces between modules

✅ Rule: Strict separation of concerns

- Header files → Function declarations, type definitions, constants
- Source files → Function implementations and internal logic
- Configuration → Preprocessor directives and compile-time constants
- Documentation → Comments and function documentation

✅ Rule: Memory Management

- Always pair malloc() with free()
- Initialize pointers to NULL after freeing
- Use const qualifiers where appropriate
- Avoid memory leaks through proper cleanup

✅ Rule: Error Handling

- Use return codes for error reporting
- Check all function return values
- Implement consistent error handling patterns
- Use errno for system call errors

⸻

📜 Standard Libraries & Practices

✅ Rule: Use standard C libraries

- `stdio.h` for input/output operations
- `stdlib.h` for memory allocation and utilities
- `string.h` for string manipulation
- `errno.h` for error handling

✅ Rule: Naming Conventions

- Functions: `snake_case` (e.g., `process_data`)
- Variables: `snake_case` (e.g., `user_count`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_BUFFER_SIZE`)
- Types: `snake_case_t` (e.g., `user_data_t`)

⸻

🖋 C Coding Standards

✅ String Handling

- Always null-terminate strings
- Use `strncpy` instead of `strcpy` for buffer safety
- Check buffer bounds before string operations
- Use `const char*` for read-only strings

✅ Example:

```c
#define MAX_NAME_LENGTH 64

void safe_string_copy(char* dest, const char* src, size_t dest_size) {
    if (dest && src && dest_size > 0) {
        strncpy(dest, src, dest_size - 1);
        dest[dest_size - 1] = '\0';  // Ensure null termination
    }
}
```

⸻

✅ Memory Management

- Always check malloc() return values
- Free all allocated memory
- Set pointers to NULL after freeing
- Use consistent allocation/deallocation patterns

❌ Bad:

```c
char* buffer = malloc(100);
strcpy(buffer, data);  // No null check
free(buffer);
```

✅ Good:

```c
char* buffer = malloc(100);
if (buffer == NULL) {
    return ERROR_OUT_OF_MEMORY;
}
strncpy(buffer, data, 99);
buffer[99] = '\0';
free(buffer);
buffer = NULL;
```

⸻

✅ Function Design

- Keep functions small and focused
- Use meaningful parameter names
- Return error codes or status
- Document function behavior in comments

✅ Example:

```c
/**
 * Process user data and store result
 * @param input_data: Source data to process (must not be NULL)
 * @param output_buffer: Destination buffer (must be pre-allocated)
 * @param buffer_size: Size of output buffer
 * @return: 0 on success, negative error code on failure
 */
int process_user_data(const user_data_t* input_data, 
                     char* output_buffer, 
                     size_t buffer_size) {
    if (!input_data || !output_buffer || buffer_size == 0) {
        return -1;  // Invalid parameters
    }
    
    // Implementation here
    return 0;  // Success
}
```

⸻

✅ Loops & Performance

- Initialize loop variables properly
- Avoid function calls in loop conditions when possible
- Use appropriate loop types (for, while, do-while)
- Cache array lengths outside loops

❌ Bad:

```c
for (int i = 0; i < strlen(str); i++) {  // strlen called every iteration
    process_char(str[i]);
}
```

✅ Good:

```c
size_t len = strlen(str);
for (size_t i = 0; i < len; i++) {
    process_char(str[i]);
}
```

⸻

✅ Error Handling Patterns

- Use consistent return codes
- Check all function return values
- Implement proper cleanup on errors
- Use goto for error cleanup when appropriate

✅ Example:

```c
int process_file(const char* filename) {
    FILE* file = NULL;
    char* buffer = NULL;
    int result = 0;
    
    file = fopen(filename, "r");
    if (!file) {
        result = -1;
        goto cleanup;
    }
    
    buffer = malloc(BUFFER_SIZE);
    if (!buffer) {
        result = -2;
        goto cleanup;
    }
    
    // Process file...
    
cleanup:
    if (file) {
        fclose(file);
    }
    if (buffer) {
        free(buffer);
    }
    return result;
}
```

⸻

🧠 Performance Guidelines

- Use appropriate data types for the task
- Minimize dynamic memory allocation in loops
- Use static storage when lifetime permits
- Profile code to identify bottlenecks

⸻

🧪 Testing Standards

✅ Unit Testing

- Test individual functions in isolation
- Use assert() for development-time checks
- Create test data and expected results
- Test error conditions and edge cases

✅ Memory Testing

- Use tools like Valgrind to detect memory leaks
- Test with different input sizes
- Verify proper cleanup in error conditions
- Check for buffer overflows

⸻

🚦 C AI Enforcement Summary

✅ Enforce proper memory management (malloc/free pairing)
✅ Require null checks for all pointers
✅ Block unsafe string functions (strcpy, sprintf)
✅ Enforce consistent naming conventions
✅ Require error checking for all function calls
✅ Enforce buffer bounds checking
✅ Require function documentation
✅ Block memory leaks and dangling pointers
✅ Enforce const correctness
✅ Auto-fix violations where possible
