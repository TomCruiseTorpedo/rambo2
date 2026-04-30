// Session Controller Component
// Manages session transitions and workflow continuity

import { 
  WorkflowState, 
  CompactedState, 
  PreservedState,
  Progress,
  EssentialData
} from '../types';
import { ErrorHandler, ErrorType, ErrorContext, WorkflowPreservationError } from '../utils/ErrorHandler';
import { WorkflowManager } from './WorkflowManager';
import { PreservationEngine } from './PreservationEngine';
import { RestorationEngine } from './RestorationEngine';

export interface RolloverResult {
  success: boolean;
  preservedStateId?: string;
  continuationSummary: string;
  nextSteps: string[];
  errors?: string[];
}

export interface ContinuityValidation {
  isValid: boolean;
  preservedPhase: string;
  preservedTask?: string;
  restoredPhase: string;
  restoredTask?: string;
  continuityScore: number; // 0-1, where 1 is perfect continuity
  issues: string[];
}

export class SessionController {
  private workflowManager: WorkflowManager;
  private preservationEngine: PreservationEngine;
  private restorationEngine: RestorationEngine;
  private errorHandler: ErrorHandler;

  constructor(
    workflowManager?: WorkflowManager,
    preservationEngine?: PreservationEngine,
    restorationEngine?: RestorationEngine,
    storageBasePath: string = '.kiro/state/workflows'
  ) {
    this.workflowManager = workflowManager || new WorkflowManager();
    this.preservationEngine = preservationEngine || new PreservationEngine(storageBasePath);
    this.restorationEngine = restorationEngine || new RestorationEngine(storageBasePath);
    this.errorHandler = new ErrorHandler(storageBasePath);
  }

  /**
   * Initiates rollover process when context limits are approached with error handling
   * Preserves current workflow state and prepares for new session
   */
  async initiateRollover(contextUtilization?: number): Promise<RolloverResult> {
    const context: ErrorContext = {
      operation: 'initiateRollover',
      timestamp: new Date(),
      additionalInfo: { contextUtilization }
    };

    try {
      const errors: string[] = [];
      let preservedStateId: string | undefined;
      
      // Capture current workflow states
      const currentStates = this.workflowManager.captureCurrentState();
      
      if (currentStates.length === 0) {
        return {
          success: false,
          continuationSummary: 'No active workflows found to preserve',
          nextSteps: ['Start a new workflow when ready'],
          errors: ['No active workflows to preserve']
        };
      }

      // Check if we're in emergency context limit situation
      const isEmergency = contextUtilization && contextUtilization >= 99;

      // Preserve each active workflow
      const preservedStates: string[] = [];
      
      for (const workflowState of currentStates) {
        try {
          if (isEmergency) {
            // Handle context limit exceeded scenario
            const recoveryResult = await this.errorHandler.handleContextLimitExceeded(
              workflowState,
              { ...context, workflowId: workflowState.id }
            );
            
            if (recoveryResult.success && recoveryResult.recoveredData) {
              preservedStates.push(recoveryResult.recoveredData.id);
              if (!preservedStateId) {
                preservedStateId = recoveryResult.recoveredData.id;
              }
            } else {
              errors.push(`Emergency preservation failed for workflow ${workflowState.id}`);
            }
          } else {
            // Normal preservation process
            const compactedState = await this.preservationEngine.compactWorkflowState(workflowState);
            
            // Save to persistent storage
            const filePath = await this.preservationEngine.saveWorkflowState(compactedState);
            preservedStates.push(compactedState.id);
            
            // Use the first preserved state as the primary one for summary
            if (!preservedStateId) {
              preservedStateId = compactedState.id;
            }
          }
        } catch (error) {
          const errorMsg = `Failed to preserve workflow ${workflowState.id}: ${error instanceof Error ? error.message : 'Unknown error'}`;
          errors.push(errorMsg);
          
          // Try emergency preservation as fallback
          try {
            const recoveryResult = await this.errorHandler.handleContextLimitExceeded(
              workflowState,
              { ...context, workflowId: workflowState.id }
            );
            
            if (recoveryResult.success && recoveryResult.recoveredData) {
              preservedStates.push(recoveryResult.recoveredData.id);
              if (!preservedStateId) {
                preservedStateId = recoveryResult.recoveredData.id;
              }
              errors.push(`Used emergency preservation for workflow ${workflowState.id}`);
            }
          } catch (emergencyError) {
            errors.push(`Emergency preservation also failed for workflow ${workflowState.id}`);
          }
        }
      }

      // Generate continuation summary
      const primaryWorkflow = currentStates[0]; // Use first workflow for primary summary
      const continuationSummary = this.generateContinuationSummary(primaryWorkflow);
      
      // Generate next steps
      const nextSteps = this.generateNextSteps(currentStates);

      return {
        success: preservedStates.length > 0,
        preservedStateId,
        continuationSummary,
        nextSteps,
        errors: errors.length > 0 ? errors : undefined
      };
    } catch (error) {
      // Handle complete rollover failure
      const currentStates = this.workflowManager.captureCurrentState();
      if (currentStates.length > 0) {
        // Try emergency preservation for all workflows
        const emergencyResults: string[] = [];
        
        for (const workflowState of currentStates) {
          try {
            const recoveryResult = await this.errorHandler.handleContextLimitExceeded(
              workflowState,
              { ...context, workflowId: workflowState.id }
            );
            
            if (recoveryResult.success) {
              emergencyResults.push(`Emergency backup created for ${workflowState.id}`);
            }
          } catch (emergencyError) {
            emergencyResults.push(`Failed to create emergency backup for ${workflowState.id}`);
          }
        }
        
        return {
          success: emergencyResults.length > 0,
          continuationSummary: 'Rollover failed, emergency preservation attempted',
          nextSteps: [
            'Check emergency backups in .kiro/state/workflows/emergency/',
            'Manually reconstruct workflow state if needed',
            'Start new session and attempt to load emergency backups'
          ],
          errors: [`Rollover failed: ${error instanceof Error ? error.message : 'Unknown error'}`, ...emergencyResults]
        };
      }
      
      return {
        success: false,
        continuationSummary: 'Failed to initiate rollover process',
        nextSteps: ['Check system logs and retry rollover'],
        errors: [`Rollover failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Validates continuity between old and new workflow states
   * Ensures proper restoration and workflow continuation
   */
  validateContinuity(oldState: WorkflowState, newState: WorkflowState): ContinuityValidation {
    const issues: string[] = [];
    let continuityScore = 1.0;

    // Validate phase continuity
    const phaseMatch = oldState.phase === newState.phase;
    if (!phaseMatch) {
      issues.push(`Phase mismatch: expected '${oldState.phase}', got '${newState.phase}'`);
      continuityScore -= 0.3;
    }

    // Validate task continuity
    const taskMatch = oldState.currentTask === newState.currentTask;
    if (!taskMatch) {
      if (oldState.currentTask && !newState.currentTask) {
        issues.push(`Active task lost: '${oldState.currentTask}' not restored`);
        continuityScore -= 0.2;
      } else if (!oldState.currentTask && newState.currentTask) {
        // This is acceptable - new task started
      } else if (oldState.currentTask && newState.currentTask) {
        issues.push(`Task changed: '${oldState.currentTask}' -> '${newState.currentTask}'`);
        continuityScore -= 0.1;
      }
    }

    // Validate workflow type continuity
    if (oldState.type !== newState.type) {
      issues.push(`Workflow type changed: '${oldState.type}' -> '${newState.type}'`);
      continuityScore -= 0.4;
    }

    // Validate progress continuity
    const progressIssues = this.validateProgressContinuity(oldState.progress, newState.progress);
    issues.push(...progressIssues);
    if (progressIssues.length > 0) {
      // Any progress regression must pull score below 0.9 (first issue deducts 0.11; more issues add up to a cap).
      continuityScore -= Math.min(0.4, 0.11 + (progressIssues.length - 1) * 0.06);
    }

    // Validate document preservation
    const documentIssues = this.validateDocumentContinuity(oldState.documents, newState.documents);
    issues.push(...documentIssues);
    if (documentIssues.length > 0) {
      continuityScore -= Math.min(0.1, documentIssues.length * 0.02);
    }

    // Validate decision preservation
    const decisionIssues = this.validateDecisionContinuity(oldState.decisions, newState.decisions);
    issues.push(...decisionIssues);
    if (decisionIssues.length > 0) {
      continuityScore -= Math.min(0.1, decisionIssues.length * 0.02);
    }

    // Ensure score doesn't go below 0
    continuityScore = Math.max(0, continuityScore);

    return {
      isValid: continuityScore >= 0.7, // Consider valid if 70% or higher continuity
      preservedPhase: oldState.phase,
      preservedTask: oldState.currentTask,
      restoredPhase: newState.phase,
      restoredTask: newState.currentTask,
      continuityScore,
      issues
    };
  }

  /**
   * Generates comprehensive continuation summary for rollover and restoration events
   * Provides clear status of preserved state, current position, and next steps
   */
  generateContinuationSummary(workflowState: WorkflowState): string {
    const summary: string[] = [];
    
    // Header
    summary.push('=== Workflow Continuation Summary ===');
    summary.push('');
    
    // Workflow identification
    summary.push(`Workflow Type: ${workflowState.type}`);
    summary.push(`Current Phase: ${workflowState.phase}`);
    
    if (workflowState.currentTask) {
      summary.push(`Active Task: ${workflowState.currentTask}`);
    } else {
      summary.push('Active Task: None');
    }
    
    summary.push('');
    
    // Progress status
    summary.push('Progress Status:');
    summary.push(`- Completed Tasks: ${workflowState.progress.completedTasks.length}`);
    summary.push(`- Current Task Status: ${workflowState.progress.currentTaskStatus}`);
    summary.push(`- Iteration Count: ${workflowState.progress.iterationCount}`);
    
    if (workflowState.progress.lastUserFeedback) {
      summary.push(`- Last User Feedback: Available`);
    }
    
    summary.push('');
    
    // Document status
    summary.push('Document Status:');
    if (workflowState.documents.length > 0) {
      const approvedDocs = workflowState.documents.filter(d => d.status === 'approved').length;
      const inReviewDocs = workflowState.documents.filter(d => d.status === 'in_review').length;
      const draftDocs = workflowState.documents.filter(d => d.status === 'draft').length;
      
      summary.push(`- Total Documents: ${workflowState.documents.length}`);
      summary.push(`- Approved: ${approvedDocs}, In Review: ${inReviewDocs}, Draft: ${draftDocs}`);
      
      // List recent documents
      const recentDocs = workflowState.documents
        .sort((a, b) => b.lastModified.getTime() - a.lastModified.getTime())
        .slice(0, 3);
      
      summary.push('- Recent Documents:');
      for (const doc of recentDocs) {
        summary.push(`  * ${doc.name} (${doc.status})`);
      }
    } else {
      summary.push('- No documents in workflow');
    }
    
    summary.push('');
    
    // Decision status
    summary.push('Decision Status:');
    if (workflowState.decisions.length > 0) {
      const highImpactDecisions = workflowState.decisions.filter(d => d.impact === 'high').length;
      const recentDecisions = workflowState.decisions.filter(d => {
        const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
        return d.timestamp >= oneDayAgo;
      }).length;
      
      summary.push(`- Total Decisions: ${workflowState.decisions.length}`);
      summary.push(`- High Impact: ${highImpactDecisions}, Recent (24h): ${recentDecisions}`);
      
      // List recent high-impact decisions
      const recentHighImpact = workflowState.decisions
        .filter(d => d.impact === 'high')
        .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
        .slice(0, 2);
      
      if (recentHighImpact.length > 0) {
        summary.push('- Recent High-Impact Decisions:');
        for (const decision of recentHighImpact) {
          summary.push(`  * ${decision.description} (${decision.category})`);
        }
      }
    } else {
      summary.push('- No decisions recorded');
    }
    
    summary.push('');
    
    // Context information
    summary.push('Context Information:');
    summary.push(`- Context Size: ${workflowState.contextSize} characters`);
    
    // Handle invalid dates gracefully
    const lastUpdated = workflowState.timestamp && !isNaN(workflowState.timestamp.getTime()) 
      ? workflowState.timestamp.toISOString()
      : 'Unknown';
    summary.push(`- Last Updated: ${lastUpdated}`);
    summary.push(`- User Preferences: ${workflowState.userPreferences.compressionLevel} compression`);
    
    summary.push('');
    summary.push('=== End Summary ===');
    
    return summary.join('\n');
  }

  /**
   * Restores workflow from most recent preserved state
   */
  async restoreFromPreservedState(): Promise<WorkflowState | null> {
    try {
      const restoredState = await this.restorationEngine.loadWorkflowState();
      
      if (restoredState) {
        // Add restored workflow to active workflows
        this.workflowManager.restoreWorkflow(restoredState);
      }
      
      return restoredState;
    } catch (error) {
      console.error('Failed to restore from preserved state:', error);
      return null;
    }
  }

  /**
   * Gets status of available preserved states
   */
  async getPreservedStateStatus(): Promise<PreservedState[]> {
    try {
      return await this.restorationEngine.detectPreservedStates();
    } catch (error) {
      console.error('Failed to get preserved state status:', error);
      return [];
    }
  }

  /**
   * Validates progress continuity between old and new states
   */
  private validateProgressContinuity(oldProgress: Progress, newProgress: Progress): string[] {
    const issues: string[] = [];
    
    // Check if completed tasks are preserved
    const oldCompletedSet = new Set(oldProgress.completedTasks);
    const newCompletedSet = new Set(newProgress.completedTasks);
    
    for (const task of oldProgress.completedTasks) {
      if (!newCompletedSet.has(task)) {
        issues.push(`Completed task lost: '${task}'`);
      }
    }
    
    // Check if iteration count is reasonable
    if (newProgress.iterationCount < oldProgress.iterationCount) {
      issues.push(`Iteration count decreased: ${oldProgress.iterationCount} -> ${newProgress.iterationCount}`);
    }
    
    // Check task status continuity
    if (oldProgress.currentTaskStatus === 'completed' && newProgress.currentTaskStatus === 'in_progress') {
      issues.push('Task status regressed from completed to in_progress');
    }
    
    return issues;
  }

  /**
   * Validates document continuity between old and new states
   */
  private validateDocumentContinuity(oldDocs: any[], newDocs: any[]): string[] {
    const issues: string[] = [];
    
    // Check for lost approved documents
    const oldApprovedDocs = oldDocs.filter(d => d.status === 'approved');
    const newDocIds = new Set(newDocs.map(d => d.id));
    
    for (const approvedDoc of oldApprovedDocs) {
      if (!newDocIds.has(approvedDoc.id)) {
        issues.push(`Approved document lost: '${approvedDoc.name}'`);
      }
    }
    
    return issues;
  }

  /**
   * Validates decision continuity between old and new states
   */
  private validateDecisionContinuity(oldDecisions: any[], newDecisions: any[]): string[] {
    const issues: string[] = [];
    
    // Check for lost high-impact decisions
    const oldHighImpactDecisions = oldDecisions.filter(d => d.impact === 'high');
    const newDecisionIds = new Set(newDecisions.map(d => d.id));
    
    for (const highImpactDecision of oldHighImpactDecisions) {
      if (!newDecisionIds.has(highImpactDecision.id)) {
        issues.push(`High-impact decision lost: '${highImpactDecision.description}'`);
      }
    }
    
    return issues;
  }

  /**
   * Generates next steps based on current workflow states
   */
  private generateNextSteps(workflowStates: WorkflowState[]): string[] {
    const nextSteps: string[] = [];
    
    if (workflowStates.length === 0) {
      nextSteps.push('Start a new workflow when ready');
      return nextSteps;
    }
    
    // Generate steps for primary workflow
    const primaryWorkflow = workflowStates[0];
    
    // Phase-specific next steps
    switch (primaryWorkflow.phase) {
      case 'requirements':
        nextSteps.push('Continue refining requirements document');
        if (primaryWorkflow.progress.currentTaskStatus !== 'completed') {
          nextSteps.push('Complete current requirements task');
        }
        nextSteps.push('Seek user approval for requirements');
        break;
        
      case 'design':
        nextSteps.push('Continue developing design document');
        nextSteps.push('Review and validate correctness properties');
        if (primaryWorkflow.progress.currentTaskStatus !== 'completed') {
          nextSteps.push('Complete current design task');
        }
        nextSteps.push('Seek user approval for design');
        break;
        
      case 'tasks':
        nextSteps.push('Finalize implementation task list');
        if (primaryWorkflow.progress.currentTaskStatus !== 'completed') {
          nextSteps.push('Complete current task planning');
        }
        nextSteps.push('Seek user approval for task list');
        break;
        
      case 'implementation':
        if (primaryWorkflow.currentTask) {
          nextSteps.push(`Resume implementation: ${primaryWorkflow.currentTask}`);
        } else {
          nextSteps.push('Continue with next implementation task');
        }
        nextSteps.push('Execute remaining implementation tasks');
        nextSteps.push('Run tests and validate implementation');
        break;
    }
    
    // Add multi-workflow steps if applicable
    if (workflowStates.length > 1) {
      nextSteps.push(`Manage ${workflowStates.length} concurrent workflows`);
      nextSteps.push('Prioritize workflows based on urgency and dependencies');
    }
    
    // Add general continuation steps
    nextSteps.push('Review preserved state and validate continuity');
    nextSteps.push('Update progress tracking as work continues');
    
    return nextSteps;
  }
}