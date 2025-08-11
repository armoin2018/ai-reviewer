---
applyTo: "**/*.cpp,**/*.hpp,**/*.cc,**/*.cxx"
---

# C++ Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for C++ development. These include AI linting hints to automatically enforce style rules and maintain clean, performant, and modern C++ code.

⸻

📂 Project Architecture

✅ Rule: Enforce object-oriented design

- Use classes and objects for logical grouping
- Implement proper encapsulation with private/protected/public
- Follow RAII (Resource Acquisition Is Initialization) principle
- Use inheritance and polymorphism appropriately

✅ Rule: Modern C++ practices

- Prefer C++11/14/17/20 features over C-style alternatives
- Use smart pointers instead of raw pointers
- Implement move semantics for performance
- Use auto keyword for type deduction

✅ Rule: Strict separation of concerns

- Header files (.hpp) → Class declarations, inline functions, templates
- Source files (.cpp) → Class implementations and non-template functions
- Separate interface from implementation
- Use namespaces for logical grouping

✅ Rule: Memory Management

- Use RAII for automatic resource management
- Prefer stack allocation over heap allocation
- Use smart pointers (unique_ptr, shared_ptr) for dynamic allocation
- Avoid manual new/delete operations

⸻

📜 Standard Libraries & Practices

✅ Rule: Use STL containers and algorithms

- `std::vector` for dynamic arrays
- `std::string` for string handling
- `std::map`/`std::unordered_map` for key-value storage
- STL algorithms instead of manual loops

✅ Rule: Naming Conventions

- Classes: `PascalCase` (e.g., `UserManager`)
- Functions/Methods: `camelCase` (e.g., `processData`)
- Variables: `camelCase` (e.g., `userCount`)
- Constants: `UPPER_SNAKE_CASE` (e.g., `MAX_BUFFER_SIZE`)
- Private members: prefix with `m_` (e.g., `m_userData`)

⸻

🖋 C++ Coding Standards

✅ Class Design

- Use constructor initialization lists
- Implement Rule of Three/Five/Zero appropriately
- Make single-argument constructors explicit
- Use const methods where appropriate

✅ Example:

```cpp
class UserProcessor {
private:
    std::string m_name;
    std::vector<int> m_data;
    
public:
    explicit UserProcessor(const std::string& name) 
        : m_name(name), m_data() {}
    
    // Copy constructor
    UserProcessor(const UserProcessor& other) 
        : m_name(other.m_name), m_data(other.m_data) {}
    
    // Move constructor
    UserProcessor(UserProcessor&& other) noexcept
        : m_name(std::move(other.m_name)), m_data(std::move(other.m_data)) {}
    
    const std::string& getName() const { return m_name; }
    void addData(int value) { m_data.push_back(value); }
};
```

⸻

✅ Memory Management

- Use smart pointers for automatic memory management
- Prefer make_unique and make_shared
- Avoid raw new/delete operations
- Use RAII for resource management

❌ Bad:

```cpp
UserData* data = new UserData();
processData(data);
delete data;  // Easy to forget or miss on exception
```

✅ Good:

```cpp
auto data = std::make_unique<UserData>();
processData(*data);
// Automatic cleanup when out of scope
```

⸻

✅ Template Usage

- Use templates for type-safe generic programming
- Implement concepts (C++20) or SFINAE for constraints
- Prefer template specialization over runtime type checking
- Use auto with templates for type deduction

✅ Example:

```cpp
template<typename T>
class Container {
private:
    std::vector<T> m_items;
    
public:
    void add(const T& item) {
        m_items.push_back(item);
    }
    
    template<typename Predicate>
    auto findIf(Predicate pred) -> decltype(m_items.begin()) {
        return std::find_if(m_items.begin(), m_items.end(), pred);
    }
    
    size_t size() const { return m_items.size(); }
};
```

⸻

✅ STL Usage

- Use STL algorithms instead of manual loops
- Prefer range-based for loops
- Use appropriate containers for the use case
- Leverage iterator patterns

❌ Bad:

```cpp
std::vector<int> numbers = {1, 2, 3, 4, 5};
std::vector<int> doubled;
for (int i = 0; i < numbers.size(); ++i) {
    doubled.push_back(numbers[i] * 2);
}
```

✅ Good:

```cpp
std::vector<int> numbers = {1, 2, 3, 4, 5};
std::vector<int> doubled;
std::transform(numbers.begin(), numbers.end(), 
               std::back_inserter(doubled),
               [](int n) { return n * 2; });
```

⸻

✅ Exception Handling

- Use RAII to ensure cleanup in exception scenarios
- Catch exceptions by const reference
- Use specific exception types
- Implement strong exception safety guarantee

✅ Example:

```cpp
class FileProcessor {
public:
    void processFile(const std::string& filename) {
        std::ifstream file(filename);
        if (!file.is_open()) {
            throw std::runtime_error("Cannot open file: " + filename);
        }
        
        try {
            // Process file content
            std::string line;
            while (std::getline(file, line)) {
                processLine(line);
            }
        } catch (const std::exception& e) {
            // File automatically closed by destructor
            throw;  // Re-throw
        }
    }
    
private:
    void processLine(const std::string& line) {
        // Implementation
    }
};
```

⸻

✅ Performance Guidelines

- Use move semantics for expensive-to-copy objects
- Prefer pass-by-const-reference for large objects
- Use reserve() for vectors when size is known
- Avoid unnecessary copies with auto&

✅ Example:

```cpp
// Move semantics
class DataProcessor {
public:
    void setData(std::vector<int> data) {  // Pass by value for move
        m_data = std::move(data);
    }
    
    // Range-based loop with const auto&
    double calculateAverage() const {
        if (m_data.empty()) return 0.0;
        
        double sum = 0.0;
        for (const auto& value : m_data) {  // No copies
            sum += value;
        }
        return sum / m_data.size();
    }
    
private:
    std::vector<int> m_data;
};
```

⸻

🧪 Testing Standards

✅ Unit Testing

- Use frameworks like Google Test or Catch2
- Test constructors, destructors, and copy/move operations
- Mock dependencies for isolated testing
- Test exception scenarios

✅ RAII Testing

- Verify proper resource cleanup
- Test exception safety
- Check for memory leaks with tools like Valgrind
- Verify move semantics work correctly

⸻

🚦 C++ AI Enforcement Summary

✅ Enforce RAII and smart pointer usage
✅ Require modern C++ features over C-style alternatives
✅ Block raw new/delete operations
✅ Enforce const correctness
✅ Require exception safety
✅ Enforce proper class design (Rule of Three/Five/Zero)
✅ Prefer STL algorithms over manual loops
✅ Enforce move semantics for performance
✅ Require template constraints where appropriate
✅ Auto-fix violations where possible
