/**
 * Security Middleware
 * Implements comprehensive security controls for the API server
 */

import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import helmet from 'helmet';
import { body, param, query, validationResult } from 'express-validator';
import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';
import { ErrorCode } from '../types/api.js';

// Configure DOMPurify for server-side use
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Rate limiting configuration
 */
export const apiRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: {
    error: {
      code: ErrorCode.GITHUB_RATE_LIMIT,
      message: 'Too many requests, please try again later',
      correlationId: '',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => {
    // Skip rate limiting for health checks
    return req.path === '/healthz';
  }
});

/**
 * Stricter rate limiting for resource-intensive endpoints
 */
export const strictRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // Limit each IP to 20 requests per windowMs
  message: {
    error: {
      code: ErrorCode.GITHUB_RATE_LIMIT,
      message: 'Rate limit exceeded for resource-intensive operations',
      correlationId: '',
      timestamp: new Date().toISOString()
    }
  },
  standardHeaders: true,
  legacyHeaders: false
});

/**
 * Helmet security headers configuration
 */
export const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // For Swagger UI
      scriptSrc: ["'self'"], 
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false, // Disable for API compatibility
  crossOriginResourcePolicy: { policy: "cross-origin" },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Input sanitization middleware
 */
export const sanitizeInput = (req: Request, res: Response, next: NextFunction) => {
  try {
    // Sanitize request body
    if (req.body && typeof req.body === 'object') {
      req.body = sanitizeObject(req.body);
    }
    
    // Sanitize query parameters
    if (req.query) {
      req.query = sanitizeObject(req.query);
    }
    
    // Sanitize route parameters
    if (req.params) {
      req.params = sanitizeObject(req.params);
    }
    
    next();
  } catch (error) {
    const err = new Error('Request sanitization failed');
    (err as any).code = ErrorCode.INVALID_REQUEST_FORMAT;
    (err as any).status = 400;
    next(err);
  }
};

/**
 * Recursively sanitize object properties
 */
function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return purify.sanitize(obj, { ALLOWED_TAGS: [] });
  }
  
  if (typeof obj === 'number' || typeof obj === 'boolean' || obj === null) {
    return obj;
  }
  
  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }
  
  if (typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      const cleanKey = purify.sanitize(key, { ALLOWED_TAGS: [] });
      sanitized[cleanKey] = sanitizeObject(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Request validation error handler
 */
export const handleValidationErrors = (req: Request, res: Response, next: NextFunction) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const correlationId = req.headers['x-correlation-id'] || 'unknown';
    
    const error = new Error(`Validation failed: ${errors.array().map(e => e.msg).join(', ')}`);
    (error as any).code = ErrorCode.INVALID_REQUEST_FORMAT;
    (error as any).status = 400;
    (error as any).details = { validationErrors: errors.array() };
    
    return next(error);
  }
  next();
};

/**
 * Validation rules for load-rules endpoint
 */
export const validateLoadRules = [
  body('owner')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/)
    .withMessage('owner must be a valid GitHub username'),
  body('repo')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-\_\.])*[a-zA-Z0-9]$/)
    .withMessage('repo must be a valid GitHub repository name'),
  body('ref')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('ref must be a valid Git reference'),
  handleValidationErrors
];

/**
 * Validation rules for summarize-rules endpoint
 */
export const validateSummarizeRules = [
  body('markdown')
    .isString()
    .isLength({ min: 1, max: 1000000 })
    .withMessage('markdown must be a non-empty string under 1MB'),
  body('maxItems')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('maxItems must be an integer between 1 and 1000'),
  handleValidationErrors
];

/**
 * Validation rules for normalize-diff endpoint
 */
export const validateNormalizeDiff = [
  body('diff')
    .isString()
    .isLength({ min: 1, max: 10000000 })
    .withMessage('diff must be a non-empty string under 10MB'),
  body('strip')
    .optional()
    .isInt({ min: 0, max: 10 })
    .withMessage('strip must be an integer between 0 and 10'),
  handleValidationErrors
];

/**
 * Validation rules for assert-compliance endpoint  
 */
export const validateAssertCompliance = [
  body('diff')
    .isString()
    .isLength({ min: 1, max: 10000000 })
    .withMessage('diff must be a non-empty string under 10MB'),
  body('checklist')
    .optional()
    .isArray({ max: 1000 })
    .withMessage('checklist must be an array with max 1000 items'),
  body('checklist.*')
    .optional()
    .isString()
    .isLength({ max: 1000 })
    .withMessage('checklist items must be strings under 1000 characters'),
  body('requireTests')
    .optional()
    .isBoolean()
    .withMessage('requireTests must be a boolean'),
  body('maxFileBytes')
    .optional()
    .isInt({ min: 1000, max: 50000000 })
    .withMessage('maxFileBytes must be between 1000 and 50MB'),
  body('owner')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/)
    .withMessage('owner must be a valid GitHub username'),
  body('repo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-\_\.])*[a-zA-Z0-9]$/)
    .withMessage('repo must be a valid GitHub repository name'),
  body('ref')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('ref must be a valid Git reference'),
  body('prLabels')
    .optional()
    .isArray({ max: 50 })
    .withMessage('prLabels must be an array with max 50 items'),
  body('prLabels.*')
    .optional()
    .isString()
    .isLength({ max: 50 })
    .withMessage('prLabels items must be strings under 50 characters'),
  body('prTitle')
    .optional()
    .isString()
    .isLength({ max: 500 })
    .withMessage('prTitle must be under 500 characters'),
  handleValidationErrors
];

/**
 * Validation rules for file-contents endpoint
 */
export const validateFileContents = [
  body('owner')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/)
    .withMessage('owner must be a valid GitHub username'),
  body('repo')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-\_\.])*[a-zA-Z0-9]$/)
    .withMessage('repo must be a valid GitHub repository name'),
  body('ref')
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('ref must be a valid Git reference'),
  body('paths')
    .isArray({ min: 1, max: 100 })
    .withMessage('paths must be an array with 1-100 items'),
  body('paths.*')
    .isString()
    .isLength({ min: 1, max: 500 })
    .matches(/^[a-zA-Z0-9\/\.\-\_\s]+$/)
    .withMessage('paths must contain valid file paths'),
  handleValidationErrors
];

/**
 * Validation rules for select-instruction-pack endpoint
 */
export const validateSelectInstructionPack = [
  body('packId')
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9\-\_]+$/)
    .withMessage('packId must be a valid pack identifier'),
  body('owner')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-])*[a-zA-Z0-9]$/)
    .withMessage('owner must be a valid GitHub username'),
  body('repo')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 100 })
    .matches(/^[a-zA-Z0-9]([a-zA-Z0-9\-\_\.])*[a-zA-Z0-9]$/)
    .withMessage('repo must be a valid GitHub repository name'),
  body('ref')
    .optional()
    .isString()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('ref must be a valid Git reference'),
  body('mode')
    .optional()
    .isIn(['merged', 'org', 'repo'])
    .withMessage('mode must be one of: merged, org, repo'),
  handleValidationErrors
];

/**
 * Audit logging for sensitive operations
 */
export const auditLog = (operation: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] || 'unknown';
    const clientIp = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.get('User-Agent') || 'unknown';
    
    console.log(`[AUDIT] [${new Date().toISOString()}] ${correlationId} ${operation} - IP:${clientIp} UA:${userAgent}`);
    
    // Log response after completion
    res.on('finish', () => {
      console.log(`[AUDIT] [${new Date().toISOString()}] ${correlationId} ${operation} - COMPLETED - Status:${res.statusCode}`);
    });
    
    next();
  };
};

/**
 * HTTPS enforcement middleware (for production)
 */
export const enforceHttps = (req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production' && !req.secure && req.get('x-forwarded-proto') !== 'https') {
    return res.redirect(301, `https://${req.get('host')}${req.url}`);
  }
  next();
};