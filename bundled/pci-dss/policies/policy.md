# PCI-DSS Hardening Policy

[ASSERT] forbid-pattern: (?i)\b(?:4\d{3}|5[1-5]\d{2}|3[47]\d{2}|6(?:011|5\d{2}))[- ]?\d{4}[- ]?\d{4}[- ]?\d{1,4}\b
[ASSERT] forbid-pattern: (?i)cvv\s*[:=]
[ASSERT] disallow-path: ^samples/payments/
[ASSERT] require-label: ^(security|payments)$
[ASSERT] deny-import: ^\s*import\s+.*\s+from\s+["']insecure-crypto["']
