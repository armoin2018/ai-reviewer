/**
 * Performance Monitoring Middleware
 * Implements comprehensive performance tracking and monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorCode } from '../types/api.js';

// Performance metrics storage
interface PerformanceMetrics {
  responseTime: {
    [endpoint: string]: {
      count: number;
      total: number;
      average: number;
      min: number;
      max: number;
      p95: number[];
    };
  };
  memoryUsage: {
    heapUsed: number;
    heapTotal: number;
    external: number;
    arrayBuffers: number;
  };
  connections: {
    active: number;
    total: number;
    peak: number;
  };
  errors: {
    [code: string]: number;
  };
  uptime: number;
  startTime: number;
}

// Global metrics storage
const metrics: PerformanceMetrics = {
  responseTime: {},
  memoryUsage: { heapUsed: 0, heapTotal: 0, external: 0, arrayBuffers: 0 },
  connections: { active: 0, total: 0, peak: 0 },
  errors: {},
  uptime: 0,
  startTime: Date.now()
};

// SLA thresholds (in milliseconds)
const SLA_THRESHOLDS = {
  RESPONSE_TIME_WARNING: 1500, // 1.5 seconds
  RESPONSE_TIME_ERROR: 2000,   // 2 seconds
  MEMORY_WARNING: 400 * 1024 * 1024, // 400MB
  MEMORY_ERROR: 512 * 1024 * 1024,   // 512MB
  CONNECTIONS_WARNING: 80,     // 80 concurrent
  CONNECTIONS_ERROR: 100       // 100 concurrent (max)
};

/**
 * Performance monitoring middleware
 * Tracks response times and updates connection counts
 */
export const performanceMonitor = (req: Request, res: Response, next: NextFunction) => {
  const start = process.hrtime.bigint();
  const endpoint = `${req.method} ${req.route?.path || req.path}`;
  
  // Track connection start
  metrics.connections.active++;
  metrics.connections.total++;
  if (metrics.connections.active > metrics.connections.peak) {
    metrics.connections.peak = metrics.connections.active;
  }
  
  // Check connection limits
  if (metrics.connections.active > SLA_THRESHOLDS.CONNECTIONS_ERROR) {
    const correlationId = (Array.isArray(req.headers['x-correlation-id']) 
      ? req.headers['x-correlation-id'][0] 
      : req.headers['x-correlation-id']) || 'unknown';
    
    console.warn(`[PERFORMANCE ALERT] [${new Date().toISOString()}] ${correlationId} Connection limit exceeded: ${metrics.connections.active} active connections`);
    
    const error = new Error('Server overloaded - too many concurrent connections');
    (error as any).code = ErrorCode.GITHUB_RATE_LIMIT;
    (error as any).status = 503;
    return next(error);
  }
  
  res.on('finish', () => {
    // Track connection end
    metrics.connections.active--;
    
    // Calculate response time
    const end = process.hrtime.bigint();
    const responseTime = Number(end - start) / 1000000; // Convert to milliseconds
    
    // Update response time metrics
    if (!metrics.responseTime[endpoint]) {
      metrics.responseTime[endpoint] = {
        count: 0,
        total: 0,
        average: 0,
        min: responseTime,
        max: responseTime,
        p95: []
      };
    }
    
    const endpointMetrics = metrics.responseTime[endpoint];
    endpointMetrics.count++;
    endpointMetrics.total += responseTime;
    endpointMetrics.average = endpointMetrics.total / endpointMetrics.count;
    endpointMetrics.min = Math.min(endpointMetrics.min, responseTime);
    endpointMetrics.max = Math.max(endpointMetrics.max, responseTime);
    
    // Track p95 (keep last 100 samples for rolling p95)
    endpointMetrics.p95.push(responseTime);
    if (endpointMetrics.p95.length > 100) {
      endpointMetrics.p95.shift();
    }
    
    // Track errors
    if (res.statusCode >= 400) {
      const errorKey = res.statusCode.toString();
      metrics.errors[errorKey] = (metrics.errors[errorKey] || 0) + 1;
    }
    
    // Performance alerting
    checkPerformanceThresholds(endpoint, responseTime, res.statusCode);
    
    // Log performance data
    const correlationId = (Array.isArray(req.headers['x-correlation-id']) 
      ? req.headers['x-correlation-id'][0] 
      : req.headers['x-correlation-id']) || 'unknown';
    
    console.log(`[PERF] [${new Date().toISOString()}] ${correlationId} ${endpoint} - ${res.statusCode} - ${responseTime.toFixed(2)}ms - Active:${metrics.connections.active}`);
  });
  
  next();
};

/**
 * Check performance thresholds and trigger alerts
 */
function checkPerformanceThresholds(endpoint: string, responseTime: number, statusCode: number) {
  const timestamp = new Date().toISOString();
  
  // Response time alerts
  if (responseTime > SLA_THRESHOLDS.RESPONSE_TIME_ERROR) {
    console.error(`[PERFORMANCE ALERT] [${timestamp}] CRITICAL: ${endpoint} response time ${responseTime.toFixed(2)}ms exceeds ${SLA_THRESHOLDS.RESPONSE_TIME_ERROR}ms threshold`);
  } else if (responseTime > SLA_THRESHOLDS.RESPONSE_TIME_WARNING) {
    console.warn(`[PERFORMANCE ALERT] [${timestamp}] WARNING: ${endpoint} response time ${responseTime.toFixed(2)}ms exceeds ${SLA_THRESHOLDS.RESPONSE_TIME_WARNING}ms threshold`);
  }
  
  // Memory alerts
  const memUsage = process.memoryUsage();
  if (memUsage.heapUsed > SLA_THRESHOLDS.MEMORY_ERROR) {
    console.error(`[PERFORMANCE ALERT] [${timestamp}] CRITICAL: Memory usage ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB exceeds 512MB threshold`);
  } else if (memUsage.heapUsed > SLA_THRESHOLDS.MEMORY_WARNING) {
    console.warn(`[PERFORMANCE ALERT] [${timestamp}] WARNING: Memory usage ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)}MB exceeds 400MB threshold`);
  }
  
  // Connection alerts
  if (metrics.connections.active > SLA_THRESHOLDS.CONNECTIONS_WARNING) {
    console.warn(`[PERFORMANCE ALERT] [${timestamp}] WARNING: ${metrics.connections.active} active connections exceeds ${SLA_THRESHOLDS.CONNECTIONS_WARNING} connection threshold`);
  }
}

/**
 * Update memory metrics
 */
function updateMemoryMetrics() {
  const memUsage = process.memoryUsage();
  metrics.memoryUsage = {
    heapUsed: memUsage.heapUsed,
    heapTotal: memUsage.heapTotal,
    external: memUsage.external,
    arrayBuffers: memUsage.arrayBuffers
  };
  metrics.uptime = Date.now() - metrics.startTime;
}

/**
 * Get performance metrics endpoint
 */
export const getPerformanceMetrics = (req: Request, res: Response) => {
  updateMemoryMetrics();
  
  // Calculate p95 for each endpoint
  const processedMetrics = { ...metrics };
  Object.keys(processedMetrics.responseTime).forEach(endpoint => {
    const p95Samples = [...processedMetrics.responseTime[endpoint].p95];
    if (p95Samples.length > 0) {
      p95Samples.sort((a, b) => a - b);
      const p95Index = Math.ceil(p95Samples.length * 0.95) - 1;
      (processedMetrics.responseTime[endpoint] as any).p95Value = p95Samples[p95Index] || 0;
    }
    // Remove raw p95 array from response
    delete (processedMetrics.responseTime[endpoint] as any).p95;
  });
  
  res.json({
    metrics: processedMetrics,
    thresholds: SLA_THRESHOLDS,
    timestamp: new Date().toISOString(),
    status: getOverallStatus()
  });
};

/**
 * Get health check with performance data
 */
export const getHealthWithPerformance = (req: Request, res: Response) => {
  updateMemoryMetrics();
  
  const overallStatus = getOverallStatus();
  const statusCode = overallStatus === 'healthy' ? 200 : overallStatus === 'degraded' ? 200 : 503;
  
  res.status(statusCode).json({
    ok: statusCode < 400,
    status: overallStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    version: process.env.npm_package_version || '0.9.0',
    environment: process.env.NODE_ENV || 'development',
    performance: {
      connections: {
        active: metrics.connections.active,
        peak: metrics.connections.peak,
        total: metrics.connections.total
      },
      memory: {
        heapUsed: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024),
        usage: Math.round((metrics.memoryUsage.heapUsed / metrics.memoryUsage.heapTotal) * 100)
      }
    }
  });
};

/**
 * Determine overall system health status
 */
function getOverallStatus(): 'healthy' | 'degraded' | 'unhealthy' {
  updateMemoryMetrics();
  
  // Check critical thresholds
  if (metrics.memoryUsage.heapUsed > SLA_THRESHOLDS.MEMORY_ERROR) {
    return 'unhealthy';
  }
  if (metrics.connections.active > SLA_THRESHOLDS.CONNECTIONS_ERROR) {
    return 'unhealthy';
  }
  
  // Check warning thresholds
  if (metrics.memoryUsage.heapUsed > SLA_THRESHOLDS.MEMORY_WARNING) {
    return 'degraded';
  }
  if (metrics.connections.active > SLA_THRESHOLDS.CONNECTIONS_WARNING) {
    return 'degraded';
  }
  
  // Check response time thresholds for any endpoint
  for (const endpoint in metrics.responseTime) {
    const avgResponseTime = metrics.responseTime[endpoint].average;
    if (avgResponseTime > SLA_THRESHOLDS.RESPONSE_TIME_ERROR) {
      return 'unhealthy';
    }
    if (avgResponseTime > SLA_THRESHOLDS.RESPONSE_TIME_WARNING) {
      return 'degraded';
    }
  }
  
  return 'healthy';
}

/**
 * Log aggregation data for analysis
 */
export const generateLogSummary = (req: Request, res: Response) => {
  updateMemoryMetrics();
  
  const summary = {
    timestamp: new Date().toISOString(),
    period: {
      start: new Date(metrics.startTime).toISOString(),
      duration: metrics.uptime
    },
    endpoints: Object.keys(metrics.responseTime).map(endpoint => ({
      endpoint,
      requests: metrics.responseTime[endpoint].count,
      avgResponseTime: Math.round(metrics.responseTime[endpoint].average * 100) / 100,
      minResponseTime: Math.round(metrics.responseTime[endpoint].min * 100) / 100,
      maxResponseTime: Math.round(metrics.responseTime[endpoint].max * 100) / 100
    })),
    errors: metrics.errors,
    performance: {
      peakConnections: metrics.connections.peak,
      totalRequests: metrics.connections.total,
      currentMemoryMB: Math.round(metrics.memoryUsage.heapUsed / 1024 / 1024),
      peakMemoryMB: Math.round(metrics.memoryUsage.heapTotal / 1024 / 1024)
    }
  };
  
  res.json(summary);
};

// Initialize periodic memory tracking
setInterval(updateMemoryMetrics, 30000); // Update every 30 seconds