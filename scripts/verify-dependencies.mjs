#!/usr/bin/env node

/**
 * Dependency Verification Script
 * Verifies that all package.json dependencies are approved in WHITELIST.md
 * and that no blacklisted dependencies are present.
 */

import { readFileSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// ANSI color codes for output
const colors = {
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  reset: '\x1b[0m'
};

function log(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function loadPackageJson() {
  try {
    const packagePath = join(projectRoot, 'package.json');
    const packageContent = readFileSync(packagePath, 'utf8');
    return JSON.parse(packageContent);
  } catch (error) {
    log('red', `❌ Error loading package.json: ${error.message}`);
    process.exit(1);
  }
}

function loadWhitelist() {
  try {
    const whitelistPath = join(projectRoot, 'WHITELIST.md');
    const whitelistContent = readFileSync(whitelistPath, 'utf8');
    
    // Split into lines and look for package declarations
    const lines = whitelistContent.split('\n');
    const packages = new Map();
    
    for (const line of lines) {
      // Look for lines that start with "- **packagename@version**"
      // Use more specific regex: - **anything@version** where version doesn't contain *
      const match = line.match(/^- \*\*(.+?)@([^*]+)\*\*/);
      if (match) {
        const [, packageName, version] = match;
        packages.set(packageName.trim(), version.trim());
      }
    }
    
    return packages;
  } catch (error) {
    log('yellow', `⚠️  Warning: Could not load WHITELIST.md: ${error.message}`);
    return new Map();
  }
}

function loadBlacklist() {
  try {
    const blacklistPath = join(projectRoot, 'BLACKLIST.md');
    const blacklistContent = readFileSync(blacklistPath, 'utf8');
    
    // Extract blacklisted packages
    const packageRegex = /####.*?([^@\s]+)@?([^\s]*)/g;
    const blacklisted = new Set();
    let match;
    
    while ((match = packageRegex.exec(blacklistContent)) !== null) {
      const [, packageName] = match;
      if (packageName && !packageName.includes('#') && !packageName.includes('*')) {
        blacklisted.add(packageName.toLowerCase().trim());
      }
    }
    
    return blacklisted;
  } catch (error) {
    log('yellow', `⚠️  Warning: Could not load BLACKLIST.md: ${error.message}`);
    return new Set();
  }
}

function checkDependencies(dependencies, whitelist, blacklist, type) {
  let hasIssues = false;
  
  log('blue', `\n🔍 Checking ${type} dependencies:`);
  
  for (const [packageName, version] of Object.entries(dependencies)) {
    const cleanVersion = version.replace(/^[\^~]/, '');
    
    // Check if package is blacklisted
    if (blacklist.has(packageName.toLowerCase())) {
      log('red', `❌ BLACKLISTED: ${packageName}@${version}`);
      hasIssues = true;
      continue;
    }
    
    // Check if package is in whitelist
    if (whitelist.has(packageName)) {
      const approvedVersion = whitelist.get(packageName);
      // Check if versions are compatible (allow caret/tilde ranges)
      const versionMatches = cleanVersion === approvedVersion || 
                            cleanVersion.startsWith(approvedVersion) ||
                            approvedVersion.startsWith(cleanVersion);
      
      if (versionMatches) {
        log('green', `✅ ${packageName}@${version} (approved: ${approvedVersion})`);
      } else {
        log('yellow', `⚠️  VERSION MISMATCH: ${packageName}@${version} (approved: ${approvedVersion})`);
        hasIssues = true;
      }
    } else {
      log('yellow', `⚠️  NOT IN WHITELIST: ${packageName}@${version}`);
      log('yellow', `   Add to REVIEW.md for approval process`);
      hasIssues = true;
    }
  }
  
  return hasIssues;
}

function generateSecurityReport(packageJson) {
  const totalDeps = Object.keys(packageJson.dependencies || {}).length;
  const totalDevDeps = Object.keys(packageJson.devDependencies || {}).length;
  
  log('blue', '\n📊 Security Report:');
  log('blue', `   Production Dependencies: ${totalDeps}`);
  log('blue', `   Development Dependencies: ${totalDevDeps}`);
  log('blue', `   Total Dependencies: ${totalDeps + totalDevDeps}`);
  
  // Check for potential security issues
  const highRiskPackages = ['lodash', 'moment', 'request', 'axios'];
  const foundRiskPackages = [];
  
  const allDeps = { 
    ...packageJson.dependencies, 
    ...packageJson.devDependencies 
  };
  
  for (const pkg of highRiskPackages) {
    if (allDeps[pkg]) {
      foundRiskPackages.push(`${pkg}@${allDeps[pkg]}`);
    }
  }
  
  if (foundRiskPackages.length > 0) {
    log('yellow', '\n⚠️  Found packages requiring extra security attention:');
    foundRiskPackages.forEach(pkg => log('yellow', `   - ${pkg}`));
  }
}

function main() {
  log('blue', '🔐 Dependency Security Verification');
  log('blue', '=====================================');
  
  const packageJson = loadPackageJson();
  const whitelist = loadWhitelist();
  const blacklist = loadBlacklist();
  
  log('blue', `\n📋 Loaded ${whitelist.size} whitelisted packages`);
  if (whitelist.size > 0) {
    log('blue', `   First few entries: ${Array.from(whitelist.keys()).slice(0, 3).join(', ')}`);
  }
  log('blue', `📋 Loaded ${blacklist.size} blacklisted patterns`);
  
  let hasIssues = false;
  
  // Check production dependencies
  if (packageJson.dependencies) {
    const prodIssues = checkDependencies(
      packageJson.dependencies, 
      whitelist, 
      blacklist, 
      'production'
    );
    hasIssues = hasIssues || prodIssues;
  }
  
  // Check development dependencies  
  if (packageJson.devDependencies) {
    const devIssues = checkDependencies(
      packageJson.devDependencies, 
      whitelist, 
      blacklist, 
      'development'
    );
    hasIssues = hasIssues || devIssues;
  }
  
  generateSecurityReport(packageJson);
  
  log('blue', '\n🔍 Verification Summary:');
  if (hasIssues) {
    log('red', '❌ Issues found! Please review flagged dependencies.');
    log('yellow', '   - Add unapproved packages to REVIEW.md');
    log('yellow', '   - Remove or replace blacklisted packages');
    process.exit(1);
  } else {
    log('green', '✅ All dependencies verified successfully!');
    log('green', '   No security issues detected.');
  }
}

main();