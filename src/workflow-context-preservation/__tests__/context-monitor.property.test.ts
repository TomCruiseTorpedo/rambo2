// Property-based tests for Context Monitor Component
// **Feature: workflow-context-preservation**

import { describe, it, expect, beforeEach, vi } from 'vitest';
import * as fc from 'fast-check';
import { ContextMonitor } from '../components/ContextMonitor';

describe('Context Monitor - Property Tests', () => {
  describe('Property 1: Preservation triggers at threshold', () => {
    it('should automatically trigger preservation when context utilization reaches 95%', () => {
      // **Validates: Requirements 1.1, 2.3**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          fc.integer({ min: 1, max: 100 }), // number of updates before threshold
          (maxCapacity, updatesBefore) => {
            const monitor = new ContextMonitor(maxCapacity);
            let preservationTriggered = false;
            
            // Register callback at 95% threshold
            monitor.registerThresholdCallback(95, () => {
              preservationTriggered = true;
            });
            
            // Update utilization gradually before threshold
            for (let i = 0; i < updatesBefore; i++) {
              const utilizationBeforeThreshold = Math.floor(maxCapacity * 0.94 * (i / updatesBefore));
              monitor.updateUtilization(utilizationBeforeThreshold);
            }
            
            // Preservation should not have triggered yet
            expect(preservationTriggered).toBe(false);
            
            // Update to exactly 95% threshold
            const thresholdSize = Math.ceil(maxCapacity * 0.95);
            monitor.updateUtilization(thresholdSize);
            
            // Preservation should now be triggered
            expect(preservationTriggered).toBe(true);
            expect(monitor.getCurrentUtilization()).toBeGreaterThanOrEqual(95);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should trigger preservation with sufficient buffer for new workflow initiation', () => {
      // **Validates: Requirements 1.1, 2.3**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          (maxCapacity) => {
            const monitor = new ContextMonitor(maxCapacity);
            let preservationTriggered = false;
            
            // Register callback at 95% threshold
            monitor.registerThresholdCallback(95, () => {
              preservationTriggered = true;
            });
            
            // Update to 95% threshold
            const thresholdSize = Math.ceil(maxCapacity * 0.95);
            monitor.updateUtilization(thresholdSize);
            
            // Verify preservation triggered
            expect(preservationTriggered).toBe(true);
            
            // Verify sufficient buffer remains (at least 5% capacity)
            const remainingCapacity = monitor.estimateRemainingCapacity();
            const remainingPercentage = (remainingCapacity / maxCapacity) * 100;
            
            expect(remainingPercentage).toBeGreaterThanOrEqual(4.5); // Allow small rounding tolerance
            expect(remainingCapacity).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should not trigger preservation before reaching threshold', () => {
      // **Validates: Requirements 1.1, 2.3**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          fc.float({ min: Math.fround(0.1), max: Math.fround(0.94) }), // utilization percentage below threshold
          (maxCapacity, utilizationFraction) => {
            const monitor = new ContextMonitor(maxCapacity);
            let preservationTriggered = false;
            
            // Register callback at 95% threshold
            monitor.registerThresholdCallback(95, () => {
              preservationTriggered = true;
            });
            
            // Update to below threshold
            const belowThresholdSize = Math.floor(maxCapacity * utilizationFraction);
            monitor.updateUtilization(belowThresholdSize);
            
            // Preservation should not trigger
            expect(preservationTriggered).toBe(false);
            expect(monitor.getCurrentUtilization()).toBeLessThan(95);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 6: Continuous monitoring during active sessions', () => {
    it('should continuously track and update context utilization levels in real-time', () => {
      // **Validates: Requirements 2.1**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          fc.array(fc.integer({ min: 0, max: 200000 }), { minLength: 5, maxLength: 50 }), // sequence of utilization updates
          (maxCapacity, utilizationSequence) => {
            const monitor = new ContextMonitor(maxCapacity);
            
            // Start monitoring
            monitor.startMonitoring();
            expect(monitor.isActivelyMonitoring()).toBe(true);
            
            // Track all utilization updates
            const recordedUtilizations: number[] = [];
            
            for (const currentSize of utilizationSequence) {
              // Clamp to valid range
              const validSize = Math.min(currentSize, maxCapacity);
              monitor.updateUtilization(validSize);
              
              // Verify utilization is tracked correctly
              const currentUtilization = monitor.getCurrentUtilization();
              const expectedUtilization = (validSize / maxCapacity) * 100;
              
              expect(currentUtilization).toBeCloseTo(expectedUtilization, 1);
              recordedUtilizations.push(currentUtilization);
              
              // Verify remaining capacity is calculated correctly
              const remainingCapacity = monitor.estimateRemainingCapacity();
              const expectedRemaining = maxCapacity - validSize;
              
              expect(remainingCapacity).toBe(expectedRemaining);
            }
            
            // Verify monitoring tracked all updates
            expect(recordedUtilizations.length).toBe(utilizationSequence.length);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain accurate utilization tracking throughout workflow session lifecycle', () => {
      // **Validates: Requirements 2.1**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          fc.integer({ min: 10, max: 100 }), // number of updates
          (maxCapacity, numUpdates) => {
            const monitor = new ContextMonitor(maxCapacity);
            monitor.startMonitoring();
            
            // Simulate gradual context growth during session
            for (let i = 1; i <= numUpdates; i++) {
              const currentSize = Math.floor((maxCapacity * i) / numUpdates);
              monitor.updateUtilization(currentSize);
              
              // Verify accuracy at each step
              const utilization = monitor.getCurrentUtilization();
              const expectedUtilization = (currentSize / maxCapacity) * 100;
              
              expect(utilization).toBeCloseTo(expectedUtilization, 1);
              
              // Verify remaining capacity is always non-negative
              const remaining = monitor.estimateRemainingCapacity();
              expect(remaining).toBeGreaterThanOrEqual(0);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should track utilization when monitoring is active', () => {
      // **Validates: Requirements 2.1**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          fc.integer({ min: 0, max: 200000 }), // currentSize
          (maxCapacity, currentSize) => {
            const monitor = new ContextMonitor(maxCapacity);
            
            // Monitoring should be inactive initially
            expect(monitor.isActivelyMonitoring()).toBe(false);
            
            // Start monitoring
            monitor.startMonitoring();
            expect(monitor.isActivelyMonitoring()).toBe(true);
            
            // Update utilization
            const validSize = Math.min(currentSize, maxCapacity);
            monitor.updateUtilization(validSize);
            
            // Verify tracking works while monitoring is active
            const utilization = monitor.getCurrentUtilization();
            const expectedUtilization = (validSize / maxCapacity) * 100;
            expect(utilization).toBeCloseTo(expectedUtilization, 1);
            
            // Stop monitoring
            monitor.stopMonitoring();
            expect(monitor.isActivelyMonitoring()).toBe(false);
            
            // Utilization should still be readable even when monitoring stopped
            expect(monitor.getCurrentUtilization()).toBeCloseTo(expectedUtilization, 1);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 7: Preparation at warning threshold', () => {
    it('should initiate preparation when context utilization exceeds 90% with automatic preservation at 95%', () => {
      // **Validates: Requirements 2.2**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          (maxCapacity) => {
            const monitor = new ContextMonitor(maxCapacity);
            let preparationInitiated = false;
            let preservationTriggered = false;
            
            // Register callback at 90% for preparation
            monitor.registerThresholdCallback(90, () => {
              preparationInitiated = true;
            });
            
            // Register callback at 95% for preservation
            monitor.registerThresholdCallback(95, () => {
              preservationTriggered = true;
            });
            
            // Update to 90% threshold
            const preparationSize = Math.ceil(maxCapacity * 0.90);
            monitor.updateUtilization(preparationSize);
            
            // Preparation should be initiated
            expect(preparationInitiated).toBe(true);
            expect(preservationTriggered).toBe(false);
            
            // Update to 95% threshold
            const preservationSize = Math.ceil(maxCapacity * 0.95);
            monitor.updateUtilization(preservationSize);
            
            // Preservation should now be triggered
            expect(preservationTriggered).toBe(true);
            
            // Verify sufficient buffer remains for new workflow operations
            const remainingCapacity = monitor.estimateRemainingCapacity();
            const remainingPercentage = (remainingCapacity / maxCapacity) * 100;
            
            expect(remainingPercentage).toBeGreaterThanOrEqual(4.5); // At least ~5% buffer
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should ensure adequate buffer for new workflow initiation after preservation trigger', () => {
      // **Validates: Requirements 2.2**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          (maxCapacity) => {
            const monitor = new ContextMonitor(maxCapacity);
            let preservationTriggered = false;
            
            // Register preservation callback at 95%
            monitor.registerThresholdCallback(95, () => {
              preservationTriggered = true;
            });
            
            // Update to 95% threshold
            const preservationSize = Math.ceil(maxCapacity * 0.95);
            monitor.updateUtilization(preservationSize);
            
            // Verify preservation triggered
            expect(preservationTriggered).toBe(true);
            
            // Verify adequate buffer remains
            const remainingCapacity = monitor.estimateRemainingCapacity();
            
            // Should have at least 5% capacity remaining
            expect(remainingCapacity).toBeGreaterThan(0);
            expect(remainingCapacity).toBeGreaterThanOrEqual(maxCapacity * 0.045); // Allow small tolerance
            
            // Verify percentage calculation
            const utilization = monitor.getCurrentUtilization();
            expect(utilization).toBeGreaterThanOrEqual(95);
            expect(utilization).toBeLessThanOrEqual(100);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle multiple threshold levels correctly', () => {
      // **Validates: Requirements 2.2**
      
      fc.assert(
        fc.property(
          fc.integer({ min: 10000, max: 200000 }), // maxCapacity
          (maxCapacity) => {
            const monitor = new ContextMonitor(maxCapacity);
            const triggeredThresholds: number[] = [];
            
            // Register multiple thresholds
            const thresholds = [80, 85, 90, 95, 99];
            thresholds.forEach(threshold => {
              monitor.registerThresholdCallback(threshold, () => {
                triggeredThresholds.push(threshold);
              });
            });
            
            // Gradually increase utilization
            for (const threshold of thresholds) {
              const size = Math.ceil(maxCapacity * (threshold / 100));
              monitor.updateUtilization(size);
            }
            
            // Verify all thresholds were triggered in order
            expect(triggeredThresholds).toEqual(thresholds);
            
            // Verify final state has adequate buffer
            const remainingCapacity = monitor.estimateRemainingCapacity();
            expect(remainingCapacity).toBeGreaterThanOrEqual(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
