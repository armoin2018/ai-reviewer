# PII Redaction Policy

[ASSERT] forbid-pattern: (?i)ssn\s*[:=]|\b\d{3}-\d{2}-\d{4}\b
[ASSERT] forbid-pattern: (?i)email\s*[:=]\s*["']?[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}
[ASSERT] forbid-pattern: (?i)phone\s*[:=]\s*["']?\+?\d[\d .()-]{7,}
[ASSERT] deny-import: ^\s*import\s+faker.*from\s+["']faker["']\s*$
[ASSERT] require-tests: true
