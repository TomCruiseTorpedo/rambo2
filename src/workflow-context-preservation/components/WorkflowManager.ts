// Workflow Manager Component
// Manages active workflow state and coordinates preservation

import { 
  WorkflowState, 
  WorkflowInfo, 
  Progress, 
  DocumentState, 
  Decision, 
  UserPreferences 
} from '../types';

export class WorkflowManager {
  private activeWorkflows: Map<string, WorkflowState> = new Map();
  private workflowCounter: number = 0;

  /**
   * Captures the current state of all active workflows
   */
  captureCurrentState(): WorkflowState[] {
    return Array.from(this.activeWorkflows.values());
  }

  /**
   * Gets information about all active workflows
   */
  getActiveWorkflows(): WorkflowInfo[] {
    return Array.from(this.activeWorkflows.values()).map(workflow => ({
      id: workflow.id,
      type: workflow.type,
      phase: workflow.phase,
      lastActivity: workflow.timestamp,
      priority: this.calculatePriority(workflow)
    }));
  }

  /**
   * Updates progress for a specific workflow
   */
  updateWorkflowProgress(workflowId: string, progress: Progress): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.progress = progress;
      workflow.timestamp = new Date();
    }
  }

  /**
   * Creates a new workflow and adds it to active workflows
   */
  createWorkflow(
    type: WorkflowState['type'],
    phase: WorkflowState['phase'] = 'requirements',
    currentTask?: string
  ): string {
    const workflowId = this.generateWorkflowId();
    
    const newWorkflow: WorkflowState = {
      id: workflowId,
      type,
      phase,
      currentTask,
      progress: {
        completedTasks: [],
        currentTaskStatus: 'not_started',
        approvalStates: {},
        iterationCount: 0
      },
      documents: [],
      decisions: [],
      userPreferences: this.getDefaultUserPreferences(),
      timestamp: new Date(),
      contextSize: 0
    };

    this.activeWorkflows.set(workflowId, newWorkflow);
    return workflowId;
  }

  /**
   * Gets a specific workflow by ID
   */
  getWorkflow(workflowId: string): WorkflowState | undefined {
    return this.activeWorkflows.get(workflowId);
  }

  /**
   * Updates a workflow's phase
   */
  updateWorkflowPhase(workflowId: string, phase: WorkflowState['phase']): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.phase = phase;
      workflow.timestamp = new Date();
    }
  }

  /**
   * Updates a workflow's current task
   */
  updateCurrentTask(workflowId: string, currentTask: string): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.currentTask = currentTask;
      workflow.timestamp = new Date();
    }
  }

  /**
   * Adds a document to a workflow
   */
  addDocument(workflowId: string, document: DocumentState): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.documents.push(document);
      workflow.timestamp = new Date();
    }
  }

  /**
   * Adds a decision to a workflow
   */
  addDecision(workflowId: string, decision: Decision): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.decisions.push(decision);
      workflow.timestamp = new Date();
    }
  }

  /**
   * Updates context size for a workflow
   */
  updateContextSize(workflowId: string, contextSize: number): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.contextSize = contextSize;
      workflow.timestamp = new Date();
    }
  }

  /**
   * Removes a workflow from active workflows
   */
  removeWorkflow(workflowId: string): boolean {
    return this.activeWorkflows.delete(workflowId);
  }

  /**
   * Gets the total number of active workflows
   */
  getActiveWorkflowCount(): number {
    return this.activeWorkflows.size;
  }

  /**
   * Restores a workflow from preserved state
   */
  restoreWorkflow(workflowState: WorkflowState): void {
    this.activeWorkflows.set(workflowState.id, workflowState);
  }

  private generateWorkflowId(): string {
    this.workflowCounter++;
    return `workflow-${Date.now()}-${this.workflowCounter}`;
  }

  private calculatePriority(workflow: WorkflowState): 'low' | 'medium' | 'high' {
    const now = new Date();
    const workflowTimestamp = workflow.timestamp || new Date();
    const timeSinceLastActivity = now.getTime() - workflowTimestamp.getTime();
    const hoursInactive = timeSinceLastActivity / (1000 * 60 * 60);

    // Recent activity = high priority
    if (hoursInactive < 1) return 'high';
    // Moderate activity = medium priority
    if (hoursInactive < 24) return 'medium';
    // Old activity = low priority
    return 'low';
  }

  private getDefaultUserPreferences(): UserPreferences {
    return {
      theme: 'auto',
      language: 'en',
      notifications: true,
      autoSave: true,
      compressionLevel: 'medium'
    };
  }
}