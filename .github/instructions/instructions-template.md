# Language-Specific Instruction File Generation Prompt

This document provides the comprehensive prompt template for generating language-specific coding instruction files that integrate with GitHub Copilot and AI development tools.

## 📋 Prompt Template

Use this prompt to generate detailed coding instruction files for any programming language:

---

**PROMPT:**

```
Create a comprehensive coding & style guide for [LANGUAGE] development with AI linting hints. This should be a detailed instruction file following the established format used in the existing JavaScript and Python instruction files.

The file should include:

## Required Sections:

### 1. Header & Metadata
- Front matter with applyTo field specifying file extensions
- Title: "[LANGUAGE] Coding & Style Guide (with AI Linting Hints)"
- Introduction paragraph explaining purpose and scope

### 2. Project Architecture (📂)
- Rule: Enforce API-first architecture (adapt to language)
- Rule: Strict separation of concerns
- Rule: Language-specific package/module organization
- Rule: Dependency management practices
- Rule: Variable Functions & Classes patterns

### 3. Standard Libraries & Frameworks (📜)
- Preferred standard library practices
- Approved third-party libraries and frameworks
- Asset/dependency management rules
- Version control and build practices

### 4. Language-Specific Coding Standards (🖋)
- String handling best practices
- Variable declaration and naming conventions
- Function design and implementation patterns
- Code organization and structure

### 5. Performance & Memory Guidelines (⚡)
- Language-specific performance anti-patterns to avoid
- Memory management best practices
- Loop optimization rules
- Efficient data structure usage

### 6. Advanced Patterns
- Variable Functions implementation
- Variable Classes implementation
- Error handling patterns
- Async/concurrency patterns (if applicable)

### 7. Testing Standards (🧪)
- Testing framework recommendations
- Test structure and organization
- Mocking and dependency injection
- Coverage and quality metrics

### 8. AI Enforcement Summary (🚦)
- Bullet points of key rules for AI linting
- Auto-fixable violations
- Code quality enforcement points

## Language-Specific Requirements:

For each language, adapt these core concepts:

### Performance Rules (Universal)
- 🚫 Block string concatenation in loops
- 🚫 Block inefficient array/list operations for string building
- ✅ Promote efficient alternatives (join, StringBuilder, etc.)
- ✅ Cache expensive operations outside loops

### Variable Functions Pattern
- Implement dynamic function calling appropriate to the language
- Follow message-passing pattern where applicable
- Reduce switch/case or if/elif chains
- Enable extensible architectures

### Variable Classes Pattern
- Consistent interface: constructor, destructor/cleanup, get, set, main/process
- Internal data management
- Dynamic class instantiation
- Resource management patterns

### Code Quality
- Language-appropriate naming conventions
- Documentation standards (JSDoc, docstrings, XML docs, etc.)
- Type safety practices (TypeScript, Python type hints, etc.)
- Linting and formatting tool integration

## Format Requirements:

1. Use markdown with proper heading hierarchy
2. Include practical code examples for each concept
3. Show both ❌ Bad and ✅ Good examples
4. Use appropriate syntax highlighting for code blocks
5. Include specific tool recommendations
6. Provide actionable AI linting hints
7. Follow the established visual structure with emoji section headers

## Output Requirements:

- Front matter with appropriate file extension matching
- Comprehensive coverage suitable for professional development teams
- Practical examples that demonstrate real-world usage
- Balance between beginner accessibility and advanced techniques
- Integration guidance for popular IDEs and development tools

Generate the instruction file for: [LANGUAGE]
```

---

## 🎯 Language-Specific Customization Guide

When using this prompt for specific languages, customize these areas:

### File Extensions
Update the front matter `applyTo` field with appropriate extensions:
- **PHP**: `**/*.php,**/*.phtml`
- **Perl**: `**/*.pl,**/*.pm,**/*.t`
- **Rust**: `**/*.rs`
- **CSS**: `**/*.css,**/*.scss,**/*.sass,**/*.less`
- **HTML**: `**/*.html,**/*.htm,**/*.xhtml`

### Performance Patterns
Adapt performance rules to language-specific concepts:
- **String Building**: Language-specific efficient methods
- **Memory Management**: GC vs manual management approaches
- **Concurrency**: Language-appropriate async patterns
- **I/O Operations**: Efficient file and network handling

### Ecosystem Integration
Include language-specific tooling:
- **Package Managers**: npm, pip, cargo, composer, cpan
- **Build Tools**: webpack, make, cargo, gulp, grunt
- **Testing Frameworks**: Jest, pytest, cargo test, PHPUnit
- **Linting Tools**: ESLint, pylint, clippy, PHP_CodeSniffer

### Architecture Patterns
Adapt to language paradigms:
- **Object-Oriented**: Class hierarchies, inheritance, polymorphism
- **Functional**: Pure functions, immutability, higher-order functions
- **Procedural**: Module organization, namespace management
- **Systems**: Memory safety, performance optimization

## 📚 Template Structure Reference

Use this structure for consistency across all instruction files:

```markdown
---
applyTo: "[FILE_EXTENSIONS]"
---

# [LANGUAGE] Coding & Style Guide (with AI Linting Hints)

[Introduction paragraph]

⸻

📂 Project Architecture
[Architecture rules and patterns]

⸻

📜 [Standard Libraries/Frameworks Section]
[Library and framework guidelines]

⸻

🖋 [LANGUAGE] Coding Standards
[Language-specific coding practices]

⸻

⚡ Performance Guidelines
[Performance rules and optimization]

⸻

🧪 Testing Standards
[Testing practices and frameworks]

⸻

🚦 AI Enforcement Summary
[Bullet points for AI linting]
```

## 🔄 Usage Instructions

1. **Copy the prompt template** from the "PROMPT Template" section
2. **Replace [LANGUAGE]** with the target programming language
3. **Customize language-specific sections** using the customization guide
4. **Run the prompt** with your AI assistant
5. **Review and refine** the generated instruction file
6. **Add front matter** with appropriate file extensions
7. **Test integration** with your development environment

## 🎨 Quality Checklist

Ensure each generated instruction file includes:

- [ ] Complete front matter with file extension matching
- [ ] Comprehensive introduction explaining scope and purpose
- [ ] Architecture guidelines adapted to language paradigms
- [ ] Practical code examples with good/bad comparisons
- [ ] Performance optimization specific to language characteristics
- [ ] Testing framework integration and best practices
- [ ] AI enforcement rules suitable for automated linting
- [ ] Professional formatting with emoji section headers
- [ ] Integration guidance for popular development tools
- [ ] Balance between accessibility and advanced techniques

This template provides a comprehensive foundation for creating consistent, high-quality instruction files across all programming languages in your development ecosystem.
