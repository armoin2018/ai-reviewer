# Baseline Secure Coding Policy

[ASSERT] forbid-pattern: (?i)password\s*[:=]
[ASSERT] forbid-pattern: (?i)api[_-]?key\s*[:=]
[ASSERT] deny-import: ^\s*import\s+socket
[ASSERT] require-tests: true
