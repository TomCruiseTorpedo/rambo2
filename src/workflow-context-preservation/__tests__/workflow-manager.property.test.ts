// Property-based tests for Workflow Manager Component
// **Feature: workflow-context-preservation**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { WorkflowManager } from '../components/WorkflowManager';
import { WorkflowState, Progress, DocumentState, Decision } from '../types';

// Generators for property-based testing
const progressGenerator = (): fc.Arbitrary<Progress> =>
  fc.record({
    completedTasks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
    currentTaskStatus: fc.constantFrom('not_started', 'in_progress', 'completed'),
    approvalStates: fc.dictionary(fc.string(), fc.boolean()),
    iterationCount: fc.integer({ min: 0, max: 100 }),
    lastUserFeedback: fc.option(fc.string({ maxLength: 500 }))
  });

const documentStateGenerator = (): fc.Arbitrary<DocumentState> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    name: fc.string({ minLength: 1, maxLength: 50 }),
    path: fc.string({ minLength: 1, maxLength: 100 }),
    content: fc.string({ minLength: 0, maxLength: 1000 }),
    lastModified: fc.date(),
    status: fc.constantFrom('draft', 'approved', 'in_review')
  });

const decisionGenerator = (): fc.Arbitrary<Decision> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    rationale: fc.string({ minLength: 1, maxLength: 300 }),
    timestamp: fc.date(),
    impact: fc.constantFrom('low', 'medium', 'high'),
    category: fc.constantFrom('technical', 'design', 'requirement')
  });

describe('Workflow Manager - Property Tests', () => {
  // Create fresh WorkflowManager for each test to avoid state pollution

  describe('Property 2: Complete state persistence', () => {
    it('should save all current progress, decisions, and artifacts to persistent storage', () => {
      // **Validates: Requirements 1.2**
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
              phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
              currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              progress: progressGenerator(),
              documents: fc.array(documentStateGenerator(), { maxLength: 5 }),
              decisions: fc.array(decisionGenerator(), { maxLength: 10 }),
              contextSize: fc.integer({ min: 100, max: 50000 })
            }),
            { minLength: 1, maxLength: 5 }
          ),
          (workflowConfigs) => {
            // Create multiple workflows with various states
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            const workflowIds: string[] = [];
            
            for (const config of workflowConfigs) {
              const workflowId = workflowManager.createWorkflow(
                config.type,
                config.phase,
                config.currentTask || undefined
              );
              workflowIds.push(workflowId);
              
              // Update workflow with progress, documents, and decisions
              workflowManager.updateWorkflowProgress(workflowId, config.progress);
              workflowManager.updateContextSize(workflowId, config.contextSize);
              
              for (const document of config.documents) {
                workflowManager.addDocument(workflowId, document);
              }
              
              for (const decision of config.decisions) {
                workflowManager.addDecision(workflowId, decision);
              }
            }
            
            // Capture current state - should preserve ALL workflow data
            const capturedStates = workflowManager.captureCurrentState();
            
            // Verify all workflows are captured
            expect(capturedStates.length).toBe(workflowConfigs.length);
            
            // Verify each captured state contains complete information
            for (let i = 0; i < capturedStates.length; i++) {
              const capturedState = capturedStates[i];
              const originalConfig = workflowConfigs[i];
              
              // Verify core workflow properties
              expect(capturedState.type).toBe(originalConfig.type);
              expect(capturedState.phase).toBe(originalConfig.phase);
              expect(capturedState.currentTask).toBe(originalConfig.currentTask || undefined);
              expect(capturedState.contextSize).toBe(originalConfig.contextSize);
              
              // Verify progress is completely preserved
              expect(capturedState.progress.completedTasks).toEqual(originalConfig.progress.completedTasks);
              expect(capturedState.progress.currentTaskStatus).toBe(originalConfig.progress.currentTaskStatus);
              expect(capturedState.progress.approvalStates).toEqual(originalConfig.progress.approvalStates);
              expect(capturedState.progress.iterationCount).toBe(originalConfig.progress.iterationCount);
              expect(capturedState.progress.lastUserFeedback).toBe(originalConfig.progress.lastUserFeedback);
              
              // Verify all documents are preserved
              expect(capturedState.documents.length).toBe(originalConfig.documents.length);
              for (let j = 0; j < capturedState.documents.length; j++) {
                const capturedDoc = capturedState.documents[j];
                const originalDoc = originalConfig.documents[j];
                expect(capturedDoc.id).toBe(originalDoc.id);
                expect(capturedDoc.name).toBe(originalDoc.name);
                expect(capturedDoc.path).toBe(originalDoc.path);
                expect(capturedDoc.content).toBe(originalDoc.content);
                expect(capturedDoc.status).toBe(originalDoc.status);
              }
              
              // Verify all decisions are preserved
              expect(capturedState.decisions.length).toBe(originalConfig.decisions.length);
              for (let j = 0; j < capturedState.decisions.length; j++) {
                const capturedDecision = capturedState.decisions[j];
                const originalDecision = originalConfig.decisions[j];
                expect(capturedDecision.id).toBe(originalDecision.id);
                expect(capturedDecision.description).toBe(originalDecision.description);
                expect(capturedDecision.rationale).toBe(originalDecision.rationale);
                expect(capturedDecision.impact).toBe(originalDecision.impact);
                expect(capturedDecision.category).toBe(originalDecision.category);
              }
              
              // Verify user preferences are preserved
              expect(capturedState.userPreferences).toBeDefined();
              expect(capturedState.userPreferences.theme).toBeDefined();
              expect(capturedState.userPreferences.language).toBeDefined();
              
              // Verify timestamp is recent
              expect(capturedState.timestamp).toBeInstanceOf(Date);
              
              // Verify workflow has unique ID
              expect(capturedState.id).toBeTruthy();
              expect(typeof capturedState.id).toBe('string');
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve workflow state integrity during updates', () => {
      // **Validates: Requirements 1.2**
      
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
            phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
            currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            updates: fc.array(
              fc.record({
                newProgress: progressGenerator(),
                newPhase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
                newTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
                newDocument: fc.option(documentStateGenerator()),
                newDecision: fc.option(decisionGenerator()),
                newContextSize: fc.integer({ min: 100, max: 50000 })
              }),
              { minLength: 1, maxLength: 10 }
            )
          }),
          (testData) => {
            // Create initial workflow
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            const workflowId = workflowManager.createWorkflow(
              testData.type,
              testData.phase,
              testData.currentTask || undefined
            );
            
            // Apply series of updates
            for (const update of testData.updates) {
              workflowManager.updateWorkflowProgress(workflowId, update.newProgress);
              workflowManager.updateWorkflowPhase(workflowId, update.newPhase);
              
              if (update.newTask) {
                workflowManager.updateCurrentTask(workflowId, update.newTask);
              }
              
              if (update.newDocument) {
                workflowManager.addDocument(workflowId, update.newDocument);
              }
              
              if (update.newDecision) {
                workflowManager.addDecision(workflowId, update.newDecision);
              }
              
              workflowManager.updateContextSize(workflowId, update.newContextSize);
            }
            
            // Capture final state
            const capturedStates = workflowManager.captureCurrentState();
            expect(capturedStates.length).toBe(1);
            
            const finalState = capturedStates[0];
            const lastUpdate = testData.updates[testData.updates.length - 1];
            
            // Verify final state reflects all updates
            expect(finalState.phase).toBe(lastUpdate.newPhase);
            expect(finalState.contextSize).toBe(lastUpdate.newContextSize);
            expect(finalState.progress).toEqual(lastUpdate.newProgress);
            
            // Verify accumulated documents and decisions
            const expectedDocCount = testData.updates.filter(u => u.newDocument).length;
            const expectedDecisionCount = testData.updates.filter(u => u.newDecision).length;
            
            expect(finalState.documents.length).toBe(expectedDocCount);
            expect(finalState.decisions.length).toBe(expectedDecisionCount);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain state consistency across workflow operations', () => {
      // **Validates: Requirements 1.2**
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
              phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
              currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 }))
            }),
            { minLength: 1, maxLength: 3 }
          ),
          (workflowConfigs) => {
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            const workflowIds: string[] = [];
            
            // Create workflows
            for (const config of workflowConfigs) {
              const id = workflowManager.createWorkflow(config.type, config.phase, config.currentTask || undefined);
              workflowIds.push(id);
            }
            
            // Verify initial state consistency
            let capturedStates = workflowManager.captureCurrentState();
            expect(capturedStates.length).toBe(workflowConfigs.length);
            
            // Verify each workflow can be retrieved individually
            for (let i = 0; i < workflowIds.length; i++) {
              const workflow = workflowManager.getWorkflow(workflowIds[i]);
              expect(workflow).toBeDefined();
              expect(workflow!.id).toBe(workflowIds[i]);
              expect(workflow!.type).toBe(workflowConfigs[i].type);
              expect(workflow!.phase).toBe(workflowConfigs[i].phase);
            }
            
            // Remove one workflow and verify consistency
            if (workflowIds.length > 1) {
              const removedId = workflowIds[0];
              const removed = workflowManager.removeWorkflow(removedId);
              expect(removed).toBe(true);
              
              // Verify workflow is no longer in captured state
              capturedStates = workflowManager.captureCurrentState();
              expect(capturedStates.length).toBe(workflowConfigs.length - 1);
              
              // Verify removed workflow is no longer retrievable
              const removedWorkflow = workflowManager.getWorkflow(removedId);
              expect(removedWorkflow).toBeUndefined();
              
              // Verify remaining workflows are still intact
              for (let i = 1; i < workflowIds.length; i++) {
                const workflow = workflowManager.getWorkflow(workflowIds[i]);
                expect(workflow).toBeDefined();
                expect(workflow!.type).toBe(workflowConfigs[i].type);
              }
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 16: Independent multi-workflow preservation', () => {
    it('should preserve and restore each workflow independently without interference or data mixing', () => {
      // **Validates: Requirements 5.5**
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
              phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
              currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              progress: progressGenerator(),
              documents: fc.array(documentStateGenerator(), { maxLength: 3 }),
              decisions: fc.array(decisionGenerator(), { maxLength: 3 }),
              contextSize: fc.integer({ min: 100, max: 10000 })
            }),
            { minLength: 2, maxLength: 5 }
          ),
          (workflowConfigs) => {
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            const workflowIds: string[] = [];
            const originalStates: WorkflowState[] = [];
            
            // Create multiple independent workflows
            for (const config of workflowConfigs) {
              const workflowId = workflowManager.createWorkflow(
                config.type,
                config.phase,
                config.currentTask || undefined
              );
              workflowIds.push(workflowId);
              
              // Configure each workflow independently
              workflowManager.updateWorkflowProgress(workflowId, config.progress);
              workflowManager.updateContextSize(workflowId, config.contextSize);
              
              for (const document of config.documents) {
                workflowManager.addDocument(workflowId, document);
              }
              
              for (const decision of config.decisions) {
                workflowManager.addDecision(workflowId, decision);
              }
              
              // Store original state for comparison
              const workflow = workflowManager.getWorkflow(workflowId);
              expect(workflow).toBeDefined();
              originalStates.push(workflow!);
            }
            
            // Verify workflows are independent - capture all states
            const capturedStates = workflowManager.captureCurrentState();
            expect(capturedStates.length).toBe(workflowConfigs.length);
            
            // Verify each workflow maintains its unique identity and data
            for (let i = 0; i < capturedStates.length; i++) {
              const capturedState = capturedStates[i];
              const originalState = originalStates[i];
              const originalConfig = workflowConfigs[i];
              
              // Verify workflow identity is preserved
              expect(capturedState.id).toBe(originalState.id);
              expect(capturedState.type).toBe(originalConfig.type);
              expect(capturedState.phase).toBe(originalConfig.phase);
              
              // Verify no data mixing between workflows
              expect(capturedState.documents.length).toBe(originalConfig.documents.length);
              expect(capturedState.decisions.length).toBe(originalConfig.decisions.length);
              expect(capturedState.contextSize).toBe(originalConfig.contextSize);
              
              // Verify documents belong to this workflow only
              for (let j = 0; j < capturedState.documents.length; j++) {
                const capturedDoc = capturedState.documents[j];
                const originalDoc = originalConfig.documents[j];
                expect(capturedDoc.id).toBe(originalDoc.id);
                expect(capturedDoc.content).toBe(originalDoc.content);
              }
              
              // Verify decisions belong to this workflow only
              for (let j = 0; j < capturedState.decisions.length; j++) {
                const capturedDecision = capturedState.decisions[j];
                const originalDecision = originalConfig.decisions[j];
                expect(capturedDecision.id).toBe(originalDecision.id);
                expect(capturedDecision.description).toBe(originalDecision.description);
              }
            }
            
            // Verify workflow info shows independent workflows
            const workflowInfos = workflowManager.getActiveWorkflows();
            expect(workflowInfos.length).toBe(workflowConfigs.length);
            
            // Verify each workflow info is unique and correct
            for (let i = 0; i < workflowInfos.length; i++) {
              const info = workflowInfos[i];
              const matchingState = capturedStates.find(s => s.id === info.id);
              expect(matchingState).toBeDefined();
              expect(info.type).toBe(matchingState!.type);
              expect(info.phase).toBe(matchingState!.phase);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle concurrent workflow operations without data corruption', () => {
      // **Validates: Requirements 5.5**
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
              operations: fc.array(
                fc.record({
                  operation: fc.constantFrom('updateProgress', 'addDocument', 'addDecision', 'updatePhase'),
                  progress: fc.option(progressGenerator()),
                  document: fc.option(documentStateGenerator()),
                  decision: fc.option(decisionGenerator()),
                  phase: fc.option(fc.constantFrom('requirements', 'design', 'tasks', 'implementation'))
                }),
                { minLength: 1, maxLength: 5 }
              )
            }),
            { minLength: 2, maxLength: 4 }
          ),
          (workflowSpecs) => {
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            const workflowIds: string[] = [];
            
            // Create multiple workflows
            for (const spec of workflowSpecs) {
              const workflowId = workflowManager.createWorkflow(spec.type);
              workflowIds.push(workflowId);
            }
            
            // Perform concurrent operations on different workflows
            for (let i = 0; i < workflowSpecs.length; i++) {
              const workflowId = workflowIds[i];
              const spec = workflowSpecs[i];
              
              for (const operation of spec.operations) {
                switch (operation.operation) {
                  case 'updateProgress':
                    if (operation.progress) {
                      workflowManager.updateWorkflowProgress(workflowId, operation.progress);
                    }
                    break;
                  case 'addDocument':
                    if (operation.document) {
                      workflowManager.addDocument(workflowId, operation.document);
                    }
                    break;
                  case 'addDecision':
                    if (operation.decision) {
                      workflowManager.addDecision(workflowId, operation.decision);
                    }
                    break;
                  case 'updatePhase':
                    if (operation.phase) {
                      workflowManager.updateWorkflowPhase(workflowId, operation.phase);
                    }
                    break;
                }
              }
            }
            
            // Verify all workflows maintained independence
            const capturedStates = workflowManager.captureCurrentState();
            expect(capturedStates.length).toBe(workflowSpecs.length);
            
            // Verify each workflow has unique ID and no cross-contamination
            const workflowIdSet = new Set(capturedStates.map(s => s.id));
            expect(workflowIdSet.size).toBe(workflowSpecs.length);
            
            // Verify each workflow can be retrieved independently
            for (const workflowId of workflowIds) {
              const workflow = workflowManager.getWorkflow(workflowId);
              expect(workflow).toBeDefined();
              expect(workflow!.id).toBe(workflowId);
              
              // Verify workflow data integrity
              expect(workflow!.type).toBeDefined();
              expect(workflow!.phase).toBeDefined();
              expect(workflow!.progress).toBeDefined();
              expect(Array.isArray(workflow!.documents)).toBe(true);
              expect(Array.isArray(workflow!.decisions)).toBe(true);
            }
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should restore workflows independently without affecting other active workflows', () => {
      // **Validates: Requirements 5.5**
      
      fc.assert(
        fc.property(
          fc.array(
            fc.record({
              type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
              phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
              currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
              progress: progressGenerator(),
              documents: fc.array(documentStateGenerator(), { maxLength: 2 }),
              decisions: fc.array(decisionGenerator(), { maxLength: 2 })
            }),
            { minLength: 3, maxLength: 5 }
          ),
          (workflowConfigs) => {
            const workflowManager = new WorkflowManager(); // Fresh instance for each test
            // Create initial workflows
            const initialWorkflowIds: string[] = [];
            for (let i = 0; i < workflowConfigs.length - 1; i++) {
              const config = workflowConfigs[i];
              const workflowId = workflowManager.createWorkflow(
                config.type,
                config.phase,
                config.currentTask || undefined
              );
              initialWorkflowIds.push(workflowId);
              
              workflowManager.updateWorkflowProgress(workflowId, config.progress);
              for (const document of config.documents) {
                workflowManager.addDocument(workflowId, document);
              }
              for (const decision of config.decisions) {
                workflowManager.addDecision(workflowId, decision);
              }
            }
            
            // Capture state of existing workflows before restoration
            const statesBeforeRestore = workflowManager.captureCurrentState();
            expect(statesBeforeRestore.length).toBe(workflowConfigs.length - 1);
            
            // Create a workflow state to restore (simulating preserved state)
            const restoreConfig = workflowConfigs[workflowConfigs.length - 1];
            const workflowStateToRestore: WorkflowState = {
              id: 'restored-workflow-' + Date.now(),
              type: restoreConfig.type,
              phase: restoreConfig.phase,
              currentTask: restoreConfig.currentTask || undefined,
              progress: restoreConfig.progress,
              documents: restoreConfig.documents,
              decisions: restoreConfig.decisions,
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
            
            // Restore the workflow
            workflowManager.restoreWorkflow(workflowStateToRestore);
            
            // Verify restoration didn't affect existing workflows
            const statesAfterRestore = workflowManager.captureCurrentState();
            expect(statesAfterRestore.length).toBe(workflowConfigs.length);
            
            // Verify existing workflows are unchanged
            for (let i = 0; i < statesBeforeRestore.length; i++) {
              const beforeState = statesBeforeRestore[i];
              const afterState = statesAfterRestore.find(s => s.id === beforeState.id);
              
              expect(afterState).toBeDefined();
              expect(afterState!.type).toBe(beforeState.type);
              expect(afterState!.phase).toBe(beforeState.phase);
              expect(afterState!.documents.length).toBe(beforeState.documents.length);
              expect(afterState!.decisions.length).toBe(beforeState.decisions.length);
            }
            
            // Verify restored workflow is present and correct
            const restoredState = statesAfterRestore.find(s => s.id === workflowStateToRestore.id);
            expect(restoredState).toBeDefined();
            expect(restoredState!.type).toBe(restoreConfig.type);
            expect(restoredState!.phase).toBe(restoreConfig.phase);
            expect(restoredState!.documents.length).toBe(restoreConfig.documents.length);
            expect(restoredState!.decisions.length).toBe(restoreConfig.decisions.length);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});