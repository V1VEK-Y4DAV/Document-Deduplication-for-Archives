/**
 * Performance monitoring utility for tracking slow API calls
 */

interface PerformanceMetrics {
  operation: string;
  duration: number;
  timestamp: number;
  success: boolean;
  error?: string;
}

class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private slowThreshold = 2000; // 2 seconds threshold for slow operations

  /**
   * Track the performance of an async operation
   */
  async track<T>(operation: string, fn: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    let success = true;
    let error: string | undefined = undefined;

    try {
      const result = await fn();
      return result;
    } catch (err) {
      success = false;
      error = err instanceof Error ? err.message : String(err);
      throw err;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;
      
      this.metrics.push({
        operation,
        duration,
        timestamp: Date.now(),
        success,
        error
      });
      
      // Log slow operations
      if (duration > this.slowThreshold) {
        console.warn(`Slow operation detected: ${operation} took ${duration.toFixed(2)}ms`);
      }
    }
  }

  /**
   * Get metrics for slow operations
   */
  getSlowOperations(threshold?: number): PerformanceMetrics[] {
    const thresholdToUse = threshold ?? this.slowThreshold;
    return this.metrics.filter(metric => metric.duration > thresholdToUse);
  }

  /**
   * Get average duration for an operation
   */
  getAverageDuration(operation: string): number {
    const operations = this.metrics.filter(metric => metric.operation === operation);
    if (operations.length === 0) return 0;
    
    const totalDuration = operations.reduce((sum, op) => sum + op.duration, 0);
    return totalDuration / operations.length;
  }

  /**
   * Clear metrics
   */
  clear(): void {
    this.metrics = [];
  }

  /**
   * Get all metrics
   */
  getAllMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }
}

// Export singleton instance
export const performanceMonitor = new PerformanceMonitor();

// Export decorator for easier usage
export function monitorPerformance(operation: string) {
  return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function(...args: any[]) {
      return performanceMonitor.track(operation, () => originalMethod.apply(this, args));
    };
    
    return descriptor;
  };
}