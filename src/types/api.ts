/**
 * API Response and Error Type Definitions
 * Defines standard response formats and error codes for the Copilot Skillset Reviewer API
 */

// Standard success response wrapper
export interface ApiResponse<T = any> {
  data: T;
  metadata?: {
    requestId: string;
    timestamp: string;
    version: string;
  };
}

// Standard error response format
export interface ApiError {
  error: {
    code: ErrorCode;
    message: string;
    correlationId: string;
    timestamp: string;
    details?: Record<string, any>;
  };
}

// Enumeration of all possible error codes
export enum ErrorCode {
  // Client Error Codes (4xx)
  MISSING_REQUIRED_FIELDS = 'MISSING_REQUIRED_FIELDS',
  INVALID_MARKDOWN_FIELD = 'INVALID_MARKDOWN_FIELD',
  MISSING_DIFF_FIELD = 'MISSING_DIFF_FIELD',
  MISSING_PACK_ID = 'MISSING_PACK_ID',
  ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',
  INVALID_REQUEST_FORMAT = 'INVALID_REQUEST_FORMAT',
  
  // Server Error Codes (5xx)
  INTERNAL_SERVER_ERROR = 'INTERNAL_SERVER_ERROR',
  LOAD_RULES_FAILED = 'LOAD_RULES_FAILED',
  SUMMARIZE_RULES_FAILED = 'SUMMARIZE_RULES_FAILED',
  INFER_QUALITY_GATES_FAILED = 'INFER_QUALITY_GATES_FAILED',
  NORMALIZE_DIFF_FAILED = 'NORMALIZE_DIFF_FAILED',
  ASSERT_COMPLIANCE_FAILED = 'ASSERT_COMPLIANCE_FAILED',
  FILE_CONTENTS_FAILED = 'FILE_CONTENTS_FAILED',
  BUNDLED_GUIDANCE_FAILED = 'BUNDLED_GUIDANCE_FAILED',
  SELECT_INSTRUCTION_PACK_FAILED = 'SELECT_INSTRUCTION_PACK_FAILED',
  
  // GitHub Integration Error Codes
  GITHUB_API_ERROR = 'GITHUB_API_ERROR',
  GITHUB_AUTH_ERROR = 'GITHUB_AUTH_ERROR',
  GITHUB_RATE_LIMIT = 'GITHUB_RATE_LIMIT',
  REPOSITORY_NOT_FOUND = 'REPOSITORY_NOT_FOUND',
  
  // Rule Processing Error Codes
  RULE_PARSING_ERROR = 'RULE_PARSING_ERROR',
  INVALID_RULE_FORMAT = 'INVALID_RULE_FORMAT',
  
  // Diff Processing Error Codes
  INVALID_DIFF_FORMAT = 'INVALID_DIFF_FORMAT',
  DIFF_TOO_LARGE = 'DIFF_TOO_LARGE',
  
  // Compliance Check Error Codes
  COMPLIANCE_CHECK_FAILED = 'COMPLIANCE_CHECK_FAILED',
  FILE_SIZE_EXCEEDED = 'FILE_SIZE_EXCEEDED'
}

// Health check response type
export interface HealthCheckResponse {
  ok: boolean;
  timestamp: string;
  uptime: number;
  version: string;
  environment?: string;
}

// Load rules response type
export interface LoadRulesResponse {
  files: string[];
  combinedMarkdown: string;
  personas: string[];
  policies: string[];
}

// Summarize rules response type  
export interface SummarizeRulesResponse {
  checklist: string[];
  totalItems: number;
}

// Infer quality gates response type
export interface InferQualityGatesResponse {
  recommendedCommands: string[];
}

// Normalize diff response type
export interface NormalizeDiffResponse {
  files: Array<{
    path: string;
    additions: number;
    deletions: number;
    binary: boolean;
    hunks: Array<{
      header: string;
      lines: Array<{
        type: 'context' | 'addition' | 'deletion';
        number: number;
        content: string;
      }>;
    }>;
  }>;
}

// Assert compliance response type
export interface AssertComplianceResponse {
  findings: Array<{
    id: string;
    status: 'pass' | 'fail' | 'warn' | 'na';
    note: string;
    file?: string;
    line?: number;
  }>;
  stats: {
    total: number;
    passed: number;
    failed: number;
    warnings: number;
    notApplicable: number;
  };
  usedChecklistCount: number;
  guidanceInferred: boolean;
}

// File contents response type
export interface FileContentsResponse {
  contents: Record<string, string>;
  count: number;
}

// Bundled guidance response types
export interface BundledPack {
  id: string;
  title: string;
  description: string;
  version: string;
  combinedMarkdown: string;
}

export interface ListBundledResponse {
  packs: Array<{
    id: string;
    title: string;
    description: string;
    version: string;
  }>;
}

export interface SelectInstructionPackResponse {
  pack: {
    id: string;
    title: string;
  };
  mode: string;
  files: string[];
  combinedMarkdown: string;
}

// Request body types
export interface LoadRulesRequest {
  owner: string;
  repo: string;
  ref: string;
}

export interface SummarizeRulesRequest {
  markdown: string;
  maxItems?: number;
}

export interface InferQualityGatesRequest {
  files: Array<{ path: string }>;
}

export interface NormalizeDiffRequest {
  diff: string;
  strip?: number;
}

export interface AssertComplianceRequest {
  diff: string;
  checklist?: string[];
  requireTests?: boolean;
  maxFileBytes?: number;
  owner?: string;
  repo?: string;
  ref?: string;
  prLabels?: string[];
  prTitle?: string;
}

export interface FileContentsRequest {
  owner: string;
  repo: string;
  ref: string;
  paths: string[];
}

export interface SelectInstructionPackRequest {
  packId: string;
  owner?: string;
  repo?: string;
  ref?: string;
  mode?: 'merged' | 'org' | 'repo';
}