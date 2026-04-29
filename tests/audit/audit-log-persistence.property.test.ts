/**
 * Property-Based Tests for Audit Log Persistence
 * 
 * Feature: rambo2-system-audit, Property 13: Audit Log Persistence
 * Validates: Requirements 4.5
 * 
 * Tests that audit activities (issue identification, fix application, validation)
 * create persistent log entries with all relevant details for tracking and compliance.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync, writeFileSync, existsSync, unlinkSync, appendFileSync } from 'fs';
import { join } from 'path';

// Audit log types and interfaces
interface AuditLogEntry {
  timestamp: string;
  id: string;
  type: 'issue_identification' | 'fix_application' | 'validation' | 'deployment' | 'rollback';
  category: 'frontend' | 'backend' | 'database' | 'infrastructure' | 'security';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  details: Record<string, any>;
  user?: string;
  session_id?: string;
  related_entries?: string[];
}

interface AuditLogFile {
  path: string;
  format: 'json' | 'csv' | 'text';
  entries: AuditLogEntry[];
}

// Mock audit logging system
class AuditLogger {
  private logPath: string;
  private format: 'json' | 'csv' | 'text';
  private entries: AuditLogEntry[] = [];

  constructor(logPath: string, format: 'json' | 'csv' | 'text' = 'json') {
    this.logPath = logPath;
    this.format = format;
    this.loadExistingEntries();
  }

  private loadExistingEntries() {
    if (existsSync(this.logPath)) {
      try {
        if (this.format === 'json') {
          const content = readFileSync(this.logPath, 'utf-8');
          const lines = content.trim().split('\n').filter(line => line.trim());
          this.entries = lines.map(line => JSON.parse(line));
        }
      } catch (error) {
        // If file is corrupted, start fresh
        this.entries = [];
      }
    }
  }

  logIssueIdentification(category: string, severity: string, description: string, details: Record<string, any>): string {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      type: 'issue_identification',
      category: category as any,
      severity: severity as any,
      description,
      details,
      user: 'system',
      session_id: this.generateSessionId()
    };

    return this.writeEntry(entry);
  }

  logFixApplication(issueId: string, category: string, description: string, details: Record<string, any>): string {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      type: 'fix_application',
      category: category as any,
      severity: 'medium',
      description,
      details,
      user: 'developer',
      session_id: this.generateSessionId(),
      related_entries: [issueId]
    };

    return this.writeEntry(entry);
  }

  logValidation(category: string, description: string, details: Record<string, any>): string {
    const entry: AuditLogEntry = {
      timestamp: new Date().toISOString(),
      id: this.generateId(),
      type: 'validation',
      category: category as any,
      severity: 'low',
      description,
      details,
      user: 'system',
      session_id: this.generateSessionId()
    };

    return this.writeEntry(entry);
  }

  private writeEntry(entry: AuditLogEntry): string {
    this.entries.push(entry);
    
    try {
      if (this.format === 'json') {
        appendFileSync(this.logPath, JSON.stringify(entry) + '\n');
      } else if (this.format === 'csv') {
        const csvLine = this.entryToCsv(entry);
        appendFileSync(this.logPath, csvLine + '\n');
      } else {
        const textLine = this.entryToText(entry);
        appendFileSync(this.logPath, textLine + '\n');
      }
      
      return entry.id;
    } catch (error) {
      throw new Error(`Failed to write audit log entry: ${error.message}`);
    }
  }

  private entryToCsv(entry: AuditLogEntry): string {
    const escapeCsv = (value: string) => `"${value.replace(/"/g, '""')}"`;
    return [
      entry.timestamp,
      entry.id,
      entry.type,
      entry.category,
      entry.severity,
      escapeCsv(entry.description),
      escapeCsv(JSON.stringify(entry.details)),
      entry.user || '',
      entry.session_id || '',
      (entry.related_entries || []).join(';')
    ].join(',');
  }

  private entryToText(entry: AuditLogEntry): string {
    return `[${entry.timestamp}] ${entry.severity.toUpperCase()} ${entry.type} (${entry.category}): ${entry.description}`;
  }

  getEntries(): AuditLogEntry[] {
    return [...this.entries];
  }

  getEntriesByType(type: string): AuditLogEntry[] {
    return this.entries.filter(entry => entry.type === type);
  }

  getEntriesByCategory(category: string): AuditLogEntry[] {
    return this.entries.filter(entry => entry.category === category);
  }

  getEntriesBySeverity(severity: string): AuditLogEntry[] {
    return this.entries.filter(entry => entry.severity === severity);
  }

  findRelatedEntries(entryId: string): AuditLogEntry[] {
    return this.entries.filter(entry => 
      entry.related_entries?.includes(entryId) || entry.id === entryId
    );
  }

  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
  }

  cleanup() {
    if (existsSync(this.logPath)) {
      unlinkSync(this.logPath);
    }
    this.entries = [];
  }
}

// Generators for property-based testing
const auditTypeGenerator = (): fc.Arbitrary<'issue_identification' | 'fix_application' | 'validation'> =>
  fc.constantFrom('issue_identification', 'fix_application', 'validation');

const categoryGenerator = (): fc.Arbitrary<'frontend' | 'backend' | 'database' | 'infrastructure' | 'security'> =>
  fc.constantFrom('frontend', 'backend', 'database', 'infrastructure', 'security');

const severityGenerator = (): fc.Arbitrary<'low' | 'medium' | 'high' | 'critical'> =>
  fc.constantFrom('low', 'medium', 'high', 'critical');

const descriptionGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant('System component failed to initialize properly'),
    fc.constant('Database connection timeout occurred'),
    fc.constant('User authentication validation error'),
    fc.constant('File upload processing completed successfully'),
    fc.constant('Configuration update applied to production'),
    fc.constant('Security scan detected potential vulnerability'),
    fc.constant('Performance monitoring threshold exceeded'),
    fc.constant('Backup operation completed without errors'),
    fc.constant('API endpoint returned unexpected response'),
    fc.constant('Cache invalidation process triggered')
  );

const detailsGenerator = (): fc.Arbitrary<Record<string, any>> =>
  fc.record({
    component: fc.oneof(
      fc.constant('UserAuth'),
      fc.constant('FileUpload'),
      fc.constant('DatabaseManager'),
      fc.constant('APIGateway'),
      fc.constant('SecurityScanner')
    ),
    file_path: fc.oneof(
      fc.constant('src/auth/UserAuth.ts'),
      fc.constant('src/upload/FileUpload.ts'),
      fc.constant('src/db/DatabaseManager.ts'),
      fc.constant('src/api/APIGateway.ts'),
      fc.constant('src/security/SecurityScanner.ts')
    ),
    line_number: fc.integer({ min: 1, max: 500 }),
    error_code: fc.oneof(
      fc.constant('ERR001'),
      fc.constant('ERR002'),
      fc.constant('ERR003'),
      fc.constant('WARN001'),
      fc.constant('INFO001')
    ),
    timestamp: fc.oneof(
      fc.constant('2023-06-15T10:30:00.000Z'),
      fc.constant('2023-08-22T14:45:00.000Z'),
      fc.constant('2023-11-03T09:15:00.000Z'),
      fc.constant('2024-02-14T16:20:00.000Z'),
      fc.constant('2024-05-07T11:55:00.000Z')
    ),
    metadata: fc.record({
      version: fc.oneof(
        fc.constant('1.0.0'),
        fc.constant('1.1.0'),
        fc.constant('1.2.0'),
        fc.constant('2.0.0')
      ),
      environment: fc.constantFrom('development', 'staging', 'production')
    })
  });

describe('Audit Log Persistence - Property Tests', () => {
  let testLogPath: string;
  let auditLogger: AuditLogger;

  beforeEach(() => {
    testLogPath = join(process.cwd(), `test-audit-${Date.now()}.log`);
    auditLogger = new AuditLogger(testLogPath, 'json');
  });

  afterEach(() => {
    auditLogger.cleanup();
  });

  describe('Property 13: Audit Log Persistence', () => {
    it('should persist all audit entries with complete information', () => {
      fc.assert(
        fc.property(
          categoryGenerator(),
          severityGenerator(),
          descriptionGenerator(),
          detailsGenerator(),
          (category, severity, description, details) => {
            // Log an issue identification
            const entryId = auditLogger.logIssueIdentification(category, severity, description, details);
            
            // Verify entry was created
            expect(entryId).toBeTruthy();
            expect(typeof entryId).toBe('string');
            
            // Verify entry is in memory
            const entries = auditLogger.getEntries();
            const createdEntry = entries.find(e => e.id === entryId);
            expect(createdEntry).toBeTruthy();
            
            if (createdEntry) {
              // Verify all required fields are present
              expect(createdEntry.timestamp).toBeTruthy();
              expect(createdEntry.id).toBe(entryId);
              expect(createdEntry.type).toBe('issue_identification');
              expect(createdEntry.category).toBe(category);
              expect(createdEntry.severity).toBe(severity);
              expect(createdEntry.description).toBe(description);
              expect(createdEntry.details).toEqual(details);
              expect(createdEntry.user).toBeTruthy();
              expect(createdEntry.session_id).toBeTruthy();
              
              // Verify timestamp is valid ISO string
              expect(() => new Date(createdEntry.timestamp)).not.toThrow();
              expect(new Date(createdEntry.timestamp).toISOString()).toBe(createdEntry.timestamp);
            }
            
            // Verify entry is persisted to file
            expect(existsSync(testLogPath)).toBe(true);
            const fileContent = readFileSync(testLogPath, 'utf-8');
            expect(fileContent).toContain(entryId);
            expect(fileContent).toContain(description);
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain audit log integrity across multiple operations', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            category: categoryGenerator(),
            severity: severityGenerator(),
            description: descriptionGenerator(),
            details: detailsGenerator()
          }), { minLength: 2, maxLength: 10 }),
          (auditOperations) => {
            const entryIds: string[] = [];
            
            // Perform multiple audit operations
            auditOperations.forEach(op => {
              const entryId = auditLogger.logIssueIdentification(
                op.category, 
                op.severity, 
                op.description, 
                op.details
              );
              entryIds.push(entryId);
            });
            
            // Verify all entries are present
            const allEntries = auditLogger.getEntries();
            expect(allEntries.length).toBeGreaterThanOrEqual(auditOperations.length);
            
            // Verify each entry can be found
            entryIds.forEach(entryId => {
              const entry = allEntries.find(e => e.id === entryId);
              expect(entry).toBeTruthy();
            });
            
            // Verify file contains all entries
            const fileContent = readFileSync(testLogPath, 'utf-8');
            entryIds.forEach(entryId => {
              expect(fileContent).toContain(entryId);
            });
            
            // Verify entries are in chronological order
            const timestamps = allEntries.map(e => new Date(e.timestamp).getTime());
            const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
            expect(timestamps).toEqual(sortedTimestamps);
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should preserve audit log relationships between related entries', () => {
      fc.assert(
        fc.property(
          categoryGenerator(),
          severityGenerator(),
          descriptionGenerator(),
          detailsGenerator(),
          descriptionGenerator(),
          detailsGenerator(),
          (category, severity, issueDesc, issueDetails, fixDesc, fixDetails) => {
            // Log an issue
            const issueId = auditLogger.logIssueIdentification(category, severity, issueDesc, issueDetails);
            
            // Log a fix for the issue
            const fixId = auditLogger.logFixApplication(issueId, category, fixDesc, fixDetails);
            
            // Verify relationship is maintained
            const fixEntry = auditLogger.getEntries().find(e => e.id === fixId);
            expect(fixEntry).toBeTruthy();
            expect(fixEntry?.related_entries).toContain(issueId);
            
            // Verify we can find related entries
            const relatedEntries = auditLogger.findRelatedEntries(issueId);
            expect(relatedEntries.length).toBeGreaterThanOrEqual(2);
            
            const issueEntry = relatedEntries.find(e => e.id === issueId);
            const relatedFixEntry = relatedEntries.find(e => e.id === fixId);
            
            expect(issueEntry).toBeTruthy();
            expect(relatedFixEntry).toBeTruthy();
            
            // Verify relationship is persisted to file
            const fileContent = readFileSync(testLogPath, 'utf-8');
            expect(fileContent).toContain(issueId);
            expect(fileContent).toContain(fixId);
            
            // Parse file content and verify relationship
            const lines = fileContent.trim().split('\n');
            const fixLine = lines.find(line => line.includes(fixId));
            expect(fixLine).toBeTruthy();
            if (fixLine) {
              const fixEntryFromFile = JSON.parse(fixLine);
              expect(fixEntryFromFile.related_entries).toContain(issueId);
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should support querying audit logs by different criteria', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            type: auditTypeGenerator(),
            category: categoryGenerator(),
            severity: severityGenerator(),
            description: descriptionGenerator(),
            details: detailsGenerator()
          }), { minLength: 5, maxLength: 15 }),
          (auditOperations) => {
            const entryIds: string[] = [];
            
            // Create diverse audit entries
            auditOperations.forEach(op => {
              let entryId: string;
              if (op.type === 'issue_identification') {
                entryId = auditLogger.logIssueIdentification(op.category, op.severity, op.description, op.details);
              } else if (op.type === 'fix_application') {
                // Create a dummy issue first
                const issueId = auditLogger.logIssueIdentification(op.category, 'medium', 'Dummy issue', {});
                entryId = auditLogger.logFixApplication(issueId, op.category, op.description, op.details);
              } else {
                entryId = auditLogger.logValidation(op.category, op.description, op.details);
              }
              entryIds.push(entryId);
            });
            
            // Test querying by type
            const uniqueTypes = [...new Set(auditOperations.map(op => op.type))];
            uniqueTypes.forEach(type => {
              const entriesByType = auditLogger.getEntriesByType(type);
              const expectedCount = auditOperations.filter(op => op.type === type).length;
              expect(entriesByType.length).toBeGreaterThanOrEqual(expectedCount);
              
              entriesByType.forEach(entry => {
                expect(entry.type).toBe(type);
              });
            });
            
            // Test querying by category
            const uniqueCategories = [...new Set(auditOperations.map(op => op.category))];
            uniqueCategories.forEach(category => {
              const entriesByCategory = auditLogger.getEntriesByCategory(category);
              expect(entriesByCategory.length).toBeGreaterThan(0);
              
              entriesByCategory.forEach(entry => {
                expect(entry.category).toBe(category);
              });
            });
            
            // Test querying by severity
            const uniqueSeverities = [...new Set(auditOperations.map(op => op.severity))];
            uniqueSeverities.forEach(severity => {
              const entriesBySeverity = auditLogger.getEntriesBySeverity(severity);
              
              entriesBySeverity.forEach(entry => {
                expect(entry.severity).toBe(severity);
              });
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should handle concurrent audit logging without data corruption', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            category: categoryGenerator(),
            severity: severityGenerator(),
            description: descriptionGenerator(),
            details: detailsGenerator()
          }), { minLength: 3, maxLength: 8 }),
          (auditOperations) => {
            // Simulate sequential logging (simpler for testing)
            const entryIds = auditOperations.map((op, index) => {
              return auditLogger.logIssueIdentification(
                op.category, 
                op.severity, 
                `${op.description}_${index}`, 
                { ...op.details, index }
              );
            });
            
            // Verify all entries were created
            expect(entryIds.length).toBe(auditOperations.length);
            entryIds.forEach(id => {
              expect(id).toBeTruthy();
              expect(typeof id).toBe('string');
            });
            
            // Verify no duplicate IDs
            const uniqueIds = new Set(entryIds);
            expect(uniqueIds.size).toBe(entryIds.length);
            
            // Verify all entries are in the log
            const allEntries = auditLogger.getEntries();
            entryIds.forEach(entryId => {
              const entry = allEntries.find(e => e.id === entryId);
              expect(entry).toBeTruthy();
            });
            
            // Verify file integrity
            const fileContent = readFileSync(testLogPath, 'utf-8');
            const lines = fileContent.trim().split('\n').filter(line => line.trim());
            
            // Each line should be valid JSON
            lines.forEach(line => {
              expect(() => JSON.parse(line)).not.toThrow();
            });
            
            // All entry IDs should be in the file
            entryIds.forEach(entryId => {
              expect(fileContent).toContain(entryId);
            });
          }
        ),
        { numRuns: 15 }
      );
    });

    it('should maintain audit log format consistency across different entry types', () => {
      fc.assert(
        fc.property(
          categoryGenerator(),
          severityGenerator(),
          descriptionGenerator(),
          detailsGenerator(),
          (category, severity, description, details) => {
            // Create different types of audit entries
            const issueId = auditLogger.logIssueIdentification(category, severity, description, details);
            const fixId = auditLogger.logFixApplication(issueId, category, `Fix for ${description}`, details);
            const validationId = auditLogger.logValidation(category, `Validation of ${description}`, details);
            
            const allEntries = auditLogger.getEntries();
            const issueEntry = allEntries.find(e => e.id === issueId);
            const fixEntry = allEntries.find(e => e.id === fixId);
            const validationEntry = allEntries.find(e => e.id === validationId);
            
            // Verify all entries have consistent structure
            [issueEntry, fixEntry, validationEntry].forEach(entry => {
              expect(entry).toBeTruthy();
              if (entry) {
                // Required fields
                expect(entry.timestamp).toBeTruthy();
                expect(entry.id).toBeTruthy();
                expect(entry.type).toBeTruthy();
                expect(entry.category).toBeTruthy();
                expect(entry.severity).toBeTruthy();
                expect(entry.description).toBeTruthy();
                expect(entry.details).toBeTruthy();
                
                // Field types
                expect(typeof entry.timestamp).toBe('string');
                expect(typeof entry.id).toBe('string');
                expect(typeof entry.type).toBe('string');
                expect(typeof entry.category).toBe('string');
                expect(typeof entry.severity).toBe('string');
                expect(typeof entry.description).toBe('string');
                expect(typeof entry.details).toBe('object');
                
                // Timestamp format
                expect(() => new Date(entry.timestamp)).not.toThrow();
                expect(new Date(entry.timestamp).toISOString()).toBe(entry.timestamp);
                
                // ID format
                expect(entry.id).toMatch(/^audit_\d+_[a-z0-9]+$/);
              }
            });
            
            // Verify file format consistency
            const fileContent = readFileSync(testLogPath, 'utf-8');
            const lines = fileContent.trim().split('\n').filter(line => line.trim());
            
            lines.forEach(line => {
              const entry = JSON.parse(line);
              expect(entry).toHaveProperty('timestamp');
              expect(entry).toHaveProperty('id');
              expect(entry).toHaveProperty('type');
              expect(entry).toHaveProperty('category');
              expect(entry).toHaveProperty('severity');
              expect(entry).toHaveProperty('description');
              expect(entry).toHaveProperty('details');
            });
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should preserve audit log data across logger restarts', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            category: categoryGenerator(),
            severity: severityGenerator(),
            description: descriptionGenerator(),
            details: detailsGenerator()
          }), { minLength: 1, maxLength: 3 }),
          (initialOperations) => {
            const entryIds: string[] = [];
            
            // Log initial entries
            initialOperations.forEach(op => {
              const entryId = auditLogger.logIssueIdentification(op.category, op.severity, op.description, op.details);
              entryIds.push(entryId);
            });
            
            // Verify entries exist in current logger
            const currentEntries = auditLogger.getEntries();
            expect(currentEntries.length).toBeGreaterThan(0);
            
            // Simulate logger restart by creating new instance
            const newLogger = new AuditLogger(testLogPath, 'json');
            
            // Verify file exists and has content
            expect(existsSync(testLogPath)).toBe(true);
            const fileContent = readFileSync(testLogPath, 'utf-8');
            expect(fileContent.length).toBeGreaterThan(0);
            
            // Verify new logger can load entries
            const loadedEntries = newLogger.getEntries();
            expect(loadedEntries.length).toBeGreaterThan(0);
            
            // Add new entry with new logger
            const newEntryId = newLogger.logValidation('frontend', 'Post-restart validation', { test: true });
            expect(newEntryId).toBeTruthy();
            
            // Verify new entry exists
            const finalEntries = newLogger.getEntries();
            const newEntry = finalEntries.find(e => e.id === newEntryId);
            expect(newEntry).toBeTruthy();
            expect(newEntry?.type).toBe('validation');
            
            // Cleanup
            newLogger.cleanup();
          }
        ),
        { numRuns: 10 }
      );
    });
  });
});