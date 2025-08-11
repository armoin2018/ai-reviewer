Python Coding & Style Guide (with AI Linting Hints)

This guide defines coding standards and best practices for Python development. These include AI linting hints to automatically enforce style rules and maintain clean, performant, and Pythonic code.

⸻

📂 Project Architecture

✅ Rule: Enforce API-first architecture

- Backend (Python) must provide API logic and return JSON/data structures. No template rendering in API endpoints.
- Frontend must consume API data and render UI. Keep presentation logic separate from business logic.

✅ Rule: Strict separation of concerns

- Python → API endpoints, business logic, and data processing
- Templates → Structural markup only (no embedded business logic)
- Static files → External CSS/JS only
- Configuration → Environment variables and config files

✅ Rule: Package Structure

- Organize code into logical packages with `__init__.py` files
- Use meaningful module names (e.g., `api/`, `models/`, `utils/`, `services/`)
- Follow PEP 8 naming conventions

✅ Rule: Dependency Management

- Use `requirements.txt` or `pyproject.toml` for dependency specification
- Pin dependency versions for reproducible builds
- Separate development and production dependencies

✅ Rule: Variable Functions & Classes

- Use callable objects and dynamic function/class loading instead of large if/elif chains
- Implement consistent patterns for flexibility and reduced code changes


⸻

📜 Standard Libraries & Frameworks

✅ Rule: Prefer standard library when possible

- Use `json` for JSON handling
- Use `datetime` for date/time manipulation
- Use `pathlib` for file path operations
- Use `logging` for application logging

✅ Rule: Common approved libraries

- `requests` for HTTP calls
- `pydantic` for data validation
- `sqlalchemy` for database ORM
- `fastapi` or `flask` for web APIs
- `pytest` for testing
- `black` for code formatting
- `mypy` for type checking

⸻

🐍 Python Coding Standards

✅ String Handling

- Use f-strings for string interpolation when possible
- Use single quotes for simple strings, double quotes for strings with single quotes
- Use triple quotes for multiline strings and docstrings

✅ Example:

```python
name = "World"
message = f"Hello, {name}!"
print(message)
```

⸻

✅ Output & Logging

- Use `logging` module instead of `print()` for application output
- Combine related log messages rather than multiple separate calls
- Use appropriate log levels (DEBUG, INFO, WARNING, ERROR, CRITICAL)

❌ Bad:

```python
print("Processing started")
print("Step 1 complete")
print("Step 2 complete")
```

✅ Good:

```python
import logging

logger = logging.getLogger(__name__)
logger.info("Processing started: Step 1 and Step 2 complete")
```

⸻

✅ Loops & Memory (Python)

- Cache expensive function calls outside loops when results are reused
- 🚫 Avoid string accumulation inside loops:
  - Do not use `+=` for string concatenation in loops
  - Do not use `list.append()` followed by `''.join()` for simple concatenations

❌ Bad:

```python
result = ""
for line in lines:
    result += line  # prohibited in loops
```

❌ Also Bad:

```python
parts = []
for line in lines:
    parts.append(line)  # prohibited for simple string building
result = ''.join(parts)
```

✅ Good:

```python
result = ''.join(lines)
# or for more complex operations
result = '\n'.join(process_line(line) for line in lines)
```

⸻

✅ Variable Functions (Python)

- Use `getattr()` and callable objects instead of large if/elif chains
- Follow message pattern: single data argument, return modified data
- Simplifies code and reduces maintenance overhead

✅ Example:

```python
# Bad: Multiple if/elif statements
def process_action(action, data):
    if action == 'validate':
        return validate_data(data)
    elif action == 'transform':
        return transform_data(data)
    elif action == 'save':
        return save_data(data)
    else:
        return data

# Good: Variable function pattern
def process_message(msg):
    handler_name = f"{msg['action']}_handler"
    handler = globals().get(handler_name)
    if handler and callable(handler):
        return handler(msg)
    return msg

def validate_handler(msg):
    """Process validation"""
    msg['payload'] = validate_data(msg['payload'])
    return msg
```

✅ Variable Classes (Python)

- Implement consistent class interface with standard methods
- Use `__init__`, `__enter__`/`__exit__` for resource management
- Enable dynamic class instantiation

✅ Example:

```python
class BaseProcessor:
    def __init__(self, config=None):
        self.data = config or {}
    
    def __enter__(self):
        return self
    
    def __exit__(self, exc_type, exc_val, exc_tb):
        # Cleanup if needed
        pass
    
    def get(self, key, default=None):
        return self.data.get(key, default)
    
    def set(self, key, value):
        self.data[key] = value
        return self
    
    def process(self, msg):
        """Main processing logic"""
        msg['payload'] = self._transform(msg['payload'])
        return msg
    
    def _transform(self, payload):
        """Override in child classes"""
        return payload

# Usage with variable classes
processor_class_name = f"{msg['processor']}Processor"
processor_class = globals().get(processor_class_name)
if processor_class and issubclass(processor_class, BaseProcessor):
    with processor_class(config) as processor:
        result = processor.process(msg)
```

⸻

✅ Type Hints & Documentation

- Use type hints for function parameters and return values
- Write clear docstrings following Google or NumPy style
- Use `typing` module for complex types

✅ Example:

```python
from typing import Dict, List, Optional, Any

def process_data(
    items: List[Dict[str, Any]], 
    config: Optional[Dict[str, str]] = None
) -> Dict[str, Any]:
    """
    Process a list of data items according to configuration.
    
    Args:
        items: List of dictionaries containing data to process
        config: Optional configuration parameters
        
    Returns:
        Dictionary containing processing results
        
    Raises:
        ValueError: If items list is empty
    """
    if not items:
        raise ValueError("Items list cannot be empty")
    
    config = config or {}
    return {"processed": len(items), "config": config}
```

⸻

✅ Error Handling

- Use specific exception types rather than generic `Exception`
- Implement proper error context and logging
- Use context managers for resource cleanup

✅ Example:

```python
import logging
from pathlib import Path

logger = logging.getLogger(__name__)

def read_config_file(file_path: str) -> Dict[str, Any]:
    """Read configuration from file with proper error handling."""
    config_path = Path(file_path)
    
    try:
        if not config_path.exists():
            raise FileNotFoundError(f"Config file not found: {file_path}")
            
        with config_path.open('r', encoding='utf-8') as f:
            return json.load(f)
            
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in config file {file_path}: {e}")
        raise
    except PermissionError:
        logger.error(f"Permission denied reading config file: {file_path}")
        raise
```

⸻

🧠 Performance & Memory

- Use generators for large data processing to save memory
- Cache expensive computations with `functools.lru_cache`
- Use list/dict comprehensions for simple transformations
- Avoid premature optimization - profile first

✅ Example:

```python
from functools import lru_cache

@lru_cache(maxsize=128)
def expensive_calculation(value: int) -> int:
    # Expensive operation
    return sum(i ** 2 for i in range(value))

# Generator for memory efficiency
def process_large_dataset(data_source):
    for item in data_source:
        if item.is_valid():
            yield transform_item(item)

# List comprehension for simple transformations
processed = [item.upper() for item in items if item.strip()]
```

⸻

✅ Testing Standards

- Write unit tests with `pytest`
- Use meaningful test names that describe behavior
- Follow Arrange-Act-Assert pattern
- Mock external dependencies

✅ Example:

```python
import pytest
from unittest.mock import patch, MagicMock

def test_process_data_returns_correct_count():
    # Arrange
    test_items = [{"id": 1}, {"id": 2}, {"id": 3}]
    expected_count = 3
    
    # Act
    result = process_data(test_items)
    
    # Assert
    assert result["processed"] == expected_count

@patch('requests.get')
def test_api_call_handles_network_error(mock_get):
    # Arrange
    mock_get.side_effect = requests.ConnectionError("Network error")
    
    # Act & Assert
    with pytest.raises(requests.ConnectionError):
        make_api_call("http://example.com")
```

⸻

⚡ Performance Rules

✅ Unified Performance Guidelines

- 🚫 Avoid string concatenation in loops (`+=`)
- 🚫 Avoid unnecessary list building for simple joins
- ✅ Use generators and comprehensions appropriately
- ✅ Profile before optimizing
- ✅ Cache expensive computations

⸻

✍️ Commit Message Conventions

- Prefix commits with: `feat:`, `fix:`, `docs:`, `style:`, `refactor:`, `perf:`, `test:`
- Example: `feat: add user authentication with JWT tokens`

⸻

🚦 AI Enforcement Summary

✅ Enforce clean architecture separation
✅ Block string concatenation in loops
✅ Enforce type hints and documentation
✅ Prefer standard library and approved packages
✅ Enforce proper error handling
✅ Use variable functions/classes over if/elif chains
✅ Enforce consistent class interfaces and patterns
✅ Encourage testing and code quality practices
✅ Auto-fix PEP 8 violations where possible