// Unit tests for ErrorHandler
// Tests storage failure recovery, corrupted state file handling, and missing preserved state scenarios

import { ErrorHandler, ErrorType, ErrorContext, WorkflowPreservationError } from '../utils/ErrorHandler';
import { WorkflowState, CompactedState, EssentialData, ReconstructionMetadata } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Test storage path
const TEST_STORAGE_PATH = '.kiro/state/workflows/test-error-handling';

describe('ErrorHandler', () => {
  let errorHandler: ErrorHandler;

  // Helper function to create a test workflow state
  const createTestWorkflowState = (id: string = 'test-workflow'): WorkflowState => {
    return {
      id,
      type: 'spec-creation',
      phase: 'requirements',
      currentTask: 'Write requirements document',
      progress: {
        completedTasks: [],
        currentTaskStatus: 'in_progress',
        approvalStates: {},
        iterationCount: 1
      },
      documents: [],
      decisions: [
        {
          id: 'decision-1',
          description: 'Use TypeScript for implementation',
          rationale: 'Better type safety and developer experience',
          timestamp: new Date(),
          impact: 'high',
          category: 'technical'
        }
      ],
      userPreferences: {
        theme: 'auto',
        language: 'en',
        notifications: true,
        autoSave: true,
        compressionLevel: 'medium'
      },
      timestamp: new Date(),
      contextSize: 5000
    };
  };

  // Helper function to create a test compacted state
  const createTestCompactedState = (id: string = 'test-state'): CompactedState => {
    const essentialData: EssentialData = {
      workflowType: 'spec-creation',
      currentPhase: 'requirements',
      activeTask: 'Write requirements document',
      criticalDecisions: [],
      documentStates: [],
      nextSteps: ['Complete requirements', 'Get user approval'],
      requirementReferences: ['Requirements 1.1', 'Requirements 1.2']
    };

    const reconstructionMetadata: ReconstructionMetadata = {
      originalSize: 5000,
      compactedSize: 1000,
      compressionAlgorithm: 'intelligent-prioritization',
      preservedComponents: ['workflowType', 'currentPhase', 'activeTask'],
      lostComponents: ['verbose explanations'],
      reconstructionInstructions: ['Restore workflow type', 'Set current phase']
    };

    return {
      id: `compacted-${id}-${Date.now()}`,
      essentialData,
      compressedContext: JSON.stringify({ additionalInfo: 'test context' }),
      reconstructionMetadata,
      compressionRatio: 0.2,
      timestamp: new Date()
    };
  };

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
    
    errorHandler = new ErrorHandler(TEST_STORAGE_PATH);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  describe('Storage Failure Recovery', () => {
    it('should retry failed operations with exponential backoff', async () => {
      let attemptCount = 0;
      const maxAttempts = 3;
      
      const failingOperation = async () => {
        attemptCount++;
        if (attemptCount < maxAttempts) {
          throw new Error(`Attempt ${attemptCount} failed`);
        }
        return 'success';
      };

      const context: ErrorContext = {
        operation: 'test-retry',
        timestamp: new Date()
      };

      const result = await errorHandler.handleStorageFailure(failingOperation, context);
      
      expect(result.success).toBe(true);
      expect(result.recoveredData).toBe('success');
      expect(attemptCount).toBe(maxAttempts);
      expect(result.message).toContain('succeeded after 3 attempts');
    });

    it('should use emergency backup when all retries fail', async () => {
      const alwaysFailingOperation = async () => {
        throw new Error('Persistent storage failure');
      };

      const fallbackData = createTestCompactedState('fallback-test');
      const context: ErrorContext = {
        operation: 'test-fallback',
        workflowId: 'test-workflow',
        timestamp: new Date()
      };

      const result = await errorHandler.handleStorageFailure(
        alwaysFailingOperation,
        context,
        fallbackData
      );
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('emergency_backup');
      expect(result.message).toContain('emergency backup');
      expect(result.nextSteps).toContain('Check storage system health');
      
      // Verify emergency backup was created
      const emergencyPath = path.join(TEST_STORAGE_PATH, 'emergency');
      const emergencyFiles = fs.readdirSync(emergencyPath);
      expect(emergencyFiles.length).toBeGreaterThan(0);
    });

    it('should fail gracefully when both operation and emergency backup fail', async () => {
      // Test with a valid error handler but simulate emergency backup failure
      const alwaysFailingOperation = async () => {
        throw new Error('Storage failure');
      };

      const context: ErrorContext = {
        operation: 'test-complete-failure',
        timestamp: new Date()
      };

      // Mock the saveToEmergencyBackup to fail
      const originalSaveToEmergencyBackup = (errorHandler as any).saveToEmergencyBackup;
      (errorHandler as any).saveToEmergencyBackup = async () => {
        throw new Error('Emergency backup failed');
      };

      const result = await errorHandler.handleStorageFailure(
        alwaysFailingOperation,
        context,
        { test: 'data' }
      );
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('failed after 3 attempts');
      expect(result.nextSteps).toContain('Check file system permissions and disk space');
      
      // Restore original method
      (errorHandler as any).saveToEmergencyBackup = originalSaveToEmergencyBackup;
    });

    it('should handle permission denied errors', async () => {
      const permissionDeniedOperation = async () => {
        const error = new Error('Permission denied') as any;
        error.code = 'EACCES';
        throw error;
      };

      const context: ErrorContext = {
        operation: 'test-permission-denied',
        timestamp: new Date()
      };

      const result = await errorHandler.handleStorageFailure(permissionDeniedOperation, context);
      
      expect(result.success).toBe(false);
      expect(result.nextSteps).toContain('Check file system permissions and disk space');
    });
  });

  describe('Corrupted State File Handling', () => {
    it('should recover from archived states when main state is corrupted', async () => {
      const stateId = 'corrupted-test-state';
      
      // Create a valid archived state
      const archivePath = path.join(TEST_STORAGE_PATH, 'archive');
      fs.mkdirSync(archivePath, { recursive: true });
      
      const validArchivedState = createTestCompactedState(stateId);
      const archivedFilePath = path.join(archivePath, `spec-creation-${stateId}.json`);
      await fs.promises.writeFile(archivedFilePath, JSON.stringify(validArchivedState, null, 2));
      
      const context: ErrorContext = {
        operation: 'loadCorruptedState',
        stateId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCorruptedState(stateId, context);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('archived_state');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('archived state');
      expect(result.nextSteps).toContain('Verify recovered data integrity');
    });

    it('should recover from emergency backups when no archived states exist', async () => {
      const stateId = 'emergency-recovery-test';
      const workflowId = 'test-workflow-123';
      
      // Create an emergency backup
      const emergencyPath = path.join(TEST_STORAGE_PATH, 'emergency');
      fs.mkdirSync(emergencyPath, { recursive: true });
      
      const emergencyBackup = {
        id: 'emergency-backup-1',
        workflowId,
        minimalState: {
          id: workflowId,
          type: 'spec-creation',
          phase: 'requirements',
          currentTask: 'Write requirements',
          criticalDecisions: ['Use TypeScript'],
          nextSteps: ['Complete requirements']
        },
        timestamp: new Date(),
        reason: 'Test emergency backup'
      };
      
      const emergencyFilePath = path.join(emergencyPath, 'emergency-backup-1.json');
      await fs.promises.writeFile(emergencyFilePath, JSON.stringify(emergencyBackup, null, 2));
      
      const context: ErrorContext = {
        operation: 'loadCorruptedState',
        stateId,
        workflowId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCorruptedState(stateId, context);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('emergency_backup');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('emergency backup');
      expect(result.nextSteps).toContain('Reconstruct full workflow state from minimal data');
    });

    it('should fail gracefully when no recovery options are available', async () => {
      const stateId = 'unrecoverable-state';
      
      const context: ErrorContext = {
        operation: 'loadCorruptedState',
        stateId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCorruptedState(stateId, context);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('no valid backups found');
      expect(result.nextSteps).toContain('Start fresh workflow if possible');
    });

    it('should handle corrupted archived states gracefully', async () => {
      const stateId = 'corrupted-archive-test';
      
      // Create a corrupted archived state
      const archivePath = path.join(TEST_STORAGE_PATH, 'archive');
      fs.mkdirSync(archivePath, { recursive: true });
      
      const corruptedFilePath = path.join(archivePath, `spec-creation-${stateId}.json`);
      await fs.promises.writeFile(corruptedFilePath, 'invalid json content');
      
      const context: ErrorContext = {
        operation: 'loadCorruptedState',
        stateId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCorruptedState(stateId, context);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('no valid backups found');
    });
  });

  describe('Missing Preserved State Scenarios', () => {
    it('should find alternative states for the same workflow', async () => {
      const missingStateId = 'missing-state';
      const workflowId = 'test-workflow';
      
      // Create an alternative state for the same workflow with matching ID pattern
      const alternativeState = createTestCompactedState(`${workflowId}-alternative`);
      const alternativeFilePath = path.join(TEST_STORAGE_PATH, `spec-creation-${alternativeState.id}.json`);
      await fs.promises.writeFile(alternativeFilePath, JSON.stringify(alternativeState, null, 2));
      
      const context: ErrorContext = {
        operation: 'loadMissingState',
        stateId: missingStateId,
        workflowId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleMissingState(missingStateId, context);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('alternative_state');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('alternative preserved state');
      expect(result.nextSteps).toContain('Verify alternative state is suitable for continuation');
    });

    it('should offer most recent state when no same-workflow states exist', async () => {
      const missingStateId = 'missing-state';
      
      // Create a different workflow state
      const differentState = createTestCompactedState('different-workflow');
      differentState.essentialData.workflowType = 'task-execution';
      const differentFilePath = path.join(TEST_STORAGE_PATH, `task-execution-${differentState.id}.json`);
      await fs.promises.writeFile(differentFilePath, JSON.stringify(differentState, null, 2));
      
      const context: ErrorContext = {
        operation: 'loadMissingState',
        stateId: missingStateId,
        workflowId: 'non-existent-workflow',
        timestamp: new Date()
      };

      const result = await errorHandler.handleMissingState(missingStateId, context);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('most_recent_state');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('most recent preserved state');
      expect(result.nextSteps).toContain('Review if recent state is relevant to current work');
    });

    it('should fail gracefully when no states exist at all', async () => {
      const missingStateId = 'missing-state';
      
      const context: ErrorContext = {
        operation: 'loadMissingState',
        stateId: missingStateId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleMissingState(missingStateId, context);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('No preserved states found');
      expect(result.nextSteps).toContain('Start a new workflow from scratch');
    });

    it('should handle storage errors during state search', async () => {
      // Mock the storageUtils.listStates to throw an error
      const originalListStates = (errorHandler as any).storageUtils.listStates;
      (errorHandler as any).storageUtils.listStates = async () => {
        throw new Error('Storage search failed');
      };
      
      const missingStateId = 'missing-state';
      
      const context: ErrorContext = {
        operation: 'loadMissingState',
        stateId: missingStateId,
        timestamp: new Date()
      };

      const result = await errorHandler.handleMissingState(missingStateId, context);
      
      expect(result.success).toBe(false);
      expect(result.nextSteps).toContain('Start a new workflow from scratch');
      
      // Restore original method
      (errorHandler as any).storageUtils.listStates = originalListStates;
    });
  });

  describe('Compaction Failure Handling', () => {
    it('should create minimal emergency state when compaction fails', async () => {
      const workflowState = createTestWorkflowState('compaction-failure-test');
      
      const context: ErrorContext = {
        operation: 'compactWorkflowState',
        workflowId: workflowState.id,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCompactionFailure(workflowState, context, 0.8);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('minimal_state');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('minimal critical state');
      expect(result.nextSteps).toContain('Continue with reduced context');
      
      // Verify emergency backup was created
      const emergencyPath = path.join(TEST_STORAGE_PATH, 'emergency');
      const emergencyFiles = fs.readdirSync(emergencyPath);
      expect(emergencyFiles.length).toBeGreaterThan(0);
    });

    it('should fail gracefully when emergency backup also fails', async () => {
      const workflowState = createTestWorkflowState('complete-compaction-failure');
      
      // Mock the saveToEmergencyBackup to fail
      const originalSaveToEmergencyBackup = (errorHandler as any).saveToEmergencyBackup;
      (errorHandler as any).saveToEmergencyBackup = async () => {
        throw new Error('Emergency backup failed');
      };
      
      const context: ErrorContext = {
        operation: 'compactWorkflowState',
        workflowId: workflowState.id,
        timestamp: new Date()
      };

      const result = await errorHandler.handleCompactionFailure(workflowState, context, 0.8);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('emergency backup both failed');
      expect(result.nextSteps).toContain('Manually reduce workflow context');
      
      // Restore original method
      (errorHandler as any).saveToEmergencyBackup = originalSaveToEmergencyBackup;
    });
  });

  describe('Context Limit Exceeded Handling', () => {
    it('should create emergency preservation when context limit is exceeded', async () => {
      const workflowState = createTestWorkflowState('context-limit-test');
      
      const context: ErrorContext = {
        operation: 'preserveWorkflowState',
        workflowId: workflowState.id,
        timestamp: new Date()
      };

      const result = await errorHandler.handleContextLimitExceeded(workflowState, context);
      
      expect(result.success).toBe(true);
      expect(result.fallbackUsed).toBe('emergency_preservation');
      expect(result.recoveredData).toBeDefined();
      expect(result.message).toContain('Emergency preservation completed');
      expect(result.nextSteps).toContain('Start new session immediately');
      
      // Verify emergency backup was created
      const emergencyPath = path.join(TEST_STORAGE_PATH, 'emergency');
      const emergencyFiles = fs.readdirSync(emergencyPath);
      expect(emergencyFiles.length).toBeGreaterThan(0);
      
      // Verify the emergency backup contains minimal state
      const emergencyFile = emergencyFiles[0];
      const emergencyFilePath = path.join(emergencyPath, emergencyFile);
      const emergencyContent = await fs.promises.readFile(emergencyFilePath, 'utf8');
      const emergencyBackup = JSON.parse(emergencyContent);
      
      expect(emergencyBackup.minimalState).toBeDefined();
      expect(emergencyBackup.minimalState.id).toBe(workflowState.id);
      expect(emergencyBackup.minimalState.type).toBe(workflowState.type);
      expect(emergencyBackup.reason).toContain('Context limit exceeded');
    });

    it('should fail gracefully when emergency preservation fails', async () => {
      const workflowState = createTestWorkflowState('emergency-preservation-failure');
      
      // Mock fs.promises.writeFile to fail
      const originalWriteFile = fs.promises.writeFile;
      (fs.promises as any).writeFile = async () => {
        throw new Error('Write failed');
      };
      
      const context: ErrorContext = {
        operation: 'preserveWorkflowState',
        workflowId: workflowState.id,
        timestamp: new Date()
      };

      const result = await errorHandler.handleContextLimitExceeded(workflowState, context);
      
      expect(result.success).toBe(false);
      expect(result.message).toContain('emergency preservation failed');
      expect(result.nextSteps).toContain('Session will terminate with potential data loss');
      
      // Restore original method
      (fs.promises as any).writeFile = originalWriteFile;
    });
  });

  describe('Error Logging and Statistics', () => {
    it('should log errors to error log file', async () => {
      const error = new WorkflowPreservationError(
        ErrorType.STORAGE_FAILURE,
        'Test error message',
        {
          operation: 'test-operation',
          timestamp: new Date()
        }
      );

      // Trigger an error that will be logged
      const alwaysFailingOperation = async () => {
        throw error;
      };

      const context: ErrorContext = {
        operation: 'test-logging',
        timestamp: new Date()
      };

      await errorHandler.handleStorageFailure(alwaysFailingOperation, context);
      
      // Check that error log file was created
      const logPath = path.join(TEST_STORAGE_PATH, 'error.log');
      expect(fs.existsSync(logPath)).toBe(true);
      
      // Verify log content
      const logContent = await fs.promises.readFile(logPath, 'utf8');
      expect(logContent).toContain('STORAGE_FAILURE');
      expect(logContent).toContain('test-logging');
    });

    it('should provide error statistics', async () => {
      // Generate some errors
      const failingOperation = async () => {
        throw new Error('Test error');
      };

      const context: ErrorContext = {
        operation: 'test-statistics',
        timestamp: new Date()
      };

      // Generate multiple errors
      await errorHandler.handleStorageFailure(failingOperation, context);
      await errorHandler.handleStorageFailure(failingOperation, context);
      
      const stats = await errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBeGreaterThan(0);
      expect(stats.errorsByType[ErrorType.STORAGE_FAILURE]).toBeGreaterThan(0);
      expect(stats.recentErrors).toBeGreaterThan(0);
      expect(stats.recoveryRate).toBeGreaterThanOrEqual(0);
    });

    it('should handle missing error log file gracefully', async () => {
      const stats = await errorHandler.getErrorStatistics();
      
      expect(stats.totalErrors).toBe(0);
      expect(stats.recentErrors).toBe(0);
      expect(stats.recoveryRate).toBe(0);
    });
  });

  describe('WorkflowPreservationError', () => {
    it('should create error with correct properties', () => {
      const context: ErrorContext = {
        operation: 'test-operation',
        timestamp: new Date()
      };

      const error = new WorkflowPreservationError(
        ErrorType.CORRUPTED_STATE,
        'Test error message',
        context,
        true
      );

      expect(error.name).toBe('WorkflowPreservationError');
      expect(error.type).toBe(ErrorType.CORRUPTED_STATE);
      expect(error.message).toBe('Test error message');
      expect(error.context).toBe(context);
      expect(error.recoverable).toBe(true);
    });

    it('should default to recoverable when not specified', () => {
      const context: ErrorContext = {
        operation: 'test-operation',
        timestamp: new Date()
      };

      const error = new WorkflowPreservationError(
        ErrorType.STORAGE_FAILURE,
        'Test error message',
        context
      );

      expect(error.recoverable).toBe(true);
    });
  });
});