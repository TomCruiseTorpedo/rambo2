// Performance Monitor Utility
// Provides performance metrics collection and reporting for workflow preservation system
// Requirements: 2.4

export interface PerformanceMetrics {
  operationType: 'preservation' | 'restoration' | 'monitoring' | 'compaction';
  duration: number;
  timestamp: Date;
  dataSize?: number;
  compressionRatio?: number;
  success: boolean;
  errorMessage?: string;
}

export interface PerformanceTargets {
  preservationMaxDuration: number; // < 500ms target
  restorationMaxDuration: number;  // < 1000ms target
  monitoringMaxOverhead: number;   // < 1% target
}

export interface PerformanceReport {
  totalOperations: number;
  averageDuration: number;
  maxDuration: number;
  minDuration: number;
  successRate: number;
  targetsMetPercentage: number;
  recentOperations: PerformanceMetrics[];
  recommendations: string[];
}

/**
 * Performance Monitor for Workflow Preservation System
 * 
 * Collects and analyzes performance metrics to ensure system meets
 * performance targets and provides optimization recommendations.
 */
export class PerformanceMonitor {
  private metrics: PerformanceMetrics[] = [];
  private readonly maxMetricsHistory: number = 1000;
  private readonly targets: PerformanceTargets;

  constructor(targets?: Partial<PerformanceTargets>) {
    this.targets = {
      preservationMaxDuration: targets?.preservationMaxDuration || 500,
      restorationMaxDuration: targets?.restorationMaxDuration || 1000,
      monitoringMaxOverhead: targets?.monitoringMaxOverhead || 1.0
    };
  }

  /**
   * Records a performance metric
   */
  recordMetric(metric: PerformanceMetrics): void {
    this.metrics.push(metric);
    
    // Keep only recent metrics to prevent memory growth
    if (this.metrics.length > this.maxMetricsHistory) {
      this.metrics = this.metrics.slice(-this.maxMetricsHistory);
    }
  }

  /**
   * Measures execution time of an operation
   */
  async measureOperation<T>(
    operationType: PerformanceMetrics['operationType'],
    operation: () => Promise<T>,
    dataSize?: number
  ): Promise<{ result: T; metrics: PerformanceMetrics }> {
    const startTime = performance.now();
    let success = true;
    let errorMessage: string | undefined;
    let result: T;

    try {
      result = await operation();
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metrics: PerformanceMetrics = {
        operationType,
        duration,
        timestamp: new Date(),
        dataSize,
        success,
        errorMessage
      };

      this.recordMetric(metrics);
    }

    return { result: result!, metrics: this.metrics[this.metrics.length - 1] };
  }

  /**
   * Measures synchronous operation execution time
   */
  measureSyncOperation<T>(
    operationType: PerformanceMetrics['operationType'],
    operation: () => T,
    dataSize?: number
  ): { result: T; metrics: PerformanceMetrics } {
    const startTime = performance.now();
    let success = true;
    let errorMessage: string | undefined;
    let result: T;

    try {
      result = operation();
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const endTime = performance.now();
      const duration = endTime - startTime;

      const metrics: PerformanceMetrics = {
        operationType,
        duration,
        timestamp: new Date(),
        dataSize,
        success,
        errorMessage
      };

      this.recordMetric(metrics);
    }

    return { result, metrics: this.metrics[this.metrics.length - 1] };
  }

  /**
   * Gets performance report for a specific operation type
   */
  getPerformanceReport(operationType?: PerformanceMetrics['operationType']): PerformanceReport {
    const relevantMetrics = operationType 
      ? this.metrics.filter(m => m.operationType === operationType)
      : this.metrics;

    if (relevantMetrics.length === 0) {
      return {
        totalOperations: 0,
        averageDuration: 0,
        maxDuration: 0,
        minDuration: 0,
        successRate: 0,
        targetsMetPercentage: 0,
        recentOperations: [],
        recommendations: ['No operations recorded yet']
      };
    }

    const durations = relevantMetrics.map(m => m.duration);
    const successfulOperations = relevantMetrics.filter(m => m.success);
    
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const minDuration = Math.min(...durations);
    const successRate = (successfulOperations.length / relevantMetrics.length) * 100;

    // Calculate how many operations meet performance targets
    const targetsMetCount = relevantMetrics.filter(m => this.meetsPerformanceTarget(m)).length;
    const targetsMetPercentage = (targetsMetCount / relevantMetrics.length) * 100;

    // Get recent operations (last 10)
    const recentOperations = relevantMetrics.slice(-10);

    // Generate recommendations
    const recommendations = this.generateRecommendations(relevantMetrics, operationType);

    return {
      totalOperations: relevantMetrics.length,
      averageDuration,
      maxDuration,
      minDuration,
      successRate,
      targetsMetPercentage,
      recentOperations,
      recommendations
    };
  }

  /**
   * Checks if a metric meets performance targets
   */
  private meetsPerformanceTarget(metric: PerformanceMetrics): boolean {
    if (!metric.success) return false;

    switch (metric.operationType) {
      case 'preservation':
        return metric.duration <= this.targets.preservationMaxDuration;
      case 'restoration':
        return metric.duration <= this.targets.restorationMaxDuration;
      case 'monitoring':
        // For monitoring, we check if overhead is reasonable
        return metric.duration <= 50; // 50ms is reasonable for monitoring operations
      case 'compaction':
        // Compaction should be fast as part of preservation
        return metric.duration <= this.targets.preservationMaxDuration * 0.5;
      default:
        return true;
    }
  }

  /**
   * Generates performance recommendations based on metrics
   */
  private generateRecommendations(
    metrics: PerformanceMetrics[], 
    operationType?: PerformanceMetrics['operationType']
  ): string[] {
    const recommendations: string[] = [];
    
    if (metrics.length === 0) {
      return ['No metrics available for analysis'];
    }

    const durations = metrics.map(m => m.duration);
    const averageDuration = durations.reduce((sum, d) => sum + d, 0) / durations.length;
    const maxDuration = Math.max(...durations);
    const successRate = (metrics.filter(m => m.success).length / metrics.length) * 100;

    // Success rate recommendations
    if (successRate < 95) {
      recommendations.push(`Success rate is ${successRate.toFixed(1)}% - investigate error causes`);
    }

    // Performance target recommendations
    if (operationType === 'preservation' && averageDuration > this.targets.preservationMaxDuration) {
      recommendations.push(`Preservation operations averaging ${averageDuration.toFixed(1)}ms - consider optimizing compaction algorithms`);
    }

    if (operationType === 'restoration' && averageDuration > this.targets.restorationMaxDuration) {
      recommendations.push(`Restoration operations averaging ${averageDuration.toFixed(1)}ms - consider caching or pre-loading optimizations`);
    }

    // Variability recommendations
    const variance = durations.reduce((sum, d) => sum + Math.pow(d - averageDuration, 2), 0) / durations.length;
    const standardDeviation = Math.sqrt(variance);
    
    if (standardDeviation > averageDuration * 0.5) {
      recommendations.push('High performance variability detected - consider consistent data sizes or caching');
    }

    // Data size recommendations
    const metricsWithDataSize = metrics.filter(m => m.dataSize !== undefined);
    if (metricsWithDataSize.length > 0) {
      const avgDataSize = metricsWithDataSize.reduce((sum, m) => sum + (m.dataSize || 0), 0) / metricsWithDataSize.length;
      const avgDurationForDataSize = metricsWithDataSize.reduce((sum, m) => sum + m.duration, 0) / metricsWithDataSize.length;
      
      if (avgDataSize > 50000 && avgDurationForDataSize > 100) {
        recommendations.push('Large data sizes detected - consider implementing progressive loading or chunking');
      }
    }

    // Compression recommendations
    const metricsWithCompression = metrics.filter(m => m.compressionRatio !== undefined);
    if (metricsWithCompression.length > 0) {
      const avgCompressionRatio = metricsWithCompression.reduce((sum, m) => sum + (m.compressionRatio || 0), 0) / metricsWithCompression.length;
      
      if (avgCompressionRatio < 0.5) {
        recommendations.push('Low compression ratios detected - review compaction algorithms for better efficiency');
      }
    }

    // Recent performance trends
    if (metrics.length >= 10) {
      const recentMetrics = metrics.slice(-5);
      const olderMetrics = metrics.slice(-10, -5);
      
      const recentAvg = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
      const olderAvg = olderMetrics.reduce((sum, m) => sum + m.duration, 0) / olderMetrics.length;
      
      if (recentAvg > olderAvg * 1.2) {
        recommendations.push('Performance degradation trend detected - monitor system resources and data growth');
      } else if (recentAvg < olderAvg * 0.8) {
        recommendations.push('Performance improvement trend detected - current optimizations are effective');
      }
    }

    if (recommendations.length === 0) {
      recommendations.push('Performance is within acceptable ranges - continue monitoring');
    }

    return recommendations;
  }

  /**
   * Gets current performance targets
   */
  getPerformanceTargets(): PerformanceTargets {
    return { ...this.targets };
  }

  /**
   * Updates performance targets
   */
  updatePerformanceTargets(newTargets: Partial<PerformanceTargets>): void {
    Object.assign(this.targets, newTargets);
  }

  /**
   * Clears all recorded metrics
   */
  clearMetrics(): void {
    this.metrics = [];
  }

  /**
   * Gets raw metrics for external analysis
   */
  getRawMetrics(): PerformanceMetrics[] {
    return [...this.metrics];
  }

  /**
   * Exports metrics to JSON format
   */
  exportMetrics(): string {
    return JSON.stringify({
      targets: this.targets,
      metrics: this.metrics,
      exportTimestamp: new Date().toISOString()
    }, null, 2);
  }

  /**
   * Imports metrics from JSON format
   */
  importMetrics(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.targets) {
        this.updatePerformanceTargets(data.targets);
      }
      
      if (Array.isArray(data.metrics)) {
        this.metrics = data.metrics.map(m => ({
          ...m,
          timestamp: new Date(m.timestamp)
        }));
      }
    } catch (error) {
      throw new Error(`Failed to import metrics: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}