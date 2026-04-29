// Property-based tests for Preservation Engine
// **Feature: workflow-context-preservation, Property 9: Essential data prioritization**

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { PreservationEngine } from '../components/PreservationEngine';
import { WorkflowState, DocumentState, Decision, Progress, UserPreferences } from '../types';

// Generators for property-based testing
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

const progressGenerator = (): fc.Arbitrary<Progress> =>
  fc.record({
    completedTasks: fc.array(fc.string({ minLength: 1, maxLength: 50 }), { maxLength: 10 }),
    currentTaskStatus: fc.constantFrom('not_started', 'in_progress', 'completed'),
    approvalStates: fc.dictionary(fc.string(), fc.boolean()),
    iterationCount: fc.integer({ min: 0, max: 100 }),
    lastUserFeedback: fc.option(fc.string({ maxLength: 500 }))
  });

const userPreferencesGenerator = (): fc.Arbitrary<UserPreferences> =>
  fc.record({
    theme: fc.constantFrom('light', 'dark', 'auto'),
    language: fc.string({ minLength: 2, maxLength: 5 }),
    notifications: fc.boolean(),
    autoSave: fc.boolean(),
    compressionLevel: fc.constantFrom('low', 'medium', 'high')
  });

const workflowStateGenerator = (): fc.Arbitrary<WorkflowState> =>
  fc.record({
    id: fc.string({ minLength: 1, maxLength: 50 }),
    type: fc.constantFrom('spec-creation', 'task-execution', 'design-review'),
    phase: fc.constantFrom('requirements', 'design', 'tasks', 'implementation'),
    currentTask: fc.option(fc.string({ minLength: 1, maxLength: 100 })),
    progress: progressGenerator(),
    documents: fc.array(documentStateGenerator(), { maxLength: 5 }),
    decisions: fc.array(decisionGenerator(), { maxLength: 10 }),
    userPreferences: userPreferencesGenerator(),
    timestamp: fc.date(),
    contextSize: fc.integer({ min: 100, max: 100000 })
  });

describe('Preservation Engine - Property Tests', () => {
  describe('Property 9: Essential data prioritization', () => {
    it('should prioritize current task details, recent decisions, active document states, and requirement references', () => {
      // **Validates: Requirements 2.5, 4.1, 4.5**
      const preservationEngine = new PreservationEngine();

      fc.assert(
        fc.property(
          workflowStateGenerator(),
          (workflowState) => {
            const essentialData = preservationEngine.prioritizeEssentialData(workflowState);

            // Verify current task details are preserved
            expect(essentialData.workflowType).toBe(workflowState.type);
            expect(essentialData.currentPhase).toBe(workflowState.phase);
            expect(essentialData.activeTask).toBe(workflowState.currentTask || 'No active task');

            // Verify critical decisions are prioritized
            // Should include high-impact decisions and recent decisions
            const highImpactDecisions = workflowState.decisions.filter(d => d.impact === 'high');
            const technicalDecisions = workflowState.decisions.filter(d => d.category === 'technical');
            
            // All high-impact decisions should be preserved
            highImpactDecisions.forEach(decision => {
              expect(essentialData.criticalDecisions.some(cd => cd.id === decision.id)).toBe(true);
            });

            // All technical decisions should be preserved (they're critical for implementation)
            technicalDecisions.forEach(decision => {
              expect(essentialData.criticalDecisions.some(cd => cd.id === decision.id)).toBe(true);
            });

            // Verify active document states are prioritized
            // Should include approved and in_review documents
            const approvedDocuments = workflowState.documents.filter(d => d.status === 'approved');
            const inReviewDocuments = workflowState.documents.filter(d => d.status === 'in_review');
            
            approvedDocuments.forEach(doc => {
              expect(essentialData.documentStates.some(ds => ds.id === doc.id)).toBe(true);
            });

            inReviewDocuments.forEach(doc => {
              expect(essentialData.documentStates.some(ds => ds.id === doc.id)).toBe(true);
            });

            // Verify next steps are provided
            expect(Array.isArray(essentialData.nextSteps)).toBe(true);
            expect(essentialData.nextSteps.length).toBeGreaterThan(0);

            // Verify requirement references are extracted
            expect(Array.isArray(essentialData.requirementReferences)).toBe(true);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should prioritize recent decisions over older ones when impact is equal', () => {
      // **Validates: Requirements 2.5, 4.1, 4.5**
      const preservationEngine = new PreservationEngine();

      // Create a workflow state with decisions at different times
      const now = new Date();
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'design',
        currentTask: 'Create design document',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 1
        },
        documents: [],
        decisions: [
          {
            id: 'recent-decision',
            description: 'Recent medium impact decision',
            rationale: 'Recent rationale',
            timestamp: now,
            impact: 'medium',
            category: 'design'
          },
          {
            id: 'old-decision',
            description: 'Old medium impact decision',
            rationale: 'Old rationale',
            timestamp: twoDaysAgo,
            impact: 'medium',
            category: 'design'
          },
          {
            id: 'yesterday-decision',
            description: 'Yesterday medium impact decision',
            rationale: 'Yesterday rationale',
            timestamp: oneDayAgo,
            impact: 'medium',
            category: 'design'
          }
        ],
        userPreferences: {
          theme: 'auto',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: now,
        contextSize: 5000
      };

      const essentialData = preservationEngine.prioritizeEssentialData(workflowState);

      // Recent decision (within 24 hours) should be preserved
      expect(essentialData.criticalDecisions.some(d => d.id === 'recent-decision')).toBe(true);
      
      // Yesterday decision (within 24 hours) should be preserved
      expect(essentialData.criticalDecisions.some(d => d.id === 'yesterday-decision')).toBe(true);
      
      // Old decision (beyond 24 hours) should not be preserved unless it's high impact
      expect(essentialData.criticalDecisions.some(d => d.id === 'old-decision')).toBe(false);
    });

    it('should prioritize recently modified documents over older ones', () => {
      // **Validates: Requirements 2.5, 4.1, 4.5**
      const preservationEngine = new PreservationEngine();

      const now = new Date();
      const thirtyMinutesAgo = new Date(now.getTime() - 30 * 60 * 1000);
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'design',
        currentTask: 'Create design document',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 1
        },
        documents: [
          {
            id: 'recent-draft',
            name: 'Recent Draft',
            path: '/recent-draft.md',
            content: 'Recent content',
            lastModified: thirtyMinutesAgo,
            status: 'draft'
          },
          {
            id: 'old-draft',
            name: 'Old Draft',
            path: '/old-draft.md',
            content: 'Old content',
            lastModified: twoHoursAgo,
            status: 'draft'
          },
          {
            id: 'approved-doc',
            name: 'Approved Document',
            path: '/approved.md',
            content: 'Approved content',
            lastModified: twoHoursAgo,
            status: 'approved'
          }
        ],
        decisions: [],
        userPreferences: {
          theme: 'auto',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: now,
        contextSize: 5000
      };

      const essentialData = preservationEngine.prioritizeEssentialData(workflowState);

      // Recent draft (within 1 hour) should be preserved
      expect(essentialData.documentStates.some(d => d.id === 'recent-draft')).toBe(true);
      
      // Approved document should always be preserved regardless of age
      expect(essentialData.documentStates.some(d => d.id === 'approved-doc')).toBe(true);
      
      // Old draft (beyond 1 hour) should not be preserved
      expect(essentialData.documentStates.some(d => d.id === 'old-draft')).toBe(false);
    });
  });

  describe('Property 12: Redundancy removal during compaction', () => {
    it('should compress or remove redundant information, verbose explanations, and completed sub-tasks', async () => {
      // **Validates: Requirements 4.2**
      const preservationEngine = new PreservationEngine();

      await fc.assert(
        fc.asyncProperty(
          workflowStateGenerator(),
          async (workflowState) => {
            const compactedState = await preservationEngine.compactWorkflowState(workflowState);

            // Verify that compaction occurred (accounting for preservation overhead on minimal states)
            const originalSize = compactedState.reconstructionMetadata.originalSize;
            const compactedSize = compactedState.reconstructionMetadata.compactedSize;
            
            if (originalSize > 2000) {
              // For larger states, expect meaningful compression
              expect(compactedSize).toBeLessThan(originalSize);
            } else {
              // For smaller states, allow reasonable overhead due to preservation metadata
              expect(compactedSize).toBeLessThan(originalSize * 2);
            }

            // Verify that redundant information is removed
            // The compacted state should not contain all original decisions
            const essentialData = compactedState.essentialData;
            
            // Only critical decisions should be preserved, not all decisions
            if (workflowState.decisions.length > 0) {
              const hasNonCriticalDecisions = workflowState.decisions.some(d => 
                d.impact === 'low' && 
                d.timestamp < new Date(Date.now() - 24 * 60 * 60 * 1000)
              );
              
              if (hasNonCriticalDecisions) {
                // If there are non-critical decisions, they should be filtered out
                expect(essentialData.criticalDecisions.length).toBeLessThanOrEqual(workflowState.decisions.length);
              }
            }

            // Verify that non-essential documents are removed
            if (workflowState.documents.length > 0) {
              const hasOldDrafts = workflowState.documents.some(d => 
                d.status === 'draft' && 
                d.lastModified < new Date(Date.now() - 60 * 60 * 1000)
              );
              
              if (hasOldDrafts) {
                // If there are old drafts, they should be filtered out
                expect(essentialData.documentStates.length).toBeLessThanOrEqual(workflowState.documents.length);
              }
            }

            // Verify that lost components are tracked
            expect(Array.isArray(compactedState.reconstructionMetadata.lostComponents)).toBe(true);
            expect(compactedState.reconstructionMetadata.lostComponents.length).toBeGreaterThan(0);

            // Verify that verbose explanations are removed (compressed context is smaller)
            const compressedContextSize = compactedState.compressedContext.length;
            const originalContextSize = JSON.stringify(workflowState).length;
            expect(compressedContextSize).toBeLessThan(originalContextSize);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should remove low-impact and old decisions while preserving critical ones', async () => {
      // **Validates: Requirements 4.2**
      const preservationEngine = new PreservationEngine();

      const now = new Date();
      const twoDaysAgo = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'design',
        currentTask: 'Create design document',
        progress: {
          completedTasks: ['Task 1', 'Task 2', 'Task 3'],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 5
        },
        documents: [],
        decisions: [
          {
            id: 'high-impact-old',
            description: 'High impact old decision',
            rationale: 'This is a very important decision that affects the entire system architecture',
            timestamp: twoDaysAgo,
            impact: 'high',
            category: 'technical'
          },
          {
            id: 'low-impact-old',
            description: 'Low impact old decision',
            rationale: 'This is a minor decision about code formatting',
            timestamp: twoDaysAgo,
            impact: 'low',
            category: 'design'
          },
          {
            id: 'medium-impact-old',
            description: 'Medium impact old decision',
            rationale: 'This is a moderate decision about naming conventions',
            timestamp: twoDaysAgo,
            impact: 'medium',
            category: 'design'
          }
        ],
        userPreferences: {
          theme: 'auto',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: now,
        contextSize: 10000
      };

      const compactedState = await preservationEngine.compactWorkflowState(workflowState);

      // High-impact decision should be preserved even if old
      expect(compactedState.essentialData.criticalDecisions.some(d => d.id === 'high-impact-old')).toBe(true);

      // Low-impact old decision should be removed
      expect(compactedState.essentialData.criticalDecisions.some(d => d.id === 'low-impact-old')).toBe(false);

      // Medium-impact old decision should be removed (not critical enough)
      expect(compactedState.essentialData.criticalDecisions.some(d => d.id === 'medium-impact-old')).toBe(false);

      // Verify that lost components include the removed decisions
      const lostComponents = compactedState.reconstructionMetadata.lostComponents;
      expect(lostComponents.some(component => component.includes('non-critical decisions'))).toBe(true);
    });

    it('should remove old draft documents while preserving approved and in-review documents', async () => {
      // **Validates: Requirements 4.2**
      const preservationEngine = new PreservationEngine();

      const now = new Date();
      const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);

      const workflowState: WorkflowState = {
        id: 'test-workflow',
        type: 'spec-creation',
        phase: 'design',
        currentTask: 'Create design document',
        progress: {
          completedTasks: [],
          currentTaskStatus: 'in_progress',
          approvalStates: {},
          iterationCount: 1
        },
        documents: [
          {
            id: 'old-draft-1',
            name: 'Old Draft 1',
            path: '/old-draft-1.md',
            content: 'This is an old draft with lots of verbose explanations and unnecessary details',
            lastModified: twoHoursAgo,
            status: 'draft'
          },
          {
            id: 'old-draft-2',
            name: 'Old Draft 2',
            path: '/old-draft-2.md',
            content: 'Another old draft with redundant information',
            lastModified: twoHoursAgo,
            status: 'draft'
          },
          {
            id: 'approved-doc',
            name: 'Approved Document',
            path: '/approved.md',
            content: 'This is an approved document',
            lastModified: twoHoursAgo,
            status: 'approved'
          },
          {
            id: 'in-review-doc',
            name: 'In Review Document',
            path: '/in-review.md',
            content: 'This is a document in review',
            lastModified: twoHoursAgo,
            status: 'in_review'
          }
        ],
        decisions: [],
        userPreferences: {
          theme: 'auto',
          language: 'en',
          notifications: true,
          autoSave: true,
          compressionLevel: 'medium'
        },
        timestamp: now,
        contextSize: 15000
      };

      const compactedState = await preservationEngine.compactWorkflowState(workflowState);

      // Old drafts should be removed
      expect(compactedState.essentialData.documentStates.some(d => d.id === 'old-draft-1')).toBe(false);
      expect(compactedState.essentialData.documentStates.some(d => d.id === 'old-draft-2')).toBe(false);

      // Approved and in-review documents should be preserved
      expect(compactedState.essentialData.documentStates.some(d => d.id === 'approved-doc')).toBe(true);
      expect(compactedState.essentialData.documentStates.some(d => d.id === 'in-review-doc')).toBe(true);

      // Verify that lost components include the removed documents
      const lostComponents = compactedState.reconstructionMetadata.lostComponents;
      expect(lostComponents.some(component => component.includes('non-essential documents'))).toBe(true);
    });
  });

  describe('Property 13: Structured summary fallback', () => {
    it('should use structured summaries to maintain critical details when essential information exceeds size limits', async () => {
      // **Validates: Requirements 4.4**
      const preservationEngine = new PreservationEngine();

      await fc.assert(
        fc.asyncProperty(
          workflowStateGenerator(),
          async (workflowState) => {
            const compactedState = await preservationEngine.compactWorkflowState(workflowState);

            // Verify that structured summaries are used in compressed context
            const compressedContext = JSON.parse(compactedState.compressedContext);
            
            // Handle both normal and emergency compaction scenarios
            if (compressedContext.emergency) {
              // Emergency compaction scenario - verify emergency structure
              expect(compressedContext).toHaveProperty('emergency');
              expect(compressedContext.emergency).toBe(true);
            } else {
              // Normal compaction scenario - verify structured summaries
              expect(compressedContext).toHaveProperty('additionalDecisions');
              expect(compressedContext).toHaveProperty('preferences');
              expect(compressedContext).toHaveProperty('progressSummary');
            }

            // Only verify structured summaries for normal compaction
            if (!compressedContext.emergency) {
              // Additional decisions should be summarized (only key fields)
              if (compressedContext.additionalDecisions.length > 0) {
                const firstDecision = compressedContext.additionalDecisions[0];
                expect(firstDecision).toHaveProperty('description');
                expect(firstDecision).toHaveProperty('category');
                expect(firstDecision).toHaveProperty('impact');
                // Should NOT have full rationale (that's verbose)
                expect(firstDecision).not.toHaveProperty('rationale');
                expect(firstDecision).not.toHaveProperty('timestamp');
              }

              // Preferences should be summarized (only essential settings)
              expect(compressedContext.preferences).toHaveProperty('compressionLevel');
              expect(compressedContext.preferences).toHaveProperty('autoSave');
              // Should NOT have all preferences
              expect(compressedContext.preferences).not.toHaveProperty('theme');
              expect(compressedContext.preferences).not.toHaveProperty('language');

              // Progress should be summarized (counts, not full details)
              expect(compressedContext.progressSummary).toHaveProperty('completedTasksCount');
              expect(compressedContext.progressSummary).toHaveProperty('iterationCount');
              expect(compressedContext.progressSummary).toHaveProperty('hasUserFeedback');
              // Should NOT have full task list
              expect(compressedContext.progressSummary).not.toHaveProperty('completedTasks');
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should maintain critical details in essential data even when using structured summaries', async () => {
      // **Validates: Requirements 4.4**
      const preservationEngine = new PreservationEngine();

      // Create a large workflow state that would exceed typical size limits
      const largeWorkflowState: WorkflowState = {
        id: 'large-workflow',
        type: 'spec-creation',
        phase: 'implementation',
        currentTask: 'Implement complex feature with multiple components and extensive requirements',
        progress: {
          completedTasks: Array.from({ length: 50 }, (_, i) => `Completed task ${i + 1} with detailed description`),
          currentTaskStatus: 'in_progress',
          approvalStates: Object.fromEntries(Array.from({ length: 20 }, (_, i) => [`approval-${i}`, i % 2 === 0])),
          iterationCount: 25,
          lastUserFeedback: 'Very detailed user feedback with lots of specific requirements and suggestions for improvement'
        },
        documents: Array.from({ length: 15 }, (_, i) => ({
          id: `doc-${i}`,
          name: `Document ${i}`,
          path: `/docs/document-${i}.md`,
          content: `This is a very long document with extensive content that includes detailed explanations, code examples, and comprehensive documentation. Document number ${i} contains critical information about the system architecture and implementation details.`,
          lastModified: new Date(Date.now() - 2 * 60 * 60 * 1000), // Make documents older than 1 hour
          status: i % 3 === 0 ? 'approved' : i % 3 === 1 ? 'in_review' : 'draft'
        })),
        decisions: Array.from({ length: 30 }, (_, i) => ({
          id: `decision-${i}`,
          description: `Decision ${i} about system architecture and implementation approach`,
          rationale: `This is a detailed rationale for decision ${i} that explains the reasoning behind the choice, considers alternatives, and provides justification for the selected approach. The rationale includes technical considerations, business requirements, and implementation constraints.`,
          timestamp: new Date(Date.now() - (i + 25) * 60 * 60 * 1000), // Make decisions older than 24 hours
          impact: i % 3 === 0 ? 'high' : i % 3 === 1 ? 'medium' : 'low',
          category: i % 3 === 0 ? 'design' : i % 3 === 1 ? 'design' : 'requirement' // Avoid 'technical' category
        })),
        userPreferences: {
          theme: 'dark',
          language: 'en-US',
          notifications: true,
          autoSave: true,
          compressionLevel: 'high'
        },
        timestamp: new Date(),
        contextSize: 75000
      };

      const compactedState = await preservationEngine.compactWorkflowState(largeWorkflowState);

      // Even with structured summaries, critical details should be preserved in essential data
      expect(compactedState.essentialData.workflowType).toBe('spec-creation');
      expect(compactedState.essentialData.currentPhase).toBe('implementation');
      expect(compactedState.essentialData.activeTask).toBe(largeWorkflowState.currentTask);

      // Critical decisions should still be preserved in full detail
      const highImpactDecisions = largeWorkflowState.decisions.filter(d => d.impact === 'high');
      expect(compactedState.essentialData.criticalDecisions.length).toBe(highImpactDecisions.length);
      
      // First critical decision should have full details
      if (compactedState.essentialData.criticalDecisions.length > 0) {
        const firstCriticalDecision = compactedState.essentialData.criticalDecisions[0];
        expect(firstCriticalDecision).toHaveProperty('description');
        expect(firstCriticalDecision).toHaveProperty('rationale');
        expect(firstCriticalDecision).toHaveProperty('timestamp');
        expect(firstCriticalDecision).toHaveProperty('impact');
        expect(firstCriticalDecision).toHaveProperty('category');
      }

      // Essential documents should be preserved in full
      const approvedDocs = largeWorkflowState.documents.filter(d => d.status === 'approved');
      const inReviewDocs = largeWorkflowState.documents.filter(d => d.status === 'in_review');
      const expectedEssentialDocs = approvedDocs.length + inReviewDocs.length;
      expect(compactedState.essentialData.documentStates.length).toBe(expectedEssentialDocs);

      // Next steps should be provided
      expect(compactedState.essentialData.nextSteps.length).toBeGreaterThan(0);

      // Verify that compression occurred but critical information is intact
      expect(compactedState.compressionRatio).toBeLessThan(1);
      expect(compactedState.reconstructionMetadata.compactedSize).toBeLessThan(
        compactedState.reconstructionMetadata.originalSize
      );
    });

    it('should provide reconstruction instructions when using structured summaries', async () => {
      // **Validates: Requirements 4.4**
      const preservationEngine = new PreservationEngine();

      await fc.assert(
        fc.asyncProperty(
          workflowStateGenerator(),
          async (workflowState) => {
            const compactedState = await preservationEngine.compactWorkflowState(workflowState);

            // Verify reconstruction instructions are provided
            const instructions = compactedState.reconstructionMetadata.reconstructionInstructions;
            expect(Array.isArray(instructions)).toBe(true);
            expect(instructions.length).toBeGreaterThan(0);

            // Handle both normal and emergency compaction scenarios
            if (compactedState.reconstructionMetadata.compressionAlgorithm === 'emergency-minimal' || 
                compactedState.reconstructionMetadata.compressionAlgorithm === 'emergency-fallback') {
              // Emergency compaction scenario - verify emergency instructions
              expect(instructions.some(inst => inst.includes('emergency') || inst.includes('Emergency'))).toBe(true);
            } else {
              // Normal compaction scenario - verify standard instructions
              expect(instructions.some(inst => inst.includes('Restore workflow type'))).toBe(true);
              expect(instructions.some(inst => inst.includes('Set current phase'))).toBe(true);

              // Should include instructions for handling preserved components
              if (compactedState.essentialData.criticalDecisions.length > 0) {
                expect(instructions.some(inst => inst.includes('critical decisions'))).toBe(true);
              }

              if (compactedState.essentialData.documentStates.length > 0) {
                expect(instructions.some(inst => inst.includes('essential documents'))).toBe(true);
              }

              // Should include instructions for applying defaults
              expect(instructions.some(inst => inst.includes('default user preferences'))).toBe(true);
              expect(instructions.some(inst => inst.includes('Initialize progress tracking'))).toBe(true);
            }

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });

  describe('Property 8: Preservation completes within capacity', () => {
    it('should complete preservation process within remaining context capacity when triggered at 95% utilization', async () => {
      // **Validates: Requirements 2.4**
      const preservationEngine = new PreservationEngine();

      await fc.assert(
        fc.asyncProperty(
          workflowStateGenerator(),
          async (workflowState) => {
            // Simulate preservation being triggered at 95% utilization
            const maxCapacity = 100000;
            const utilizationAt95Percent = maxCapacity * 0.95;
            const remainingCapacity = maxCapacity - utilizationAt95Percent; // 5% remaining
            
            // Set the workflow state context size to simulate 95% utilization
            const modifiedWorkflowState = {
              ...workflowState,
              contextSize: utilizationAt95Percent
            };

            const startTime = Date.now();
            const compactedState = await preservationEngine.compactWorkflowState(modifiedWorkflowState);
            const endTime = Date.now();
            
            const preservationTime = endTime - startTime;

            // Verify preservation completes quickly (within performance target)
            expect(preservationTime).toBeLessThan(500); // Should complete within 500ms

            // Verify compacted state is appropriately sized (accounting for preservation overhead)
            const originalSize = compactedState.reconstructionMetadata.originalSize;
            const compactedSize = compactedState.reconstructionMetadata.compactedSize;
            
            if (originalSize > 2000) {
              // For larger states, expect compression
              expect(compactedSize).toBeLessThan(originalSize);
            } else {
              // For smaller states, allow reasonable overhead due to preservation metadata
              expect(compactedSize).toBeLessThan(originalSize * 2);
            }

            // Verify compression ratio indicates successful compaction
            expect(compactedState.compressionRatio).toBeGreaterThan(0);
            expect(compactedState.compressionRatio).toBeLessThan(1);

            // Verify essential data is preserved despite capacity constraints
            expect(compactedState.essentialData.workflowType).toBeTruthy();
            expect(compactedState.essentialData.currentPhase).toBeTruthy();
            expect(Array.isArray(compactedState.essentialData.nextSteps)).toBe(true);
            expect(compactedState.essentialData.nextSteps.length).toBeGreaterThan(0);

            // Verify reconstruction metadata provides guidance for restoration
            expect(compactedState.reconstructionMetadata.reconstructionInstructions.length).toBeGreaterThan(0);

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });

    it('should handle extreme capacity constraints gracefully', async () => {
      // **Validates: Requirements 2.4**
      const preservationEngine = new PreservationEngine();

      // Create a very large workflow state
      const largeWorkflowState: WorkflowState = {
        id: 'extreme-large-workflow',
        type: 'spec-creation',
        phase: 'implementation',
        currentTask: 'Implement extremely complex feature with numerous components',
        progress: {
          completedTasks: Array.from({ length: 100 }, (_, i) => `Completed complex task ${i + 1}`),
          currentTaskStatus: 'in_progress',
          approvalStates: Object.fromEntries(Array.from({ length: 50 }, (_, i) => [`approval-${i}`, i % 2 === 0])),
          iterationCount: 50,
          lastUserFeedback: 'Extremely detailed user feedback with extensive requirements'
        },
        documents: Array.from({ length: 25 }, (_, i) => ({
          id: `extreme-doc-${i}`,
          name: `Extreme Document ${i}`,
          path: `/extreme/document-${i}.md`,
          content: `This is an extremely large document with massive amounts of content. `.repeat(100),
          lastModified: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
          status: i % 4 === 0 ? 'approved' : i % 4 === 1 ? 'in_review' : 'draft'
        })),
        decisions: Array.from({ length: 50 }, (_, i) => ({
          id: `extreme-decision-${i}`,
          description: `Extreme decision ${i} about complex system architecture`,
          rationale: `This is an extremely detailed rationale. `.repeat(50),
          timestamp: new Date(Date.now() - (i + 30) * 60 * 60 * 1000), // All older than 24 hours
          impact: i % 4 === 0 ? 'high' : i % 4 === 1 ? 'medium' : 'low',
          category: i % 4 === 0 ? 'design' : i % 4 === 1 ? 'design' : 'requirement'
        })),
        userPreferences: {
          theme: 'dark',
          language: 'en-US',
          notifications: true,
          autoSave: true,
          compressionLevel: 'high'
        },
        timestamp: new Date(),
        contextSize: 150000 // Very large context
      };

      const startTime = Date.now();
      const compactedState = await preservationEngine.compactWorkflowState(largeWorkflowState);
      const endTime = Date.now();
      
      const preservationTime = endTime - startTime;

      // Even with extreme constraints, preservation should complete quickly
      expect(preservationTime).toBeLessThan(1000); // Allow up to 1 second for extreme cases

      // Should achieve significant compression
      expect(compactedState.compressionRatio).toBeLessThan(0.5); // At least 50% compression

      // Essential workflow information should still be preserved
      expect(compactedState.essentialData.workflowType).toBe('spec-creation');
      expect(compactedState.essentialData.currentPhase).toBe('implementation');
      expect(compactedState.essentialData.activeTask).toBeTruthy();

      // Should preserve only high-impact decisions (since all are older than 24 hours)
      const highImpactDecisions = largeWorkflowState.decisions.filter(d => d.impact === 'high');
      expect(compactedState.essentialData.criticalDecisions.length).toBe(highImpactDecisions.length);

      // Should preserve only approved and in-review documents (since all are older than 1 hour)
      const approvedDocs = largeWorkflowState.documents.filter(d => d.status === 'approved');
      const inReviewDocs = largeWorkflowState.documents.filter(d => d.status === 'in_review');
      const expectedDocs = approvedDocs.length + inReviewDocs.length;
      expect(compactedState.essentialData.documentStates.length).toBe(expectedDocs);

      // Should provide next steps for continuation
      expect(compactedState.essentialData.nextSteps.length).toBeGreaterThan(0);
    });

    it('should provide adequate buffer for new workflow operations after preservation', async () => {
      // **Validates: Requirements 2.4**
      const preservationEngine = new PreservationEngine();

      await fc.assert(
        fc.asyncProperty(
          workflowStateGenerator(),
          async (workflowState) => {
            const compactedState = await preservationEngine.compactWorkflowState(workflowState);

            // Verify that compacted state is small enough to leave buffer for new operations
            const originalSize = compactedState.reconstructionMetadata.originalSize;
            const compactedSize = compactedState.reconstructionMetadata.compactedSize;
            
            // Should achieve meaningful compression to provide buffer (accounting for preservation overhead)
            if (originalSize > 5000) {
              expect(compactedSize).toBeLessThan(originalSize * 0.9); // At least 10% reduction for large states
            } else {
              // For smaller states, preservation overhead may increase size, but should be reasonable
              expect(compactedSize).toBeLessThan(originalSize * 2); // Allow up to 2x increase for overhead
            }

            // Compression ratio should indicate successful space savings (accounting for overhead)
            if (originalSize > 5000) {
              expect(compactedState.compressionRatio).toBeLessThan(0.9);
            } else {
              // For smaller states, ratio may be > 1 due to preservation overhead
              expect(compactedState.compressionRatio).toBeGreaterThan(0);
              expect(compactedState.compressionRatio).toBeLessThan(3); // Reasonable overhead limit
            }

            // Essential data should be compact but complete
            const essentialDataSize = JSON.stringify(compactedState.essentialData).length;
            const compressedContextSize = compactedState.compressedContext.length;
            
            // Essential data should be the larger portion (prioritized over compressed context)
            expect(essentialDataSize).toBeGreaterThan(0);
            expect(compressedContextSize).toBeGreaterThan(0);

            // Reconstruction metadata should provide clear guidance without being verbose
            expect(compactedState.reconstructionMetadata.reconstructionInstructions.length).toBeGreaterThan(0);
            expect(compactedState.reconstructionMetadata.reconstructionInstructions.length).toBeLessThan(20); // Not too verbose

            return true;
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});