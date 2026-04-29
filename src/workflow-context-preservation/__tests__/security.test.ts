// Security Tests for Workflow Context Preservation
// Tests data sanitization, file permissions, and audit logging

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { SecurityManager, SecurityConfig, AuditLogEntry } from '../utils/SecurityManager';
import { WorkflowState, CompactedState, Decision, DocumentState } from '../types';

describe('SecurityManager', () => {
  let securityManager: SecurityManager;
  let tempDir: string;
  let auditLogPath: string;

  beforeEach(() => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-test-'));
    auditLogPath = path.join(tempDir, 'audit.log');
    
    const config: Partial<SecurityConfig> = {
      auditLogPath,
      enableDataSanitization: true,
      enableFilePermissions: true,
      enableAuditLogging: true,
      filePermissions: {
        mode: 0o600 // Read/write for owner only
      }
    };
    
    securityManager = new SecurityManager(config);
  });

  afterEach(async () => {
    // Clean up
    await securityManager.close();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('Data Sanitization', () => {
    it('should sanitize sensitive data from workflow state', () => {
      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'requirements',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 1,
          lastUserFeedback: 'My API key is sk-1234567890abcdef1234567890abcdef1234567890abcdef and my email is user@example.com'
        },
        documents: [{
          id: 'doc1',
          name: 'requirements.md',
          path: '/path/to/requirements.md',
          content: 'API Key: AKIA1234567890ABCDEF\nEmail: test@company.com\nPassword: secret123',
          lastModified: new Date(),
          status: 'draft'
        }],
        decisions: [{
          id: 'decision1',
          description: 'Use API key sk-abcdef1234567890abcdef1234567890abcdef1234567890',
          rationale: 'Contact admin@company.com for access',
          timestamp: new Date(),
          impact: 'high',
          category: 'technical'
        }],
        userPreferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: new Date(),
        contextSize: 1000
      };

      const result = securityManager.sanitizeWorkflowState(workflowState);

      // Check that sensitive data was sanitized
      expect(result.sanitizedData.progress.lastUserFeedback).toContain('[REDACTED]');
      expect(result.sanitizedData.documents[0].content).toContain('[REDACTED]');
      expect(result.sanitizedData.decisions[0].description).toContain('[REDACTED]');
      expect(result.sanitizedData.decisions[0].rationale).toContain('[REDACTED]');

      // Check that sanitization was tracked
      expect(result.sanitizedFields.length).toBeGreaterThan(0);
      expect(result.originalSize).toBeGreaterThan(result.sanitizedSize);
    });

    it('should sanitize sensitive data from compacted state', () => {
      const compactedState: CompactedState = {
        id: 'compacted-test',
        essentialData: {
          workflowType: 'spec-creation',
          currentPhase: 'requirements',
          activeTask: 'Define requirements',
          criticalDecisions: [{
            id: 'decision1',
            description: 'API endpoint: https://api.service.com/v1 with key AKIA1234567890ABCDEF',
            rationale: 'Contact support@service.com for issues',
            timestamp: new Date(),
            impact: 'high',
            category: 'technical'
          }],
          documentStates: [{
            id: 'doc1',
            name: 'config.json',
            path: '/config.json',
            content: '{"apiKey": "sk-1234567890abcdef", "email": "admin@company.com"}',
            lastModified: new Date(),
            status: 'draft'
          }],
          nextSteps: ['Contact user@example.com for approval'],
          requirementReferences: []
        },
        compressedContext: '{"credentials": {"password": "secret123", "token": "ghp_1234567890abcdef1234567890abcdef123456"}}',
        reconstructionMetadata: {
          originalSize: 1000,
          compactedSize: 500,
          compressionAlgorithm: 'test',
          preservedComponents: [],
          lostComponents: [],
          reconstructionInstructions: []
        },
        compressionRatio: 0.5,
        timestamp: new Date()
      };

      const result = securityManager.sanitizeCompactedState(compactedState);

      // Check that sensitive data was sanitized
      expect(result.sanitizedData.essentialData.criticalDecisions[0].description).toContain('[REDACTED]');
      expect(result.sanitizedData.essentialData.criticalDecisions[0].rationale).toContain('[REDACTED]');
      expect(result.sanitizedData.essentialData.documentStates[0].content).toContain('[REDACTED]');
      expect(result.sanitizedData.compressedContext).toContain('[REDACTED]');

      // Check that sanitization was tracked
      expect(result.sanitizedFields.length).toBeGreaterThan(0);
    });

    it('should handle empty or null data gracefully', () => {
      const emptyWorkflowState: WorkflowState = {
        id: 'empty-workflow',
        type: 'spec-creation',
        phase: 'requirements',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'not_started',
          approvalStates: {},
          iterationCount: 0
        },
        documents: [],
        decisions: [],
        userPreferences: {
          theme: 'auto',
          language: 'en',
          notifications: false,
          autoSave: false,
          compressionLevel: 'low'
        },
        timestamp: new Date(),
        contextSize: 0
      };

      const result = securityManager.sanitizeWorkflowState(emptyWorkflowState);

      expect(result.sanitizedData).toBeDefined();
      expect(result.removedFields).toEqual([]);
      expect(result.sanitizedFields).toEqual([]);
    });

    it('should not sanitize when sanitization is disabled', () => {
      const configWithoutSanitization: Partial<SecurityConfig> = {
        auditLogPath,
        enableDataSanitization: false,
        enableFilePermissions: false,
        enableAuditLogging: false
      };
      
      const securityManagerNoSanitization = new SecurityManager(configWithoutSanitization);

      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'requirements',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 1,
          lastUserFeedback: 'My API key is sk-1234567890abcdef'
        },
        documents: [],
        decisions: [],
        userPreferences: {
          theme: 'dark',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: new Date(),
        contextSize: 1000
      };

      const result = securityManagerNoSanitization.sanitizeWorkflowState(workflowState);

      // Data should remain unchanged
      expect(result.sanitizedData.progress.lastUserFeedback).toBe('My API key is sk-1234567890abcdef');
      expect(result.sanitizedFields).toEqual([]);
      expect(result.removedFields).toEqual([]);
    });
  });

  describe('File Permissions', () => {
    it('should set secure file permissions', async () => {
      const testFile = path.join(tempDir, 'test-file.json');
      
      // Create a test file
      await fs.promises.writeFile(testFile, '{"test": "data"}');
      
      // Set permissions
      await securityManager.setFilePermissions(testFile);
      
      // Check permissions (Unix-like systems only)
      if (process.platform !== 'win32') {
        const stats = await fs.promises.stat(testFile);
        const permissions = stats.mode & parseInt('777', 8);
        expect(permissions).toBe(0o600);
      }
    });

    it('should validate file permissions', async () => {
      const testFile = path.join(tempDir, 'test-file.json');
      
      // Create a test file with correct permissions
      await fs.promises.writeFile(testFile, '{"test": "data"}');
      await securityManager.setFilePermissions(testFile);
      
      // Validate permissions
      const isValid = await securityManager.validateFilePermissions(testFile);
      expect(isValid).toBe(true);
    });

    it('should detect invalid file permissions', async () => {
      const testFile = path.join(tempDir, 'test-file.json');
      
      // Create a test file with different permissions
      await fs.promises.writeFile(testFile, '{"test": "data"}');
      
      if (process.platform !== 'win32') {
        // Set different permissions
        await fs.promises.chmod(testFile, 0o644);
        
        // Validate permissions (should fail)
        const isValid = await securityManager.validateFilePermissions(testFile);
        expect(isValid).toBe(false);
      }
    });

    it('should handle non-existent files gracefully', async () => {
      const nonExistentFile = path.join(tempDir, 'non-existent.json');
      
      // Should not throw error
      await expect(securityManager.setFilePermissions(nonExistentFile)).rejects.toThrow();
      
      // Validation should return false
      const isValid = await securityManager.validateFilePermissions(nonExistentFile);
      expect(isValid).toBe(false);
    });
  });

  describe('Audit Logging', () => {
    it('should log audit entries', async () => {
      const auditEntry: Omit<AuditLogEntry, 'timestamp'> = {
        operation: 'preservation',
        workflowId: 'test-workflow',
        details: 'Test preservation operation',
        success: true,
        dataSize: 1000,
        filePath: '/test/path'
      };

      await securityManager.logAuditEntry(auditEntry);

      // Check that audit log file was created
      expect(fs.existsSync(auditLogPath)).toBe(true);

      // Read and verify log content
      const logContent = await fs.promises.readFile(auditLogPath, 'utf8');
      const logLines = logContent.trim().split('\n');
      expect(logLines.length).toBe(1);

      const loggedEntry = JSON.parse(logLines[0]);
      expect(loggedEntry.operation).toBe('preservation');
      expect(loggedEntry.workflowId).toBe('test-workflow');
      expect(loggedEntry.success).toBe(true);
      expect(loggedEntry.timestamp).toBeDefined();
    });

    it('should retrieve audit entries with filters', async () => {
      // Log multiple entries
      const entries: Omit<AuditLogEntry, 'timestamp'>[] = [
        {
          operation: 'preservation',
          workflowId: 'workflow-1',
          details: 'Preservation 1',
          success: true
        },
        {
          operation: 'restoration',
          workflowId: 'workflow-1',
          details: 'Restoration 1',
          success: true
        },
        {
          operation: 'preservation',
          workflowId: 'workflow-2',
          details: 'Preservation 2',
          success: false,
          errorMessage: 'Test error'
        }
      ];

      for (const entry of entries) {
        await securityManager.logAuditEntry(entry);
      }

      // Test filtering by workflow ID
      const workflow1Entries = await securityManager.getAuditEntries({ workflowId: 'workflow-1' });
      expect(workflow1Entries.length).toBe(2);
      expect(workflow1Entries.every(e => e.workflowId === 'workflow-1')).toBe(true);

      // Test filtering by operation
      const preservationEntries = await securityManager.getAuditEntries({ operation: 'preservation' });
      expect(preservationEntries.length).toBe(2);
      expect(preservationEntries.every(e => e.operation === 'preservation')).toBe(true);

      // Test filtering by date range
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const recentEntries = await securityManager.getAuditEntries({ startDate: oneHourAgo });
      expect(recentEntries.length).toBe(3);
    });

    it('should generate security reports', async () => {
      // Log some test entries
      const entries: Omit<AuditLogEntry, 'timestamp'>[] = [
        {
          operation: 'preservation',
          workflowId: 'test-workflow',
          details: 'Successful preservation with data sanitization',
          success: true
        },
        {
          operation: 'restoration',
          workflowId: 'test-workflow',
          details: 'Failed restoration attempt',
          success: false,
          errorMessage: 'File not found'
        },
        {
          operation: 'access',
          workflowId: 'test-workflow',
          details: 'Multiple access attempts',
          success: true
        }
      ];

      for (const entry of entries) {
        await securityManager.logAuditEntry(entry);
      }

      const report = await securityManager.generateSecurityReport('test-workflow');

      expect(report.auditEntries.length).toBe(3);
      expect(report.securityEvents.length).toBeGreaterThan(0);
      expect(report.securityEvents.some(event => event.includes('failed operations'))).toBe(true);
    });

    it('should cleanup old audit entries', async () => {
      // Create some old entries by manually writing to the log file
      const oldEntry: AuditLogEntry = {
        timestamp: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000), // 100 days ago
        operation: 'preservation',
        workflowId: 'old-workflow',
        details: 'Old entry',
        success: true
      };

      const recentEntry: AuditLogEntry = {
        timestamp: new Date(),
        operation: 'preservation',
        workflowId: 'recent-workflow',
        details: 'Recent entry',
        success: true
      };

      // Write entries directly to file
      const logContent = JSON.stringify(oldEntry) + '\n' + JSON.stringify(recentEntry) + '\n';
      await fs.promises.writeFile(auditLogPath, logContent);

      // Cleanup entries older than 30 days
      const removedCount = await securityManager.cleanupAuditLog(30);
      expect(removedCount).toBe(1);

      // Verify only recent entry remains
      const remainingEntries = await securityManager.getAuditEntries();
      expect(remainingEntries.length).toBe(1);
      expect(remainingEntries[0].workflowId).toBe('recent-workflow');
    });

    it('should handle missing audit log file gracefully', async () => {
      // Try to get entries when no log file exists
      const entries = await securityManager.getAuditEntries();
      expect(entries).toEqual([]);

      // Try to cleanup when no log file exists
      const removedCount = await securityManager.cleanupAuditLog();
      expect(removedCount).toBe(0);
    });

    it('should not log when audit logging is disabled', async () => {
      const configWithoutAudit: Partial<SecurityConfig> = {
        auditLogPath,
        enableDataSanitization: false,
        enableFilePermissions: false,
        enableAuditLogging: false
      };
      
      const securityManagerNoAudit = new SecurityManager(configWithoutAudit);

      const auditEntry: Omit<AuditLogEntry, 'timestamp'> = {
        operation: 'preservation',
        workflowId: 'test-workflow',
        details: 'Test operation',
        success: true
      };

      await securityManagerNoAudit.logAuditEntry(auditEntry);

      // Audit log file should not be created
      expect(fs.existsSync(auditLogPath)).toBe(false);
    });
  });

  describe('Configuration', () => {
    it('should return security configuration', () => {
      const config = securityManager.getConfig();
      
      expect(config.enableDataSanitization).toBe(true);
      expect(config.enableFilePermissions).toBe(true);
      expect(config.enableAuditLogging).toBe(true);
      expect(config.auditLogPath).toBe(auditLogPath);
      expect(config.filePermissions.mode).toBe(0o600);
    });

    it('should use default configuration when not provided', () => {
      const defaultSecurityManager = new SecurityManager();
      const config = defaultSecurityManager.getConfig();
      
      expect(config.enableDataSanitization).toBe(true);
      expect(config.enableFilePermissions).toBe(true);
      expect(config.enableAuditLogging).toBe(true);
      expect(config.sensitiveDataPatterns.length).toBeGreaterThan(0);
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors gracefully', async () => {
      // Try to set permissions on a directory that doesn't exist
      const nonExistentPath = '/non/existent/path/file.json';
      
      await expect(securityManager.setFilePermissions(nonExistentPath)).rejects.toThrow();
    });

    it('should handle corrupted audit log files', async () => {
      // Write invalid JSON to audit log
      await fs.promises.writeFile(auditLogPath, 'invalid json content\n');
      
      // Should handle gracefully and return empty array
      const entries = await securityManager.getAuditEntries();
      expect(entries).toEqual([]);
    });

    it('should handle mixed valid and invalid audit log entries', async () => {
      // Write mix of valid and invalid entries
      const validEntry = JSON.stringify({
        timestamp: new Date(),
        operation: 'preservation',
        workflowId: 'test',
        details: 'Valid entry',
        success: true
      });
      
      const logContent = 'invalid json\n' + validEntry + '\nanother invalid line\n';
      await fs.promises.writeFile(auditLogPath, logContent);
      
      // Should return only valid entries
      const entries = await securityManager.getAuditEntries();
      expect(entries.length).toBe(1);
      expect(entries[0].workflowId).toBe('test');
    });
  });
});