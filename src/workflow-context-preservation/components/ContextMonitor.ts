// Context Monitor Component
// Continuously tracks context utilization and triggers preservation

import { ContextUtilization, ThresholdCallback } from '../types';

export class ContextMonitor {
  private utilization: ContextUtilization;
  private thresholds: ThresholdCallback[] = [];
  private isMonitoring: boolean = false;

  constructor(maxCapacity: number = 100000) {
    this.utilization = {
      current: 0,
      maximum: maxCapacity,
      percentage: 0,
      estimatedRemaining: maxCapacity
    };
  }

  /**
   * Returns current context usage percentage
   */
  getCurrentUtilization(): number {
    return this.utilization.percentage;
  }

  /**
   * Registers a callback to be triggered when threshold is reached
   */
  registerThresholdCallback(threshold: number, callback: () => void): void {
    this.thresholds.push({
      threshold,
      callback,
      triggered: false
    });
    
    // Sort thresholds by value for efficient checking
    this.thresholds.sort((a, b) => a.threshold - b.threshold);
  }

  /**
   * Calculates available context space
   */
  estimateRemainingCapacity(): number {
    return this.utilization.estimatedRemaining;
  }

  /**
   * Updates current context usage and checks thresholds
   */
  updateUtilization(currentSize: number): void {
    this.utilization.current = currentSize;
    this.utilization.percentage = (currentSize / this.utilization.maximum) * 100;
    this.utilization.estimatedRemaining = this.utilization.maximum - currentSize;

    this.checkThresholds();
  }

  /**
   * Starts continuous monitoring
   */
  startMonitoring(): void {
    this.isMonitoring = true;
  }

  /**
   * Stops continuous monitoring
   */
  stopMonitoring(): void {
    this.isMonitoring = false;
  }

  /**
   * Checks if monitoring is active
   */
  isActivelyMonitoring(): boolean {
    return this.isMonitoring;
  }

  private checkThresholds(): void {
    for (const threshold of this.thresholds) {
      if (!threshold.triggered && this.utilization.percentage >= threshold.threshold) {
        threshold.triggered = true;
        threshold.callback();
      }
    }
  }

  /**
   * Resets all threshold triggers
   */
  resetThresholds(): void {
    this.thresholds.forEach(threshold => {
      threshold.triggered = false;
    });
  }
}