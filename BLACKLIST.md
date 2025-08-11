# BLACKLIST.md

This file contains prohibited and deprecated packages that must not be used in the Copilot Skillset Reviewer project. Dependencies on this list should be avoided or replaced with approved alternatives.

## Prohibition Categories

### 🚨 Security Risk - Critical

Packages with known critical vulnerabilities or security issues

### 🔻 Deprecated/Unmaintained

Packages no longer maintained or officially deprecated

### ⚖️ License Incompatible

Packages with licenses incompatible with commercial use

### 🐌 Performance Risk

Packages with significant performance or stability issues

### 🔧 Better Alternatives Available

Packages superseded by better, more secure alternatives

---

## Prohibited Packages

### HTTP & Networking

#### 🚨 request@2.88.2 - DEPRECATED

- **Reason**: Officially deprecated, no longer maintained
- **Alternative**: node-fetch@3.x (approved)
- **Risk**: Security vulnerabilities will not be patched
- **Status**: Critical - Replace immediately if found

#### 🚨 node-fetch@2.x - SECURITY RISK

- **Reason**: Known vulnerabilities in v2.x series
- **Alternative**: node-fetch@3.x (approved)
- **Risk**: Critical security vulnerabilities
- **Status**: Replace with v3.x immediately

#### 🔧 axios@0.x - OUTDATED

- **Reason**: Version 0.x has multiple vulnerabilities
- **Alternative**: node-fetch@3.x or axios@1.x
- **Risk**: Multiple CVEs in older versions
- **Status**: Use only v1.x if needed

### Authentication & Security

#### 🚨 jsonwebtoken@8.x - SECURITY RISK

- **Reason**: Critical vulnerabilities in algorithm verification
- **Alternative**: jsonwebtoken@9.x (approved)
- **Risk**: Algorithm confusion attacks possible
- **Status**: Critical - Use only v9.x

#### 🚨 bcrypt@0.x-4.x - WEAK ENCRYPTION

- **Reason**: Older versions use weak encryption rounds
- **Alternative**: bcrypt@5.x with proper round configuration
- **Risk**: Password hashing vulnerabilities
- **Status**: Use only latest version with 12+ rounds

#### ⚖️ crypto-js@3.x - LICENSE RISK

- **Reason**: License changes in some versions
- **Alternative**: Node.js built-in crypto module
- **Risk**: Potential license compliance issues
- **Status**: Verify license before use, prefer native crypto

### Development Tools

#### 🔻 tslint@6.x - DEPRECATED

- **Reason**: Officially deprecated in favor of ESLint
- **Alternative**: eslint with @typescript-eslint (approved)
- **Risk**: No future updates or security patches
- **Status**: Migrate to ESLint immediately

#### 🚨 lodash@4.17.20 and earlier - SECURITY

- **Reason**: Prototype pollution vulnerabilities
- **Alternative**: lodash@4.17.21+ or native JavaScript
- **Risk**: Prototype pollution attacks
- **Status**: Use only latest version or avoid

#### 🔻 moment@2.x - DEPRECATED

- **Reason**: In maintenance mode, recommends alternatives
- **Alternative**: date-fns, dayjs, or native Date
- **Risk**: No new features, limited maintenance
- **Status**: Prefer modern alternatives for new code

### Build & Development

#### 🚨 webpack@4.x - SECURITY RISK

- **Reason**: Known vulnerabilities, EOL
- **Alternative**: webpack@5.x or Vite
- **Risk**: Build process vulnerabilities
- **Status**: Upgrade to v5.x or use alternatives

#### 🔻 node-sass@4.x - DEPRECATED

- **Reason**: Deprecated in favor of Dart Sass
- **Alternative**: sass (Dart Sass implementation)
- **Risk**: No updates, compilation issues with newer Node
- **Status**: Migrate to sass package

### File System & Utilities

#### 🚨 tar@4.x-5.x - SECURITY RISK

- **Reason**: Arbitrary file overwrite vulnerabilities
- **Alternative**: tar@6.x with proper validation
- **Risk**: Directory traversal attacks
- **Status**: Use only v6.x with security patches

#### 🚨 serialize-javascript@5.0.0-5.0.1 - XSS RISK

- **Reason**: XSS vulnerabilities in specific versions
- **Alternative**: serialize-javascript@6.x
- **Risk**: Cross-site scripting attacks
- **Status**: Use only patched versions

### Database & ORM (If Applicable)

#### 🚨 sequelize@5.x - SECURITY RISK

- **Reason**: SQL injection vulnerabilities in older versions
- **Alternative**: sequelize@6.x with proper validation
- **Risk**: SQL injection attacks
- **Status**: Use only v6.x with input sanitization

### Testing & Quality

#### 🔻 jasmine@2.x - OUTDATED

- **Reason**: Very old version with limited features
- **Alternative**: jest@29.x (approved) or jasmine@4.x
- **Risk**: Missing security patches and features
- **Status**: Use jest or latest jasmine

---

## Global Patterns to Avoid

### Version Patterns

- **Pre-1.0 versions**: Avoid packages below v1.0 unless explicitly approved
- **Specific vulnerable versions**: Any package with known CVEs
- **Unmaintained packages**: No updates for 2+ years without explicit approval

### License Types to Avoid

- **GPL-3.0**: Requires open-sourcing derivative works
- **AGPL**: Network copyleft requirements
- **Proprietary**: Commercial licenses without proper agreements
- **Unknown/Missing**: Packages without clear license information

### Anti-Patterns

- **Native binaries**: Avoid packages requiring native compilation unless critical
- **Large bundle sizes**: Packages >10MB without strong justification
- **Excessive dependencies**: Packages with >50 dependencies
- **Prototype pollution**: Any package known for prototype pollution

---

## Replacement Guidelines

### Before Adding Any Dependency

1. Check this blacklist first
2. Verify current version has no known vulnerabilities
3. Confirm license compatibility
4. Check maintenance status (last update <6 months)
5. Evaluate bundle size impact
6. Consider if functionality can be implemented natively

### Migration Process

1. **Identify**: Scan package.json against this blacklist
2. **Plan**: Create migration plan with approved alternatives
3. **Test**: Implement replacements in development branch
4. **Validate**: Run full test suite with new dependencies
5. **Deploy**: Update production after successful validation
6. **Monitor**: Watch for any issues after migration

### Security Monitoring

- **Weekly**: Automated vulnerability scanning
- **Monthly**: Manual review of all dependencies
- **Quarterly**: Full security audit of dependency tree
- **Immediate**: Emergency response to critical vulnerabilities

---

## Emergency Procedures

### Critical Security Vulnerability Discovered

1. **Immediate**: Remove or isolate affected package
2. **Assessment**: Evaluate impact on production systems
3. **Mitigation**: Implement temporary workaround if needed
4. **Replacement**: Identify and test approved alternative
5. **Deployment**: Emergency deployment of fix
6. **Documentation**: Update blacklist and notify team

### Deprecated Package Discovery

1. **Timeline**: Establish migration timeline (usually 30-90 days)
2. **Alternative**: Identify approved replacement
3. **Planning**: Create detailed migration plan
4. **Testing**: Thorough testing of replacement
5. **Migration**: Gradual rollout with monitoring
6. **Cleanup**: Remove deprecated package completely

---

_Last Updated: 2025-08-11_  
_Review Frequency: Monthly_  
_Next Security Scan: 2025-08-18_
