// Property-based tests for Session Controller Component
// **Feature: workflow-context-preservation**

import { describe, it, expect, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { SessionController } from '../components/SessionController';
import { WorkflowManager } from '../components/WorkflowManager';
import { PreservationEngine } from '../components/PreservationEngine';
import { RestorationEngine } from '../components/RestorationEngine';
import { 
  WorkflowState, 
  Progress, 
  DocumentState, 
  Decision, 
  UserPreferences 
} from '../types';

// Generators for property-based testing
const userPreferencesGenerator = (): fc.Arbitrary<UserPreferences> =>
  fc.record({
    theme: fc.constantFrom('light', 'dark', 'auto'),
    language: fc.string({ minLength: 2, maxLength: 5 }),
    notifications: fc.boolean(),
    autoSave: fc.boolean(),
    compressionLevel: fc.constantFrom('low', 'medium', 'high')
  });

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
    lastModified: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    status: fc.constantFrom('draft', 'approved', 'in_review')
  });

const decisionGenerator = (): fc.Arbitrary<Decision> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 20 }),
    description: fc.string({ minLength: 1, maxLength: 200 }),
    rationale: fc.string({ minLength: 1, maxLength: 300 }),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    impact: fc.constantFrom('low', 'medium', 'high'),
    category: fc.constantFrom('technical', 'design', 'requirement')
  });

const workflowStateGenerator = (): fc.Arbitrary<WorkflowState> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 30 }),
    type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
    phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
    currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    progress: progressGenerator(),
    documents: fc.array(documentStateGenerator(), { maxLength: 5 }),
    decisions: fc.array(decisionGenerator(), { maxLength: 10 }),
    userPreferences: userPreferencesGenerator(),
    timestamp: fc.date({ min: new Date('2020-01-01'), max: new Date('2030-12-31') }),
    contextSize: fc.integer({ min: 100, max: 50000 })
  });

describe('Session Controller - Property Tests', () => {

  describe('Property 5: Summary generation on transitions', () => {
    it('should generate comprehensive summary containing preserved state details, current position, and next steps', () => {
      // **Validates: Requirements 1.5, 3.4, 5.4**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          (workflowState) => {
            const sessionController = new SessionController();
            
            // Generate continuation summary
            const summary = sessionController.generateContinuationSummary(workflowState);
            
            // Verify summary is not empty and contains essential information
            expect(summary).toBeTruthy();
            expect(typeof summary).toBe('string');
            expect(summary.length).toBeGreaterThan(50); // Should be substantial
            
            // Verify summary contains workflow identification
            expect(summary).toContain('Workflow Type:');
            expect(summary).toContain(workflowState.type);
            expect(summary).toContain('Current Phase:');
            expect(summary).toContain(workflowState.phase);
            
            // Verify summary contains current position information
            if (workflowState.currentTask) {
              expect(summary).toContain('Active Task:');
              expect(summary).toContain(workflowState.currentTask);
            } else {
              expect(summary).toContain('Active Task: None');
            }
            
            // Verify summary contains progress status
            expect(summary).toContain('Progress Status:');
            expect(summary).toContain('Completed Tasks:');
            expect(summary).toContain(workflowState.progress.completedTasks.length.toString());
            expect(summary).toContain('Current Task Status:');
            expect(summary).toContain(workflowState.progress.currentTaskStatus);
            expect(summary).toContain('Iteration Count:');
            expect(summary).toContain(workflowState.progress.iterationCount.toString());
            
            // Verify summary contains document status
            expect(summary).toContain('Document Status:');
            if (workflowState.documents.length > 0) {
              expect(summary).toContain('Total Documents:');
              expect(summary).toContain(workflowState.documents.length.toString());
              
              // Check for document status breakdown
              const approvedCount = workflowState.documents.filter(d => d.status === 'approved').length;
              const inReviewCount = workflowState.documents.filter(d => d.status === 'in_review').length;
              const draftCount = workflowState.documents.filter(d => d.status === 'draft').length;
              
              expect(summary).toContain(`Approved: ${approvedCount}`);
              expect(summary).toContain(`In Review: ${inReviewCount}`);
              expect(summary).toContain(`Draft: ${draftCount}`);
            } else {
              expect(summary).toContain('No documents in workflow');
            }
            
            // Verify summary contains decision status
            expect(summary).toContain('Decision Status:');
            if (workflowState.decisions.length > 0) {
              expect(summary).toContain('Total Decisions:');
              expect(summary).toContain(workflowState.decisions.length.toString());
              
              const highImpactCount = workflowState.decisions.filter(d => d.impact === 'high').length;
              expect(summary).toContain(`High Impact: ${highImpactCount}`);
            } else {
              expect(summary).toContain('No decisions recorded');
            }
            
            // Verify summary contains context information
            expect(summary).toContain('Context Information:');
            expect(summary).toContain('Context Size:');
            expect(summary).toContain(workflowState.contextSize.toString());
            expect(summary).toContain('Last Updated:');
            expect(summary).toContain('User Preferences:');
            expect(summary).toContain(workflowState.userPreferences.compressionLevel);
            
            // Verify summary has proper structure with headers
            expect(summary).toContain('=== Workflow Continuation Summary ===');
            expect(summary).toContain('=== End Summary ===');
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate summary with appropriate detail level for different workflow states', () => {
      // **Validates: Requirements 1.5, 3.4, 5.4**
      
      fc.assert(
        fc.property(
          fc.record({
            baseWorkflow: workflowStateGenerator(),
            documentCount: fc.integer({ min: 0, max: 10 }),
            decisionCount: fc.integer({ min: 0, max: 15 }),
            hasHighImpactDecisions: fc.boolean(),
            hasRecentActivity: fc.boolean()
          }),
          (testData) => {
            // Create workflow with specific characteristics
            const workflowState: WorkflowState = {
              ...testData.baseWorkflow,
              documents: Array.from({ length: testData.documentCount }, (_, i) => ({
                id: `doc-${i}`,
                name: `Document ${i}`,
                path: `/path/to/doc${i}`,
                content: `Content for document ${i}`,
                lastModified: testData.hasRecentActivity 
                  ? new Date(Date.now() - 30 * 60 * 1000) // 30 minutes ago
                  : new Date(Date.now() - 25 * 60 * 60 * 1000), // 25 hours ago
                status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'in_review' : 'draft'
              })),
              decisions: Array.from({ length: testData.decisionCount }, (_, i) => ({
                id: `decision-${i}`,
                description: `Decision ${i}`,
                rationale: `Rationale for decision ${i}`,
                timestamp: testData.hasRecentActivity 
                  ? new Date(Date.now() - 2 * 60 * 60 * 1000) // 2 hours ago
                  : new Date(Date.now() - 26 * 60 * 60 * 1000), // 26 hours ago
                impact: testData.hasHighImpactDecisions && i < 2 ? 'high' : 'medium',
                category: 'technical'
              }))
            };
            
            const sessionController = new SessionController();
            const summary = sessionController.generateContinuationSummary(workflowState);
            
            // Verify summary adapts to workflow characteristics
            expect(summary).toBeTruthy();
            
            // Check document-related content
            if (testData.documentCount > 0) {
              expect(summary).toContain(`Total Documents: ${testData.documentCount}`);
              expect(summary).toContain('Recent Documents:');
            } else {
              expect(summary).toContain('No documents in workflow');
              expect(summary).not.toContain('Recent Documents:');
            }
            
            // Check decision-related content
            if (testData.decisionCount > 0) {
              expect(summary).toContain(`Total Decisions: ${testData.decisionCount}`);
              
              if (testData.hasHighImpactDecisions) {
                expect(summary).toContain('Recent High-Impact Decisions:');
              }
            } else {
              expect(summary).toContain('No decisions recorded');
              expect(summary).not.toContain('Recent High-Impact Decisions:');
            }
            
            // Verify summary length is appropriate for content
            const expectedMinLength = 200 + (testData.documentCount * 10) + (testData.decisionCount * 10);
            expect(summary.length).toBeGreaterThan(expectedMinLength);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should generate summary that includes next steps based on workflow phase and status', () => {
      // **Validates: Requirements 1.5, 3.4, 5.4**
      
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
            phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
            currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            taskStatus: fc.constantFrom('not_started', 'in_progress', 'completed'),
            hasMultipleWorkflows: fc.boolean()
          }),
          (testData) => {
            const sessionController = new SessionController();
            
            // Create workflow state
            const workflowState: WorkflowState = {
              id: 'test-workflow',
              type: testData.type,
              phase: testData.phase,
              currentTask: testData.currentTask || undefined,
              progress: {
                completedTasks: [],
                currentTaskStatus: testData.taskStatus,
                approvalStates: {},
                iterationCount: 1
              },
              documents: [],
              decisions: [],
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
            
            // Generate summary
            const summary = sessionController.generateContinuationSummary(workflowState);
            
            // Verify summary contains workflow-specific information
            expect(summary).toContain(testData.type);
            expect(summary).toContain(testData.phase);
            expect(summary).toContain(testData.taskStatus);
            
            // Verify current task information
            if (testData.currentTask) {
              expect(summary).toContain(testData.currentTask);
            }
            
            // Verify summary structure is consistent
            expect(summary).toContain('=== Workflow Continuation Summary ===');
            expect(summary).toContain('Workflow Type:');
            expect(summary).toContain('Current Phase:');
            expect(summary).toContain('Progress Status:');
            expect(summary).toContain('Document Status:');
            expect(summary).toContain('Decision Status:');
            expect(summary).toContain('Context Information:');
            expect(summary).toContain('=== End Summary ===');
            
            // Verify summary provides actionable information
            expect(summary.length).toBeGreaterThan(300); // Should be comprehensive
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 14: Phase and task continuity', () => {
    it('should maintain identical workflow phase and current task focus in new session after rollover', () => {
      // **Validates: Requirements 5.1**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          (originalWorkflowState) => {
            const sessionController = new SessionController();
            
            // Simulate workflow state before rollover
            const oldState = originalWorkflowState;
            
            // Simulate workflow state after restoration (should maintain phase and task)
            const newState: WorkflowState = {
              ...originalWorkflowState,
              id: 'restored-' + originalWorkflowState.id, // New ID for restored session
              timestamp: new Date() // Updated timestamp
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify phase continuity is maintained
            expect(validation.preservedPhase).toBe(oldState.phase);
            expect(validation.restoredPhase).toBe(newState.phase);
            expect(validation.preservedPhase).toBe(validation.restoredPhase);
            
            // Verify task continuity is maintained
            expect(validation.preservedTask).toBe(oldState.currentTask);
            expect(validation.restoredTask).toBe(newState.currentTask);
            expect(validation.preservedTask).toBe(validation.restoredTask);
            
            // Verify continuity is valid (high score)
            expect(validation.isValid).toBe(true);
            expect(validation.continuityScore).toBeGreaterThanOrEqual(0.7);
            
            // Verify no phase or task-related issues
            const phaseIssues = validation.issues.filter(issue => 
              issue.includes('Phase') || issue.includes('phase')
            );
            expect(phaseIssues.length).toBe(0);
            
            const taskIssues = validation.issues.filter(issue => 
              issue.includes('Task') || issue.includes('task')
            );
            expect(taskIssues.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect phase discontinuity when workflow phase changes between sessions', () => {
      // **Validates: Requirements 5.1**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
          (originalWorkflowState, newPhase) => {
            // Skip if new phase is same as original
            fc.pre(originalWorkflowState.phase !== newPhase);
            
            const sessionController = new SessionController();
            
            const oldState = originalWorkflowState;
            
            // Create new state with different phase
            const newState: WorkflowState = {
              ...originalWorkflowState,
              phase: newPhase, // Changed phase
              id: 'restored-' + originalWorkflowState.id,
              timestamp: new Date()
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify phase discontinuity is detected
            expect(validation.preservedPhase).toBe(oldState.phase);
            expect(validation.restoredPhase).toBe(newState.phase);
            expect(validation.preservedPhase).not.toBe(validation.restoredPhase);
            
            // Verify continuity score is reduced due to phase mismatch
            expect(validation.continuityScore).toBeLessThan(1.0);
            
            // Verify phase mismatch is reported in issues
            const phaseIssues = validation.issues.filter(issue => 
              issue.includes('Phase mismatch')
            );
            expect(phaseIssues.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect task discontinuity when active task changes between sessions', () => {
      // **Validates: Requirements 5.1**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          fc.string({ minLength: 1, maxLength: 100 }),
          (originalWorkflowState, newTask) => {
            // Only test when original has a task and new task is different
            fc.pre(originalWorkflowState.currentTask !== undefined);
            fc.pre(originalWorkflowState.currentTask !== null);
            fc.pre(originalWorkflowState.currentTask !== newTask);
            
            const sessionController = new SessionController();
            
            const oldState = originalWorkflowState;
            
            // Create new state with different task
            const newState: WorkflowState = {
              ...originalWorkflowState,
              currentTask: newTask, // Changed task
              id: 'restored-' + originalWorkflowState.id,
              timestamp: new Date()
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify task discontinuity is detected
            expect(validation.preservedTask).toBe(oldState.currentTask);
            expect(validation.restoredTask).toBe(newState.currentTask);
            expect(validation.preservedTask).not.toBe(validation.restoredTask);
            
            // Verify continuity score is reduced due to task change
            expect(validation.continuityScore).toBeLessThan(1.0);
            
            // Verify task change is reported in issues
            const taskIssues = validation.issues.filter(issue => 
              issue.includes('Task changed')
            );
            expect(taskIssues.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect task loss when active task is not restored', () => {
      // **Validates: Requirements 5.1**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          (originalWorkflowState) => {
            // Only test when original has a task
            fc.pre(originalWorkflowState.currentTask !== undefined);
            fc.pre(originalWorkflowState.currentTask !== null);
            
            const sessionController = new SessionController();
            
            const oldState = originalWorkflowState;
            
            // Create new state with no task (task lost)
            const newState: WorkflowState = {
              ...originalWorkflowState,
              currentTask: undefined, // Task lost
              id: 'restored-' + originalWorkflowState.id,
              timestamp: new Date()
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify task loss is detected
            expect(validation.preservedTask).toBe(oldState.currentTask);
            expect(validation.restoredTask).toBe(undefined);
            
            // Verify continuity score is reduced due to task loss
            expect(validation.continuityScore).toBeLessThan(1.0);
            
            // Verify task loss is reported in issues
            const taskIssues = validation.issues.filter(issue => 
              issue.includes('Active task lost')
            );
            expect(taskIssues.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain high continuity score when phase and task are preserved correctly', () => {
      // **Validates: Requirements 5.1**
      
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
            phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
            currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            progress: progressGenerator(),
            documents: fc.array(documentStateGenerator(), { maxLength: 3 }),
            decisions: fc.array(decisionGenerator(), { maxLength: 5 })
          }),
          (workflowConfig) => {
            const sessionController = new SessionController();
            
            // Create old state
            const oldState: WorkflowState = {
              id: 'original-workflow',
              type: workflowConfig.type,
              phase: workflowConfig.phase,
              currentTask: workflowConfig.currentTask || undefined,
              progress: workflowConfig.progress,
              documents: workflowConfig.documents,
              decisions: workflowConfig.decisions,
              userPreferences: {
                theme: 'auto',
                language: 'en',
                notifications: true,
                autoSave: true,
                compressionLevel: 'medium'
              },
              timestamp: new Date('2024-01-01'),
              contextSize: 5000
            };
            
            // Create new state with same phase and task (perfect continuity)
            const newState: WorkflowState = {
              ...oldState,
              id: 'restored-workflow',
              timestamp: new Date('2024-01-02')
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify perfect or near-perfect continuity
            expect(validation.isValid).toBe(true);
            expect(validation.continuityScore).toBeGreaterThanOrEqual(0.9);
            
            // Verify phase and task match
            expect(validation.preservedPhase).toBe(validation.restoredPhase);
            expect(validation.preservedTask).toBe(validation.restoredTask);
            
            // Verify minimal or no issues
            const criticalIssues = validation.issues.filter(issue => 
              issue.includes('Phase mismatch') || 
              issue.includes('Task changed') ||
              issue.includes('Workflow type changed')
            );
            expect(criticalIssues.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
  describe('Property 15: Exact continuation point preservation', () => {
    it('should continue from exact point where previous session ended including task, sub-task, and approval state', () => {
      // **Validates: Requirements 5.3**
      
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
            phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
            currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            taskStatus: fc.constantFrom('not_started', 'in_progress', 'completed'),
            completedTasks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
            approvalStates: fc.dictionary(fc.string(), fc.boolean()),
            iterationCount: fc.integer({ min: 1, max: 50 }),
            lastUserFeedback: fc.option(fc.string({ maxLength: 200 }))
          }),
          (workflowConfig) => {
            const sessionController = new SessionController();
            
            // Create old state representing end of previous session
            const oldState: WorkflowState = {
              id: 'original-workflow',
              type: workflowConfig.type,
              phase: workflowConfig.phase,
              currentTask: workflowConfig.currentTask || undefined,
              progress: {
                completedTasks: workflowConfig.completedTasks,
                currentTaskStatus: workflowConfig.taskStatus,
                approvalStates: workflowConfig.approvalStates,
                iterationCount: workflowConfig.iterationCount,
                lastUserFeedback: workflowConfig.lastUserFeedback || undefined
              },
              documents: [],
              decisions: [],
              userPreferences: {
                theme: 'auto',
                language: 'en',
                notifications: true,
                autoSave: true,
                compressionLevel: 'medium'
              },
              timestamp: new Date('2024-01-01'),
              contextSize: 5000
            };
            
            // Create new state that should continue from exact same point
            const newState: WorkflowState = {
              ...oldState,
              id: 'restored-workflow',
              timestamp: new Date('2024-01-02') // Only timestamp should change
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify exact continuation point preservation
            expect(validation.isValid).toBe(true);
            expect(validation.continuityScore).toBeGreaterThanOrEqual(0.9);
            
            // Verify phase is exactly preserved
            expect(validation.preservedPhase).toBe(validation.restoredPhase);
            expect(validation.preservedPhase).toBe(workflowConfig.phase);
            
            // Verify task is exactly preserved
            expect(validation.preservedTask).toBe(validation.restoredTask);
            expect(validation.preservedTask).toBe(workflowConfig.currentTask || undefined);
            
            // Verify progress state is preserved (this is checked in validateProgressContinuity)
            expect(newState.progress.completedTasks).toEqual(oldState.progress.completedTasks);
            expect(newState.progress.currentTaskStatus).toBe(oldState.progress.currentTaskStatus);
            expect(newState.progress.approvalStates).toEqual(oldState.progress.approvalStates);
            expect(newState.progress.iterationCount).toBe(oldState.progress.iterationCount);
            expect(newState.progress.lastUserFeedback).toBe(oldState.progress.lastUserFeedback);
            
            // Verify no critical issues that would prevent exact continuation
            const criticalIssues = validation.issues.filter(issue => 
              issue.includes('mismatch') || 
              issue.includes('lost') || 
              issue.includes('changed') ||
              issue.includes('regressed')
            );
            expect(criticalIssues.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should detect when continuation point is not exact due to progress regression', () => {
      // **Validates: Requirements 5.3**
      
      fc.assert(
        fc.property(
          fc.record({
            type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
            phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
            currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
            completedTasks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 2, maxLength: 10 }),
            iterationCount: fc.integer({ min: 5, max: 50 })
          }),
          (workflowConfig) => {
            const sessionController = new SessionController();
            
            // Create old state
            const oldState: WorkflowState = {
              id: 'original-workflow',
              type: workflowConfig.type,
              phase: workflowConfig.phase,
              currentTask: workflowConfig.currentTask || undefined,
              progress: {
                completedTasks: workflowConfig.completedTasks,
                currentTaskStatus: 'completed',
                approvalStates: { 'task1': true, 'task2': true },
                iterationCount: workflowConfig.iterationCount,
                lastUserFeedback: 'Previous feedback'
              },
              documents: [],
              decisions: [],
              userPreferences: {
                theme: 'auto',
                language: 'en',
                notifications: true,
                autoSave: true,
                compressionLevel: 'medium'
              },
              timestamp: new Date('2024-01-01'),
              contextSize: 5000
            };
            
            // Create new state with regression (fewer completed tasks, lower iteration count, task status regression)
            const newState: WorkflowState = {
              ...oldState,
              progress: {
                completedTasks: workflowConfig.completedTasks.slice(0, -1), // Remove last completed task
                currentTaskStatus: 'in_progress', // Regressed from completed
                approvalStates: {}, // Lost approval states
                iterationCount: Math.max(1, workflowConfig.iterationCount - 2), // Decreased iteration count
                lastUserFeedback: undefined // Lost user feedback
              },
              id: 'restored-workflow',
              timestamp: new Date('2024-01-02')
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify regression is detected
            expect(validation.continuityScore).toBeLessThan(0.9); // Not exact continuation
            
            // Verify specific regression issues are reported
            const regressionIssues = validation.issues.filter(issue => 
              issue.includes('lost') || 
              issue.includes('decreased') || 
              issue.includes('regressed')
            );
            expect(regressionIssues.length).toBeGreaterThan(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should preserve exact approval states and iteration counts across sessions', () => {
      // **Validates: Requirements 5.3**
      
      fc.assert(
        fc.property(
          fc.record({
            approvalStates: fc.dictionary(
              fc.string({ minLength: 1, maxLength: 20 }), 
              fc.boolean(),
              { minKeys: 1, maxKeys: 10 }
            ),
            iterationCount: fc.integer({ min: 1, max: 100 }),
            completedTasks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { minLength: 1, maxLength: 15 }),
            currentTaskStatus: fc.constantFrom('not_started', 'in_progress', 'completed')
          }),
          (progressConfig) => {
            const sessionController = new SessionController();
            
            // Create workflow with specific progress state
            const oldState: WorkflowState = {
              id: 'original-workflow',
              type: 'spec-creation',
              phase: 'implementation',
              currentTask: 'Implement feature X',
              progress: {
                completedTasks: progressConfig.completedTasks,
                currentTaskStatus: progressConfig.currentTaskStatus,
                approvalStates: progressConfig.approvalStates,
                iterationCount: progressConfig.iterationCount,
                lastUserFeedback: 'User provided feedback'
              },
              documents: [],
              decisions: [],
              userPreferences: {
                theme: 'auto',
                language: 'en',
                notifications: true,
                autoSave: true,
                compressionLevel: 'medium'
              },
              timestamp: new Date('2024-01-01'),
              contextSize: 5000
            };
            
            // Create new state with identical progress (exact continuation)
            const newState: WorkflowState = {
              ...oldState,
              id: 'restored-workflow',
              timestamp: new Date('2024-01-02')
            };
            
            // Validate continuity
            const validation = sessionController.validateContinuity(oldState, newState);
            
            // Verify exact continuation is achieved
            expect(validation.isValid).toBe(true);
            expect(validation.continuityScore).toBeGreaterThanOrEqual(0.95);
            
            // Verify all progress elements are exactly preserved
            expect(newState.progress.completedTasks).toEqual(oldState.progress.completedTasks);
            expect(newState.progress.currentTaskStatus).toBe(oldState.progress.currentTaskStatus);
            expect(newState.progress.approvalStates).toEqual(oldState.progress.approvalStates);
            expect(newState.progress.iterationCount).toBe(oldState.progress.iterationCount);
            expect(newState.progress.lastUserFeedback).toBe(oldState.progress.lastUserFeedback);
            
            // Verify no progress-related issues
            const progressIssues = validation.issues.filter(issue => 
              issue.includes('Completed task lost') ||
              issue.includes('Iteration count decreased') ||
              issue.includes('Task status regressed')
            );
            expect(progressIssues.length).toBe(0);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain exact workflow state across multiple preservation-restoration cycles', () => {
      // **Validates: Requirements 5.3**
      
      fc.assert(
        fc.property(
          workflowStateGenerator(),
          fc.integer({ min: 2, max: 5 }),
          (originalWorkflow, cycleCount) => {
            const sessionController = new SessionController();
            
            let currentState = originalWorkflow;
            
            // Perform multiple preservation-restoration cycles
            for (let i = 0; i < cycleCount; i++) {
              // Simulate restoration (create new state with new ID and timestamp)
              const restoredState: WorkflowState = {
                ...currentState,
                id: `restored-${i}-${currentState.id}`,
                timestamp: new Date(Date.now() + i * 1000)
              };
              
              // Validate continuity from previous state
              const validation = sessionController.validateContinuity(currentState, restoredState);
              
              // Each cycle should maintain exact continuation
              expect(validation.isValid).toBe(true);
              expect(validation.continuityScore).toBeGreaterThanOrEqual(0.9);
              
              // Verify core workflow properties are preserved
              expect(validation.preservedPhase).toBe(validation.restoredPhase);
              expect(validation.preservedTask).toBe(validation.restoredTask);
              
              // Update current state for next cycle
              currentState = restoredState;
            }
            
            // After all cycles, verify final state maintains original workflow characteristics
            expect(currentState.type).toBe(originalWorkflow.type);
            expect(currentState.phase).toBe(originalWorkflow.phase);
            expect(currentState.currentTask).toBe(originalWorkflow.currentTask);
            expect(currentState.progress.completedTasks).toEqual(originalWorkflow.progress.completedTasks);
            expect(currentState.progress.currentTaskStatus).toBe(originalWorkflow.progress.currentTaskStatus);
            expect(currentState.progress.iterationCount).toBe(originalWorkflow.progress.iterationCount);
            
            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});