/**
 * Comprehensive rule patterns for various formats
 */
const RULE_PATTERNS = [
    // [ASSERT] directives - highest priority
    {
        pattern: /^\s*\[ASSERT\]\s*(.+)$/i,
        priority: 'critical',
        category: 'security',
        processor: (match) => match[1].trim()
    },
    // [REQUIRE] directives
    {
        pattern: /^\s*\[REQUIRE\]\s*(.+)$/i,
        priority: 'high',
        category: 'compliance',
        processor: (match) => match[1].trim()
    },
    // [CHECK] directives
    {
        pattern: /^\s*\[CHECK\]\s*(.+)$/i,
        priority: 'medium',
        category: 'testing',
        processor: (match) => match[1].trim()
    },
    // [WARN] directives
    {
        pattern: /^\s*\[WARN\]\s*(.+)$/i,
        priority: 'low',
        category: 'style',
        processor: (match) => match[1].trim()
    },
    // Must/Should statements
    {
        pattern: /^\s*(?:[-*+]\s+)?(?:MUST|SHALL):\s*(.+)$/i,
        priority: 'critical',
        category: 'compliance',
        processor: (match) => match[1].trim()
    },
    {
        pattern: /^\s*(?:[-*+]\s+)?(?:SHOULD|RECOMMENDED):\s*(.+)$/i,
        priority: 'high',
        category: 'compliance',
        processor: (match) => match[1].trim()
    },
    // Security-related bullet points
    {
        pattern: /^\s*[-*+]\s+.*(?:security|secure|encrypt|auth|permission|access|vulnerability|exploit|attack|injection|xss|csrf|cors).*$/i,
        priority: 'high',
        category: 'security',
        processor: (match) => match[0].replace(/^\s*[-*+]\s+/, '').trim()
    },
    // Performance-related bullet points
    {
        pattern: /^\s*[-*+]\s+.*(?:performance|optimize|cache|speed|latency|memory|cpu|load|scale|benchmark).*$/i,
        priority: 'medium',
        category: 'performance',
        processor: (match) => match[0].replace(/^\s*[-*+]\s+/, '').trim()
    },
    // Testing-related bullet points
    {
        pattern: /^\s*[-*+]\s+.*(?:test|coverage|unit|integration|e2e|mock|stub|spec|assert).*$/i,
        priority: 'high',
        category: 'testing',
        processor: (match) => match[0].replace(/^\s*[-*+]\s+/, '').trim()
    },
    // Documentation-related bullet points
    {
        pattern: /^\s*[-*+]\s+.*(?:document|comment|readme|doc|api|swagger|openapi).*$/i,
        priority: 'low',
        category: 'documentation',
        processor: (match) => match[0].replace(/^\s*[-*+]\s+/, '').trim()
    },
    // License-related bullet points
    {
        pattern: /^\s*[-*+]\s+.*(?:license|copyright|apache|mit|gpl|proprietary|attribution).*$/i,
        priority: 'medium',
        category: 'licensing',
        processor: (match) => match[0].replace(/^\s*[-*+]\s+/, '').trim()
    },
    // General bullet points - lowest priority
    {
        pattern: /^\s*[-*+]\s+(.{10,100})$/,
        priority: 'low',
        category: 'style',
        processor: (match) => match[1].trim()
    }
];
/**
 * Priority weights for sorting
 */
const PRIORITY_WEIGHTS = {
    critical: 4,
    high: 3,
    medium: 2,
    low: 1
};
/**
 * Extract rules from various markdown formats
 */
function extractRules(markdown) {
    const lines = markdown.split(/\r?\n/);
    const rules = [];
    const seenRules = new Set();
    let ruleCounter = 1;
    // Track current section context for better categorization
    let currentContext = {
        section: '',
        category: 'compliance'
    };
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Update context based on headers
        const headerMatch = line.match(/^#{1,6}\s*(.+)$/);
        if (headerMatch) {
            const header = headerMatch[1].toLowerCase();
            currentContext.section = header;
            // Determine category from section headers
            if (header.includes('security') || header.includes('auth')) {
                currentContext.category = 'security';
            }
            else if (header.includes('performance') || header.includes('speed')) {
                currentContext.category = 'performance';
            }
            else if (header.includes('test') || header.includes('quality')) {
                currentContext.category = 'testing';
            }
            else if (header.includes('style') || header.includes('format')) {
                currentContext.category = 'style';
            }
            else if (header.includes('license') || header.includes('copyright')) {
                currentContext.category = 'licensing';
            }
            else if (header.includes('document') || header.includes('readme')) {
                currentContext.category = 'documentation';
            }
            else {
                currentContext.category = 'compliance';
            }
            continue;
        }
        // Try to match against rule patterns
        for (const pattern of RULE_PATTERNS) {
            const match = line.match(pattern.pattern);
            if (match) {
                const description = pattern.processor(match);
                // Skip empty or very short descriptions
                if (description.length < 5)
                    continue;
                // Skip duplicates
                const normalized = description.toLowerCase().trim();
                if (seenRules.has(normalized))
                    continue;
                seenRules.add(normalized);
                // Use context category if it's more specific than pattern category
                let category = pattern.category;
                if (currentContext.section &&
                    pattern.category === 'style' &&
                    currentContext.category !== 'style') {
                    category = currentContext.category;
                }
                rules.push({
                    id: `R${ruleCounter.toString().padStart(3, '0')}`,
                    description,
                    priority: pattern.priority,
                    category,
                    source: currentContext.section || 'General'
                });
                ruleCounter++;
                break; // Only match first pattern per line
            }
        }
    }
    return rules;
}
/**
 * Sort rules by priority and category
 */
function sortRules(rules) {
    return rules.sort((a, b) => {
        // First by priority (highest first)
        const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (priorityDiff !== 0)
            return priorityDiff;
        // Then by category (security first, then compliance, etc.)
        const categoryOrder = [
            'security', 'compliance', 'testing', 'performance',
            'licensing', 'documentation', 'style'
        ];
        const aCategoryIndex = categoryOrder.indexOf(a.category);
        const bCategoryIndex = categoryOrder.indexOf(b.category);
        if (aCategoryIndex !== bCategoryIndex) {
            return aCategoryIndex - bCategoryIndex;
        }
        // Finally by description alphabetically
        return a.description.localeCompare(b.description);
    });
}
/**
 * Cache for rule summaries to improve performance
 */
const ruleCache = new Map();
const CACHE_MAX_SIZE = 100;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
/**
 * Generate cache key from markdown content
 */
function getCacheKey(markdown, maxItems) {
    const hash = Buffer.from(markdown).toString('base64').slice(0, 32);
    return `${hash}_${maxItems}`;
}
/**
 * Clean expired cache entries
 */
function cleanCache() {
    const now = Date.now();
    for (const [key, entry] of ruleCache.entries()) {
        if (now - entry.timestamp > CACHE_TTL) {
            ruleCache.delete(key);
        }
    }
    // Limit cache size
    if (ruleCache.size > CACHE_MAX_SIZE) {
        const oldestKeys = Array.from(ruleCache.keys()).slice(0, ruleCache.size - CACHE_MAX_SIZE);
        oldestKeys.forEach(key => ruleCache.delete(key));
    }
}
/**
 * Enhanced rule summarization with intelligent parsing and categorization
 *
 * @param markdown Markdown content containing rules and guidelines
 * @param maxItems Maximum number of rules to return (default: 400)
 * @returns Array of processed rules with priorities and categories
 */
export function summarizeRules(markdown, maxItems = 400) {
    // Check cache first
    const cacheKey = getCacheKey(markdown, maxItems);
    const cached = ruleCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
        return cached.rules;
    }
    // Clean cache periodically
    cleanCache();
    // Extract and process rules
    const extractedRules = extractRules(markdown);
    const sortedRules = sortRules(extractedRules);
    const limitedRules = sortedRules.slice(0, maxItems);
    // Cache the result
    ruleCache.set(cacheKey, {
        rules: limitedRules,
        timestamp: Date.now()
    });
    return limitedRules;
}
/**
 * Get rule statistics for a given set of rules
 */
export function getRuleStatistics(rules) {
    const byPriority = {
        critical: 0, high: 0, medium: 0, low: 0
    };
    const byCategory = {
        security: 0, performance: 0, style: 0, testing: 0,
        licensing: 0, documentation: 0, compliance: 0
    };
    for (const rule of rules) {
        byPriority[rule.priority]++;
        byCategory[rule.category]++;
    }
    return {
        total: rules.length,
        byPriority,
        byCategory
    };
}
