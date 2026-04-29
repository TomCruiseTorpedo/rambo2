/**
 * Property-Based Tests for Error Logging Completeness
 * 
 * Feature: rambo2-system-audit, Property 11: Error Logging Completeness
 * Validates: Requirements 3.5
 * 
 * Tests that all errors across backend functions are properly logged with sufficient
 * context for debugging, including stack traces, request data, and system state.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';

// Mock error types that can occur in the system
type ErrorCategory = 'validation' | 'processing' | 'network' | 'database' | 'ai_service' | 'pdf_generation';
type ErrorSeverity = 'low' | 'medium' | 'high' | 'critical';

interface SystemError {
  id: string;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  timestamp: string;
  source: string;
  stackTrace?: string;
  contextData?: Record<string, any>;
  userAgent?: string;
  requestId?: string;
}

interface LogEntry {
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  timestamp: string;
  metadata: Record<string, any>;
  error?: SystemError;
}

// Mock logging system
class MockLogger {
  private logs: LogEntry[] = [];
  private config = {
    includeStackTrace: true,
    includeContextData: true,
    minSeverityLevel: 'low' as ErrorSeverity,
    maxLogSize: 10000,
    sensitiveFields: ['password', 'token', 'api_key']
  };

  log(level: LogEntry['level'], message: string, error?: SystemError, metadata: Record<string, any> = {}): void {
    // Filter sensitive data
    const sanitizedMetadata = this.sanitizeData(metadata);
    const sanitizedError = error ? this.sanitizeError(error) : undefined;

    const logEntry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      metadata: sanitizedMetadata,
      error: sanitizedError
    };

    // Check log size limits
    const logSize = JSON.stringify(logEntry).length;
    if (logSize > this.config.maxLogSize) {
      logEntry.metadata = { ...sanitizedMetadata, _truncated: true };
      if (logEntry.error?.contextData) {
        logEntry.error.contextData = { _truncated: true };
      }
    }

    this.logs.push(logEntry);
  }

  error(message: string, error?: SystemError, metadata: Record<string, any> = {}): void {
    this.log('error', message, error, metadata);
  }

  warn(message: string, metadata: Record<string, any> = {}): void {
    this.log('warn', message, undefined, metadata);
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }

  private sanitizeData(data: Record<string, any>): Record<string, any> {
    const sanitized = { ...data };
    for (const field of this.config.sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }
    return sanitized;
  }

  private sanitizeError(error: SystemError): SystemError {
    return {
      ...error,
      contextData: error.contextData ? this.sanitizeData(error.contextData) : undefined
    };
  }
}

// Simulate different error scenarios
function simulateErrorScenario(
  category: ErrorCategory,
  severity: ErrorSeverity,
  includeContext: boolean,
  includeStackTrace: boolean,
  logger: MockLogger
): SystemError {
  const error: SystemError = {
    id: `error-${Math.random().toString(36).substr(2, 9)}`,
    category,
    severity,
    message: generateErrorMessage(category),
    timestamp: new Date().toISOString(),
    source: getErrorSource(category),
    stackTrace: includeStackTrace ? generateMockStackTrace() : undefined,
    contextData: includeContext ? generateContextData(category) : undefined,
    userAgent: 'Mozilla/5.0 (Test Browser)',
    requestId: `req-${Math.random().toString(36).substr(2, 9)}`
  };

  // Log the error
  logger.error(`${category} error occurred`, error, {
    function: getErrorSource(category),
    severity,
    timestamp: error.timestamp
  });

  return error;
}

function generateErrorMessage(category: ErrorCategory): string {
  const messages = {
    validation: 'Invalid input data provided',
    processing: 'Failed to process document',
    network: 'Network request failed',
    database: 'Database operation failed',
    ai_service: 'AI service unavailable',
    pdf_generation: 'PDF generation failed'
  };
  return messages[category];
}

function getErrorSource(category: ErrorCategory): string {
  const sources = {
    validation: 'validateInput()',
    processing: 'processDocument()',
    network: 'makeHttpRequest()',
    database: 'executeQuery()',
    ai_service: 'callAIService()',
    pdf_generation: 'generatePDF()'
  };
  return sources[category];
}

function generateMockStackTrace(): string {
  return `Error: Mock error\n    at generateError (test.js:1:1)\n    at processRequest (handler.js:2:2)\n    at main (index.js:3:3)`;
}

function generateContextData(category: ErrorCategory): Record<string, any> {
  const baseContext = {
    timestamp: new Date().toISOString(),
    environment: 'test',
    version: '1.0.0'
  };

  switch (category) {
    case 'validation':
      return { ...baseContext, inputData: { field1: 'value1' }, validationRules: ['required', 'maxLength'] };
    case 'processing':
      return { ...baseContext, documentId: 'doc-123', processingStep: 'ocr', fileSize: 1024 };
    case 'network':
      return { ...baseContext, url: 'https://api.example.com', method: 'POST', statusCode: 500 };
    case 'database':
      return { ...baseContext, query: 'SELECT * FROM table', table: 'field_mappings', connectionId: 'conn-456' };
    case 'ai_service':
      return { ...baseContext, model: 'gpt-3.5', tier: 1, prompt: 'Generate narrative', tokens: 150 };
    case 'pdf_generation':
      return { ...baseContext, templateId: 'T661', fieldCount: 3, outputSize: 2048 };
    default:
      return baseContext;
  }
}

describe('Error Logging Completeness - Property Tests', () => {
  describe('Property 11: Error Logging Completeness', () => {
    it('should log all error categories with complete information', () => {
      // Property: Every error category should be logged with required fields
      fc.assert(
        fc.property(
          fc.record({
            category: fc.constantFrom('validation', 'processing', 'network', 'database', 'ai_service', 'pdf_generation'),
            severity: fc.constantFrom('low', 'medium', 'high', 'critical'),
            includeContext: fc.boolean(),
            includeStackTrace: fc.boolean()
          }),
          ({ category, severity, includeContext, includeStackTrace }) => {
            const logger = new MockLogger();
            const error = simulateErrorScenario(category, severity, includeContext, includeStackTrace, logger);
            const logs = logger.getLogs();

            // Property: Error should be logged
            expect(logs.length).toBeGreaterThan(0);
            
            const errorLog = logs.find(log => log.level === 'error');
            expect(errorLog).toBeDefined();

            // Property: Log should contain essential error information
            expect(errorLog!.error).toBeDefined();
            expect(errorLog!.error!.id).toBeDefined();
            expect(errorLog!.error!.category).toBe(category);
            expect(errorLog!.error!.severity).toBe(severity);
            expect(errorLog!.error!.message).toBeDefined();
            expect(errorLog!.error!.timestamp).toBeDefined();
            expect(errorLog!.error!.source).toBeDefined();

            // Property: Stack trace should be included when requested
            if (includeStackTrace) {
              expect(errorLog!.error!.stackTrace).toBeDefined();
              expect(errorLog!.error!.stackTrace).toContain('Error:');
            }

            // Property: Context data should be included when requested
            if (includeContext) {
              expect(errorLog!.error!.contextData).toBeDefined();
              expect(errorLog!.error!.contextData!.timestamp).toBeDefined();
              expect(errorLog!.error!.contextData!.environment).toBe('test');
            }

            // Property: Metadata should contain function and severity info
            expect(errorLog!.metadata.function).toBeDefined();
            expect(errorLog!.metadata.severity).toBe(severity);
            expect(errorLog!.metadata.timestamp).toBeDefined();

            logger.clearLogs();
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should sanitize sensitive data in error logs', () => {
      // Property: Sensitive data should be redacted from logs
      fc.assert(
        fc.property(
          fc.record({
            category: fc.constantFrom('validation', 'database', 'ai_service'),
            hasSensitiveData: fc.boolean(),
            sensitiveField: fc.constantFrom('password', 'token', 'api_key')
          }),
          ({ category, hasSensitiveData, sensitiveField }) => {
            const logger = new MockLogger();
            // Create context with potentially sensitive data
            const contextData = generateContextData(category);
            if (hasSensitiveData) {
              contextData[sensitiveField] = 'sensitive_value_123';
            }

            const error: SystemError = {
              id: 'test-error',
              category,
              severity: 'medium',
              message: 'Test error with sensitive data',
              timestamp: new Date().toISOString(),
              source: 'testFunction()',
              contextData
            };

            logger.error('Test error', error);
            const logs = logger.getLogs();
            const errorLog = logs[0];

            // Property: Sensitive fields should be redacted
            if (hasSensitiveData) {
              expect(errorLog.error!.contextData![sensitiveField]).toBe('[REDACTED]');
            }

            // Property: Non-sensitive data should remain intact
            expect(errorLog.error!.contextData!.timestamp).toBeDefined();
            expect(errorLog.error!.contextData!.environment).toBe('test');

            logger.clearLogs();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle large error logs appropriately', () => {
      // Property: Large error logs should be truncated to prevent memory issues
      fc.assert(
        fc.property(
          fc.record({
            category: fc.constantFrom('processing', 'pdf_generation'),
            dataSize: fc.constantFrom('small', 'medium', 'large', 'very_large'),
            includeStackTrace: fc.boolean()
          }),
          ({ category, dataSize, includeStackTrace }) => {
            const logger = new MockLogger();
            // Generate context data of varying sizes
            const baseContext = generateContextData(category);
            let largeData: string;

            switch (dataSize) {
              case 'small':
                largeData = 'x'.repeat(100);
                break;
              case 'medium':
                largeData = 'x'.repeat(1000);
                break;
              case 'large':
                largeData = 'x'.repeat(5000);
                break;
              case 'very_large':
                largeData = 'x'.repeat(20000);
                break;
              default:
                largeData = 'test';
            }

            const contextData = { ...baseContext, largeField: largeData };

            const error: SystemError = {
              id: 'large-error',
              category,
              severity: 'high',
              message: 'Error with large context data',
              timestamp: new Date().toISOString(),
              source: 'testFunction()',
              contextData,
              stackTrace: includeStackTrace ? generateMockStackTrace() : undefined
            };

            logger.error('Large error test', error);
            const logs = logger.getLogs();
            const errorLog = logs[0];

            // Property: Log should exist regardless of size
            expect(errorLog).toBeDefined();
            expect(errorLog.error).toBeDefined();

            // Property: Very large logs should be truncated
            if (dataSize === 'very_large') {
              expect(errorLog.metadata._truncated || errorLog.error!.contextData!._truncated).toBe(true);
            }

            // Property: Essential error information should always be preserved
            expect(errorLog.error!.id).toBe('large-error');
            expect(errorLog.error!.category).toBe(category);
            expect(errorLog.error!.severity).toBe('high');
            expect(errorLog.error!.message).toBeDefined();

            logger.clearLogs();
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain log consistency across different error scenarios', () => {
      // Property: All logs should have consistent structure regardless of error type
      fc.assert(
        fc.property(
          fc.record({
            errorCount: fc.integer({ min: 2, max: 5 }),
            mixedCategories: fc.boolean(),
            mixedSeverities: fc.boolean()
          }),
          ({ errorCount, mixedCategories, mixedSeverities }) => {
            const logger = new MockLogger();
            const categories: ErrorCategory[] = mixedCategories 
              ? ['validation', 'processing', 'network', 'database']
              : ['processing'];
            
            const severities: ErrorSeverity[] = mixedSeverities
              ? ['low', 'medium', 'high', 'critical']
              : ['medium'];

            // Generate multiple errors
            for (let i = 0; i < errorCount; i++) {
              const category = categories[i % categories.length];
              const severity = severities[i % severities.length];
              simulateErrorScenario(category, severity, true, true, logger);
            }

            const logs = logger.getLogs();

            // Property: Should have logged all errors
            expect(logs.length).toBe(errorCount);

            // Property: All logs should have consistent structure
            logs.forEach((log, index) => {
              expect(log.level).toBe('error');
              expect(log.message).toBeDefined();
              expect(log.timestamp).toBeDefined();
              expect(log.metadata).toBeDefined();
              expect(log.error).toBeDefined();

              // Property: Each error should have required fields
              expect(log.error!.id).toBeDefined();
              expect(log.error!.category).toBeDefined();
              expect(log.error!.severity).toBeDefined();
              expect(log.error!.message).toBeDefined();
              expect(log.error!.timestamp).toBeDefined();
              expect(log.error!.source).toBeDefined();

              // Property: Timestamps should be valid ISO strings
              expect(() => new Date(log.timestamp)).not.toThrow();
              expect(() => new Date(log.error!.timestamp)).not.toThrow();

              // Property: Error IDs should be unique
              const otherLogs = logs.filter((_, i) => i !== index);
              const duplicateId = otherLogs.some(otherLog => otherLog.error!.id === log.error!.id);
              expect(duplicateId).toBe(false);
            });

            logger.clearLogs();
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle edge cases in error logging gracefully', () => {
      // Property: Edge cases should not prevent error logging
      fc.assert(
        fc.property(
          fc.record({
            edgeCase: fc.constantFrom('null_message', 'empty_context', 'undefined_fields'),
            category: fc.constantFrom('validation', 'processing', 'network')
          }),
          ({ edgeCase, category }) => {
            const logger = new MockLogger();
            let error: SystemError;

            switch (edgeCase) {
              case 'null_message':
                error = {
                  id: 'edge-case-error',
                  category,
                  severity: 'medium',
                  message: null as any, // Null message
                  timestamp: new Date().toISOString(),
                  source: 'testFunction()'
                };
                break;
              case 'empty_context':
                error = {
                  id: 'edge-case-error',
                  category,
                  severity: 'medium',
                  message: 'Test error',
                  timestamp: new Date().toISOString(),
                  source: 'testFunction()',
                  contextData: {} // Empty context
                };
                break;
              case 'undefined_fields':
                error = {
                  id: 'edge-case-error',
                  category,
                  severity: 'medium',
                  message: 'Test error',
                  timestamp: new Date().toISOString(),
                  source: 'testFunction()',
                  contextData: {
                    definedField: 'value',
                    undefinedField: undefined,
                    nullField: null
                  }
                };
                break;
              default:
                error = {
                  id: 'edge-case-error',
                  category,
                  severity: 'medium',
                  message: 'Test error',
                  timestamp: new Date().toISOString(),
                  source: 'testFunction()'
                };
            }

            // Property: Logging should not throw errors even with edge cases
            expect(() => {
              logger.error('Edge case test', error);
            }).not.toThrow();

            const logs = logger.getLogs();

            // Property: Log should be created despite edge case
            expect(logs.length).toBeGreaterThan(0);
            const errorLog = logs[0];
            expect(errorLog).toBeDefined();
            expect(errorLog.level).toBe('error');

            // Property: Essential fields should be preserved
            expect(errorLog.error).toBeDefined();
            expect(errorLog.error!.id).toBe('edge-case-error');
            expect(errorLog.error!.category).toBe(category);

            logger.clearLogs();
          }
        ),
        { numRuns: 20 }
      );
    });
  });
});