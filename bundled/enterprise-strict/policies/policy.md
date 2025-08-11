# Enterprise Strict Policy

[ASSERT] disallow-path: ^examples/
[ASSERT] require-label: ^(security|legal|compliance)$
[ASSERT] block-commit-type: ^(chore|wip)
[ASSERT] enforce-license-header-exact: Copyright \(c\) 2025 ACME Corp
[ASSERT] deny-import: ^\s*import\s+.*\s+from\s+["']lodash["']
