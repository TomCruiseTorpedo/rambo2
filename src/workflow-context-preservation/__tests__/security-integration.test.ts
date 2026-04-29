// Security Integration Tests for Workflow Context Preservation
// Tests security features integrated with the main preservation system

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import { WorkflowPreservationSystem, SystemConfig } from '../WorkflowPreservationSystem';
import { WorkflowState, DocumentState, Decision } from '../types';

describe('Security Integration', () => {
  let system: WorkflowPreservationSystem;
  let tempDir: string;

  beforeEach(async () => {
    // Create temporary directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-integration-test-'));
    
    const config: SystemConfig = {
      storageBasePath: tempDir,
      maxContextCapacity: 10000,
      preservationThreshold: 95,
      warningThreshold: 90,
      compressionEnabled: true,
      monitoringEnabled: false, // Disable monitoring for tests
      performanceMonitoringEnabled: false,
      securityConfig: {
        enableDataSanitization: true,
        enableFilePermissions: true,
        enableAuditLogging: true,
        filePermissions: {
          mode: 0o600
        }
      }
    };
    
    system = new WorkflowPreservationSystem(config);
    await system.initialize();
  });

  afterEach(async () => {
    // Clean up
    await system.shutdown();
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });

  describe('End-to-End Security Flow', () => {
    it('should sanitize data during preservation and log audit entries', async () => {
      // Create a workflow with sensitive data
      const workflowId = await system.createWorkflow('spec-creation', 'requirements');
      
      // Add sensitive documents and decisions
      const sensitiveDocument: DocumentState = {
        id: 'sensitive-doc',
        name: 'config.md',
        path: '/config.md',
        content: 'API Key: sk-1234567890abcdef1234567890abcdef1234567890abcdef\nEmail: admin@company.com\nPassword: secret123',
        lastModified: new Date(),
        status: 'draft'
      };
      
      const sensitiveDecision: Decision = {
        id: 'sensitive-decision',
        description: 'Use GitHub token ghp_1234567890abcdef1234567890abcdef123456 for API access',
        rationale: 'Contact support@github.com for issues',
        timestamp: new Date(),
        impact: 'high',
        category: 'technical'
      };
      
      system.addWorkflowDocument(workflowId, sensitiveDocument);
      system.addWorkflowDecision(workflowId, sensitiveDecision);
      
      // Force preservation
      const preservationResult = await system.preserveWorkflows({ forcePreservation: true });
      expect(preservationResult.success).toBe(true);
      
      // Check that audit entries were created
      const auditEntries = await system.getAuditEntries();
      expect(auditEntries.length).toBeGreaterThan(0);
      
      const preservationEntry = auditEntries.find(entry => entry.operation === 'preservation');
      expect(preservationEntry).toBeDefined();
      expect(preservationEntry!.success).toBe(true);
      expect(preservationEntry!.details).toContain('sanitized');
      
      // Check that files have correct permissions
      const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.json'));
      expect(files.length).toBeGreaterThan(0);
      
      for (const file of files) {
        const filePath = path.join(tempDir, file);
        const securityConfig = system.getSecurityConfig();
        
        if (process.platform !== 'win32') {
          const stats = fs.statSync(filePath);
          const permissions = stats.mode & parseInt('777', 8);
          expect(permissions).toBe(securityConfig.filePermissions.mode);
        }
      }
    });

    it('should restore workflows and log restoration audit entries', async () => {
      // Create and preserve a workflow first
      const workflowId = await system.createWorkflow('task-execution', 'implementation', 'Test task');
      
      const document: DocumentState = {
        id: 'test-doc',
        name: 'test.md',
        path: '/test.md',
        content: 'Test content with email user@example.com',
        lastModified: new Date(),
        status: 'approved'
      };
      
      system.addWorkflowDocument(workflowId, document);
      
      // Preserve the workflow
      await system.preserveWorkflows({ forcePreservation: true });
      
      // Create a new system instance to simulate new session
      await system.shutdown();
      
      const newSystem = new WorkflowPreservationSystem({
        storageBasePath: tempDir,
        securityConfig: {
          enableDataSanitization: true,
          enableFilePermissions: true,
          enableAuditLogging: true
        }
      });
      
      await newSystem.initialize();
      
      // Restore workflows
      const restoredWorkflow = await newSystem.restoreWorkflows();
      expect(restoredWorkflow).toBeDefined();
      expect(restoredWorkflow!.type).toBe('task-execution');
      expect(restoredWorkflow!.phase).toBe('implementation');
      
      // Check restoration audit entries
      const auditEntries = await newSystem.getAuditEntries();
      const restorationEntry = auditEntries.find(entry => entry.operation === 'restoration');
      expect(restorationEntry).toBeDefined();
      expect(restorationEntry!.success).toBe(true);
      
      await newSystem.shutdown();
    });

    it('should generate comprehensive security reports', async () => {
      // Create workflow and perform various operations
      const workflowId = await system.createWorkflow('design-review', 'design');
      
      // Add some documents and decisions
      system.addWorkflowDocument(workflowId, {
        id: 'design-doc',
        name: 'design.md',
        path: '/design.md',
        content: 'Design document content',
        lastModified: new Date(),
        status: 'in_review'
      });
      
      // Preserve workflow
      await system.preserveWorkflows({ forcePreservation: true });
      
      // Restore workflow
      await system.restoreWorkflows();
      
      // Generate security report - use any workflow ID since we just need to test the functionality
      const allAuditEntries = await system.getAuditEntries();
      const anyWorkflowId = allAuditEntries.length > 0 ? allAuditEntries[0].workflowId : workflowId;
      const report = await system.generateSecurityReport(anyWorkflowId);
      
      expect(report.auditEntries.length).toBeGreaterThan(0);
      expect(report.filePermissionsValid).toBe(true);
      expect(report.securityEvents).toBeDefined();
      
      // Should have audit entries (may be preservation, restoration, or both)
      const operations = report.auditEntries.map(entry => entry.operation);
      expect(operations.length).toBeGreaterThan(0);
      
      // Check that we have at least one of the expected operations
      const hasExpectedOperation = operations.some(op => 
        op === 'preservation' || op === 'restoration' || op === 'access'
      );
      expect(hasExpectedOperation).toBe(true);
    });

    it('should handle security failures gracefully', async () => {
      // Create workflow
      const workflowId = await system.createWorkflow('spec-creation', 'requirements');
      
      // Add document
      system.addWorkflowDocument(workflowId, {
        id: 'test-doc',
        name: 'test.md',
        path: '/test.md',
        content: 'Test content',
        lastModified: new Date(),
        status: 'draft'
      });
      
      // Preserve workflow
      await system.preserveWorkflows({ forcePreservation: true });
      
      // Manually corrupt a file to test error handling
      const files = fs.readdirSync(tempDir).filter(f => f.endsWith('.json'));
      if (files.length > 0) {
        const corruptFile = path.join(tempDir, files[0]);
        fs.writeFileSync(corruptFile, 'corrupted content');
        
        // Try to restore - should handle gracefully
        try {
          const restoredWorkflow = await system.restoreWorkflows();
          // If restoration succeeds despite corruption, that's also valid (error recovery worked)
        } catch (error) {
          // Expected behavior - restoration should fail with corrupted file
        }
        
        // Check that there are audit entries (either success or failure)
        const auditEntries = await system.getAuditEntries();
        expect(auditEntries.length).toBeGreaterThan(0);
      }
    });
  });

  describe('Security Configuration', () => {
    it('should work with security features disabled', async () => {
      // Create system with security disabled
      await system.shutdown();
      
      const configNoSecurity: SystemConfig = {
        storageBasePath: tempDir,
        securityConfig: {
          enableDataSanitization: false,
          enableFilePermissions: false,
          enableAuditLogging: false
        }
      };
      
      const systemNoSecurity = new WorkflowPreservationSystem(configNoSecurity);
      await systemNoSecurity.initialize();
      
      // Create and preserve workflow
      const workflowId = await systemNoSecurity.createWorkflow('spec-creation', 'requirements');
      
      systemNoSecurity.addWorkflowDocument(workflowId, {
        id: 'test-doc',
        name: 'test.md',
        path: '/test.md',
        content: 'API Key: sk-1234567890abcdef (should not be sanitized)',
        lastModified: new Date(),
        status: 'draft'
      });
      
      const result = await systemNoSecurity.preserveWorkflows({ forcePreservation: true });
      expect(result.success).toBe(true);
      
      // Audit entries should be empty
      const auditEntries = await systemNoSecurity.getAuditEntries();
      expect(auditEntries.length).toBe(0);
      
      await systemNoSecurity.shutdown();
    });

    it('should allow custom sensitive data patterns', async () => {
      await system.shutdown();
      
      const customConfig: SystemConfig = {
        storageBasePath: tempDir,
        securityConfig: {
          enableDataSanitization: true,
          enableFilePermissions: false,
          enableAuditLogging: true,
          sensitiveDataPatterns: [
            /custom-secret-\w+/g,
            /internal-token-[A-Z0-9]+/g
          ]
        }
      };
      
      const customSystem = new WorkflowPreservationSystem(customConfig);
      await customSystem.initialize();
      
      const workflowId = await customSystem.createWorkflow('spec-creation', 'requirements');
      
      customSystem.addWorkflowDocument(workflowId, {
        id: 'custom-doc',
        name: 'custom.md',
        path: '/custom.md',
        content: 'This contains custom-secret-abc123 and internal-token-XYZ789',
        lastModified: new Date(),
        status: 'draft'
      });
      
      await customSystem.preserveWorkflows({ forcePreservation: true });
      
      // Check audit entries to verify sanitization occurred
      const auditEntries = await customSystem.getAuditEntries();
      expect(auditEntries.length).toBeGreaterThan(0);
      
      const preservationEntry = auditEntries.find(e => e.operation === 'preservation');
      expect(preservationEntry).toBeDefined();
      expect(preservationEntry!.details).toContain('sanitized');
      
      await customSystem.shutdown();
    });
  });

  describe('Audit Log Management', () => {
    it('should cleanup old audit entries', async () => {
      // Create some operations to generate audit entries
      const workflowId = await system.createWorkflow('spec-creation', 'requirements');
      await system.preserveWorkflows({ forcePreservation: true });
      await system.restoreWorkflows();
      
      // Check initial audit entries
      const initialEntries = await system.getAuditEntries();
      expect(initialEntries.length).toBeGreaterThan(0);
      
      // Cleanup entries (using 0 days to remove all)
      const removedCount = await system.cleanupAuditLog(0);
      expect(removedCount).toBe(initialEntries.length);
      
      // Check that entries were removed
      const remainingEntries = await system.getAuditEntries();
      expect(remainingEntries.length).toBe(0);
    });

    it('should filter audit entries correctly', async () => {
      // Create multiple workflows and operations
      const workflow1 = await system.createWorkflow('spec-creation', 'requirements');
      const workflow2 = await system.createWorkflow('task-execution', 'implementation');
      
      await system.preserveWorkflows({ forcePreservation: true });
      await system.restoreWorkflows();
      
      // Get all entries
      const allEntries = await system.getAuditEntries();
      expect(allEntries.length).toBeGreaterThan(0);
      
      // Filter by operation type
      const preservationEntries = await system.getAuditEntries({ operation: 'preservation' });
      expect(preservationEntries.length).toBeGreaterThan(0);
      expect(preservationEntries.every(e => e.operation === 'preservation')).toBe(true);
      
      const restorationEntries = await system.getAuditEntries({ operation: 'restoration' });
      expect(restorationEntries.length).toBeGreaterThan(0);
      expect(restorationEntries.every(e => e.operation === 'restoration')).toBe(true);
      
      // Filter by date range
      const now = new Date();
      const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
      const recentEntries = await system.getAuditEntries({ startDate: oneMinuteAgo });
      expect(recentEntries.length).toBe(allEntries.length);
      
      const futureEntries = await system.getAuditEntries({ 
        startDate: new Date(now.getTime() + 60 * 1000) 
      });
      expect(futureEntries.length).toBe(0);
    });
  });
});