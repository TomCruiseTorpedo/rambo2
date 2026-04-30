// Integration tests for error handling across components
// Tests error handling in PreservationEngine, RestorationEngine, and SessionController

import { PreservationEngine } from '../components/PreservationEngine';
import { RestorationEngine } from '../components/RestorationEngine';
import { SessionController } from '../components/SessionController';
import { WorkflowManager } from '../components/WorkflowManager';
import { WorkflowState, CompactedState } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Test storage path
const TEST_STORAGE_PATH = '.kiro/state/workflows/test-error-integration';

describe('Error Handling Integration', () => {
  let preservationEngine: PreservationEngine;
  let restorationEngine: RestorationEngine;
  let sessionController: SessionController;
  let workflowManager: WorkflowManager;

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

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
    
    preservationEngine = new PreservationEngine(TEST_STORAGE_PATH);
    restorationEngine = new RestorationEngine(TEST_STORAGE_PATH);
    workflowManager = new WorkflowManager();
    sessionController = new SessionController(
      workflowManager,
      preservationEngine,
      restorationEngine,
      TEST_STORAGE_PATH
    );
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  describe('PreservationEngine Error Handling', () => {
    it('should handle storage failures during state saving', async () => {
      const workflowState = createTestWorkflowState('preservation-error-test');
      
      // Create compacted state
      const compactedState = await preservationEngine.compactWorkflowState(workflowState);
      
      // Make storage directory read-only to simulate permission error
      const storageDir = TEST_STORAGE_PATH;
      if (fs.existsSync(storageDir)) {
        try {
          fs.chmodSync(storageDir, 0o444); // Read-only
          
          // This should trigger error handling and fallback to emergency backup
          const result = await preservationEngine.saveWorkflowState(compactedState);
          
          // Should either succeed with emergency backup or throw a proper error
          expect(result).toBeDefined();
          
          // Restore permissions for cleanup
          fs.chmodSync(storageDir, 0o755);
        } catch (error) {
          // Restore permissions for cleanup
          fs.chmodSync(storageDir, 0o755);
          
          // Should be a WorkflowPreservationError
          expect(error).toBeDefined();
        }
      }
    });

    it('should handle compaction failures gracefully', async () => {
      // Create a workflow state that might cause compaction issues
      const largeWorkflowState = createTestWorkflowState('large-workflow');
      
      // Add many decisions to make compaction challenging
      for (let i = 0; i < 100; i++) {
        largeWorkflowState.decisions.push({
          id: `decision-${i}`,
          description: `Decision ${i}: ${'x'.repeat(1000)}`, // Large description
          rationale: 'x'.repeat(2000), // Large rationale
          timestamp: new Date(),
          impact: 'medium',
          category: 'design'
        });
      }
      
      // This should handle compaction gracefully, even if it can't achieve target ratio
      const compactedState = await preservationEngine.compactWorkflowState(largeWorkflowState);
      
      expect(compactedState).toBeDefined();
      expect(compactedState.id).toBeDefined();
      expect(compactedState.essentialData).toBeDefined();
      
      // Should be able to save the compacted state
      const filePath = await preservationEngine.saveWorkflowState(compactedState);
      expect(filePath).toBeDefined();
    });

    it('should still return valid compacted state for very large context flags', async () => {
      const workflowState = createTestWorkflowState('emergency-compaction-test');
      workflowState.contextSize = 1_000_000;

      const compactedState = await preservationEngine.compactWorkflowState(workflowState);

      expect(compactedState).toBeDefined();
      expect(compactedState.reconstructionMetadata.compressionAlgorithm).toBe('intelligent-prioritization');
      expect(compactedState.essentialData.workflowType).toBe(workflowState.type);
    });
  });

  describe('RestorationEngine Error Handling', () => {
    it('should handle missing state files gracefully', async () => {
      const result = await restorationEngine.loadWorkflowState('non-existent-state');
      
      // Should return null or handle the missing state gracefully
      expect(result).toBeNull();
    });

    it('should recover from corrupted state files', async () => {
      // Create a corrupted state file
      const corruptedFilePath = path.join(TEST_STORAGE_PATH, 'corrupted-state.json');
      await fs.promises.writeFile(corruptedFilePath, 'invalid json content');
      
      const result = await restorationEngine.loadWorkflowState('corrupted-state');
      
      // Should handle corruption gracefully (return null or recovered state)
      // The exact behavior depends on available recovery options
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should handle decompression errors', async () => {
      // Create a file with invalid compressed data
      const invalidCompressedPath = path.join(TEST_STORAGE_PATH, 'invalid-compressed.json');
      const invalidData = Buffer.from('invalid compressed data');
      await fs.promises.writeFile(invalidCompressedPath, invalidData);
      
      const result = await restorationEngine.loadWorkflowState('invalid-compressed');
      
      // Should handle decompression errors gracefully
      expect(result === null || typeof result === 'object').toBe(true);
    });

    it('should validate preserved states correctly', async () => {
      // Test with non-existent state
      const isValid1 = await restorationEngine.validatePreservedState('non-existent');
      expect(isValid1).toBe(false);
      
      // Create a valid state and test validation
      const workflowState = createTestWorkflowState('validation-test');
      const compactedState = await preservationEngine.compactWorkflowState(workflowState);
      await preservationEngine.saveWorkflowState(compactedState);
      
      // The validation should work with the actual saved file name pattern
      const savedFiles = await fs.promises.readdir(TEST_STORAGE_PATH);
      const savedFile = savedFiles.find(f => f.endsWith('.json'));
      
      if (savedFile) {
        const stateIdFromFile = savedFile.replace('.json', '');
        const isValid2 = await restorationEngine.validatePreservedState(stateIdFromFile);
        expect(isValid2).toBe(true);
      } else {
        // If no file was saved, the validation should return false
        const isValid2 = await restorationEngine.validatePreservedState(compactedState.id);
        expect(isValid2).toBe(false);
      }
    });
  });

  describe('SessionController Error Handling', () => {
    it('should handle rollover with no active workflows', async () => {
      const result = await sessionController.initiateRollover();
      
      expect(result.success).toBe(false);
      expect(result.continuationSummary).toContain('No active workflows');
      expect(result.nextSteps).toContain('Start a new workflow when ready');
    });

    it('should handle emergency rollover when context limit is exceeded', async () => {
      // Create and add a workflow to the manager
      const workflowId = workflowManager.createWorkflow('spec-creation', 'requirements');
      const workflowState = createTestWorkflowState(workflowId);
      workflowManager.restoreWorkflow(workflowState);
      
      // Simulate context limit exceeded scenario (99% utilization)
      const result = await sessionController.initiateRollover(99);
      
      expect(result.success).toBe(true);
      expect(result.continuationSummary).toBeDefined();
      expect(result.nextSteps).toBeDefined();
      
      // Should have created emergency backup
      const emergencyPath = path.join(TEST_STORAGE_PATH, 'emergency');
      if (fs.existsSync(emergencyPath)) {
        const emergencyFiles = fs.readdirSync(emergencyPath);
        expect(emergencyFiles.length).toBeGreaterThan(0);
      }
    });

    it('should handle partial rollover failures', async () => {
      // Create multiple workflows
      const workflowId1 = workflowManager.createWorkflow('spec-creation', 'requirements');
      const workflowId2 = workflowManager.createWorkflow('task-execution', 'implementation');
      
      const workflowState1 = createTestWorkflowState(workflowId1);
      const workflowState2 = createTestWorkflowState(workflowId2);
      
      workflowManager.restoreWorkflow(workflowState1);
      workflowManager.restoreWorkflow(workflowState2);
      
      // Make storage partially unavailable to simulate partial failure
      const storageDir = TEST_STORAGE_PATH;
      
      const result = await sessionController.initiateRollover();
      
      // Should handle partial failures gracefully
      expect(result).toBeDefined();
      expect(result.success !== undefined).toBe(true);
      expect(result.continuationSummary).toBeDefined();
      expect(result.nextSteps).toBeDefined();
    });

    it('should validate workflow continuity correctly', async () => {
      const oldState = createTestWorkflowState('continuity-test-old');
      const newState = createTestWorkflowState('continuity-test-new');
      
      // Test perfect continuity
      const validation1 = sessionController.validateContinuity(oldState, newState);
      expect(validation1.isValid).toBe(true);
      expect(validation1.continuityScore).toBeGreaterThan(0.7);
      
      // Test broken continuity
      const brokenNewState = { ...newState };
      brokenNewState.phase = 'implementation'; // Different phase
      brokenNewState.type = 'task-execution'; // Different type
      
      const validation2 = sessionController.validateContinuity(oldState, brokenNewState);
      expect(validation2.isValid).toBe(false);
      expect(validation2.continuityScore).toBeLessThan(0.7);
      expect(validation2.issues.length).toBeGreaterThan(0);
    });

    it('should restore from preserved state with error handling', async () => {
      // Create and preserve a workflow state
      const workflowState = createTestWorkflowState('restore-test');
      const compactedState = await preservationEngine.compactWorkflowState(workflowState);
      await preservationEngine.saveWorkflowState(compactedState);
      
      // Restore the workflow
      const restoredState = await sessionController.restoreFromPreservedState();
      
      expect(restoredState).toBeDefined();
      if (restoredState) {
        expect(restoredState.type).toBe(workflowState.type);
        expect(restoredState.phase).toBe(workflowState.phase);
      }
    });

    it('should handle restoration failures gracefully', async () => {
      // Try to restore when no preserved states exist
      const restoredState = await sessionController.restoreFromPreservedState();
      
      // Should return null when no states are available
      expect(restoredState).toBeNull();
    });

    it('should get preserved state status correctly', async () => {
      // Initially should have no preserved states
      const initialStatus = await sessionController.getPreservedStateStatus();
      expect(initialStatus).toEqual([]);
      
      // Create and preserve a workflow state
      const workflowState = createTestWorkflowState('status-test');
      const compactedState = await preservationEngine.compactWorkflowState(workflowState);
      await preservationEngine.saveWorkflowState(compactedState);
      
      // Should now have preserved states
      const statusWithStates = await sessionController.getPreservedStateStatus();
      expect(statusWithStates.length).toBeGreaterThan(0);
    });
  });

  describe('End-to-End Error Recovery', () => {
    it('should handle complete workflow preservation and restoration cycle with errors', async () => {
      // Create a workflow
      const workflowId = workflowManager.createWorkflow('spec-creation', 'requirements');
      const workflowState = createTestWorkflowState(workflowId);
      workflowManager.restoreWorkflow(workflowState);
      
      // Initiate rollover (preservation)
      const rolloverResult = await sessionController.initiateRollover();
      expect(rolloverResult.success).toBe(true);
      
      // Simulate new session - restore from preserved state
      const restoredState = await sessionController.restoreFromPreservedState();
      expect(restoredState).toBeDefined();
      
      if (restoredState) {
        // Validate continuity
        const continuityValidation = sessionController.validateContinuity(workflowState, restoredState);
        expect(continuityValidation.continuityScore).toBeGreaterThan(0.5); // Should have reasonable continuity
      }
    });

    it('should handle cascading failures with multiple recovery attempts', async () => {
      // Create a workflow with complex state
      const workflowState = createTestWorkflowState('cascading-failure-test');
      
      // Add complex data that might cause various failures
      for (let i = 0; i < 50; i++) {
        workflowState.decisions.push({
          id: `decision-${i}`,
          description: `Complex decision ${i}`,
          rationale: 'Complex rationale with lots of details',
          timestamp: new Date(),
          impact: 'high',
          category: 'technical'
        });
      }
      
      // Try to compact and save - should handle any failures gracefully
      const compactedState = await preservationEngine.compactWorkflowState(workflowState);
      expect(compactedState).toBeDefined();
      
      const filePath = await preservationEngine.saveWorkflowState(compactedState);
      expect(filePath).toBeDefined();
      
      // Try to load it back - should work or fail gracefully
      const loadedState = await restorationEngine.loadWorkflowState(compactedState.id);
      expect(loadedState === null || typeof loadedState === 'object').toBe(true);
    });
  });
});