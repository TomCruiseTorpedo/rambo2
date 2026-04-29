// Restoration Engine Component
// Loads and reconstructs workflow state in new sessions

import { 
  WorkflowState, 
  CompactedState, 
  PreservedState, 
  EssentialData,
  DocumentState,
  Decision,
  Progress,
  UserPreferences,
  ReconstructionMetadata
} from '../types';
import { ErrorHandler, ErrorType, ErrorContext, WorkflowPreservationError } from '../utils/ErrorHandler';
import { SecurityManager } from '../utils/SecurityManager';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

export class RestorationEngine {
  private readonly storageBasePath: string;
  private readonly archivePath: string;
  private readonly errorHandler: ErrorHandler;
  private readonly securityManager: SecurityManager;

  constructor(storageBasePath: string = '.kiro/state/workflows', securityManager?: SecurityManager) {
    this.storageBasePath = storageBasePath;
    this.archivePath = path.join(storageBasePath, 'archive');
    this.errorHandler = new ErrorHandler(storageBasePath);
    this.securityManager = securityManager || new SecurityManager({
      auditLogPath: path.join(storageBasePath, 'audit.log')
    });
    this.ensureStorageDirectories();
  }

  /**
   * Detects existing preserved workflow states in storage
   * Returns array of preserved states sorted by timestamp (most recent first)
   */
  async detectPreservedStates(): Promise<PreservedState[]> {
    try {
      const files = await fs.promises.readdir(this.storageBasePath);
      const stateFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
      
      const preservedStates: PreservedState[] = [];
      
      for (const file of stateFiles) {
        try {
          const filePath = path.join(this.storageBasePath, file);
          const stats = await fs.promises.stat(filePath);
          
          // Extract workflow ID from filename (format: workflowType-compactedStateId.json)
          // The compacted state ID is the full filename without .json
          const stateId = file.replace('.json', '');
          const fileNameParts = stateId.split('-');
          const workflowId = fileNameParts.length >= 2 ? fileNameParts.slice(1).join('-') : 'unknown';
          
          preservedStates.push({
            id: stateId,
            workflowId,
            filePath,
            timestamp: stats.mtime,
            size: stats.size,
            compressionRatio: 0 // Will be populated when loading the actual state
          });
        } catch (error) {
          // Skip files that can't be processed
          console.warn(`Failed to process state file ${file}:`, error);
        }
      }
      
      // Sort by timestamp, most recent first
      return preservedStates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      throw new Error(`Failed to detect preserved states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Loads workflow state from storage by state ID with error handling and recovery
   * Returns the most recent preserved state if stateId is not provided
   */
  async loadWorkflowState(stateId?: string): Promise<WorkflowState | null> {
    const context: ErrorContext = {
      operation: 'loadWorkflowState',
      stateId,
      timestamp: new Date()
    };

    try {
      let targetStateId = stateId;
      
      // If no specific state ID provided, get the most recent one
      if (!targetStateId) {
        const preservedStates = await this.detectPreservedStates();
        if (preservedStates.length === 0) {
          // Handle missing state scenario
          const recoveryResult = await this.errorHandler.handleMissingState('', context);
          if (recoveryResult.success && recoveryResult.recoveredData) {
            return recoveryResult.recoveredData;
          }
          return null;
        }
        targetStateId = preservedStates[0].id;
      }
      
      // Find the state file
      const stateFile = `${targetStateId}.json`;
      const filePath = path.join(this.storageBasePath, stateFile);
      
      if (!fs.existsSync(filePath)) {
        // Log access attempt for missing file
        await this.securityManager.logAuditEntry({
          operation: 'access',
          workflowId: targetStateId,
          details: `Attempted to access missing state file: ${stateFile}`,
          success: false,
          errorMessage: 'State file not found',
          filePath
        });
        
        // Handle missing state file
        const recoveryResult = await this.errorHandler.handleMissingState(targetStateId, {
          ...context,
          stateId: targetStateId,
          filePath
        });
        
        if (recoveryResult.success && recoveryResult.recoveredData) {
          return recoveryResult.recoveredData;
        }
        return null;
      }
      
      // Validate file permissions before reading
      const permissionsValid = await this.securityManager.validateFilePermissions(filePath);
      if (!permissionsValid) {
        await this.securityManager.logAuditEntry({
          operation: 'access',
          workflowId: targetStateId,
          details: `File permissions validation failed for: ${stateFile}`,
          success: false,
          errorMessage: 'Invalid file permissions',
          filePath
        });
      }
      
      // Read and decompress the state file
      const compressedData = await fs.promises.readFile(filePath);
      let decompressedData: string;
      let compactedState: CompactedState;
      
      try {
        decompressedData = await this.decompressData(compressedData);
        compactedState = JSON.parse(decompressedData);
      } catch (parseError) {
        // Handle corrupted state file
        const recoveryResult = await this.errorHandler.handleCorruptedState(targetStateId, {
          ...context,
          stateId: targetStateId,
          filePath,
          additionalInfo: { parseError: (parseError as Error).message }
        });
        
        if (recoveryResult.success && recoveryResult.recoveredData) {
          if (typeof recoveryResult.recoveredData === 'object' && 'id' in recoveryResult.recoveredData) {
            // If we got a full WorkflowState back, return it
            return recoveryResult.recoveredData as WorkflowState;
          } else {
            // If we got a CompactedState, reconstruct it
            compactedState = recoveryResult.recoveredData as CompactedState;
          }
        } else {
          return null;
        }
      }
      
      // Reconstruct the full workflow state
      const workflowState = await this.reconstructWorkflowState(compactedState);
      
      // Log successful restoration
      await this.securityManager.logAuditEntry({
        operation: 'restoration',
        workflowId: workflowState.id,
        details: `Successfully restored workflow state from ${stateFile}`,
        success: true,
        dataSize: JSON.stringify(workflowState).length,
        filePath
      });
      
      // Archive older states after successful loading
      try {
        const archivedCount = await this.archiveOlderStates(targetStateId);
        if (archivedCount > 0) {
          await this.securityManager.logAuditEntry({
            operation: 'archive',
            workflowId: targetStateId,
            details: `Archived ${archivedCount} older state files`,
            success: true
          });
        }
      } catch (archiveError) {
        // Don't fail the whole operation if archiving fails
        console.warn('Failed to archive older states:', archiveError);
        await this.securityManager.logAuditEntry({
          operation: 'archive',
          workflowId: targetStateId,
          details: `Failed to archive older states`,
          success: false,
          errorMessage: archiveError instanceof Error ? archiveError.message : 'Unknown error'
        });
      }
      
      return workflowState;
    } catch (error) {
      // Handle general restoration failure
      const recoveryResult = await this.errorHandler.handleStorageFailure(
        async () => {
          throw error; // Re-throw to trigger recovery mechanisms
        },
        context
      );
      
      if (recoveryResult.success && recoveryResult.recoveredData) {
        return recoveryResult.recoveredData;
      }
      
      throw new WorkflowPreservationError(
        ErrorType.RESTORATION_FAILURE,
        `Failed to load workflow state: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context
      );
    }
  }

  /**
   * Reconstructs workflow context from compacted state
   * Rebuilds the full WorkflowState object from essential data and compressed context
   */
  async reconstructWorkflowContext(compactedState: CompactedState): Promise<WorkflowState> {
    return this.reconstructWorkflowState(compactedState);
  }

  /**
   * Internal method to reconstruct WorkflowState from CompactedState
   */
  private async reconstructWorkflowState(compactedState: CompactedState): Promise<WorkflowState> {
    const essentialData = compactedState.essentialData;
    
    // Parse compressed context
    let compressedContext: any = {};
    try {
      compressedContext = JSON.parse(compactedState.compressedContext);
    } catch (error) {
      console.warn('Failed to parse compressed context, using defaults');
    }
    
    // Reconstruct progress from essential data and compressed context
    const progress: Progress = {
      completedTasks: compressedContext.progressSummary?.recentCompletedTasks || [],
      currentTaskStatus: this.inferCurrentTaskStatus(essentialData),
      approvalStates: {}, // Reset approval states for new session
      iterationCount: compressedContext.progressSummary?.iterationCount || 1,
      lastUserFeedback: compressedContext.progressSummary?.hasUserFeedback ? 'Previous feedback available' : undefined
    };
    
    // Reconstruct user preferences with defaults
    const userPreferences: UserPreferences = {
      theme: 'auto',
      language: 'en',
      notifications: true,
      autoSave: compressedContext.preferences?.autoSave || true,
      compressionLevel: compressedContext.preferences?.compressionLevel || 'medium'
    };
    
    // Combine critical decisions with additional decisions from compressed context
    const allDecisions: Decision[] = [...essentialData.criticalDecisions];
    if (compressedContext.additionalDecisions) {
      const additionalDecisions = compressedContext.additionalDecisions.map((d: any, index: number) => ({
        id: `restored-decision-${index}`,
        description: d.description || 'Restored decision',
        rationale: 'Rationale compressed during preservation',
        timestamp: new Date(Date.now() - (index + 1) * 60 * 60 * 1000), // Assign older timestamps
        impact: d.impact || 'medium',
        category: d.category || 'design'
      }));
      allDecisions.push(...additionalDecisions);
    }
    
    // Generate a new workflow ID for the restored session
    const restoredWorkflowId = `restored-${essentialData.workflowType}-${Date.now()}`;
    
    const workflowState: WorkflowState = {
      id: restoredWorkflowId,
      type: essentialData.workflowType as WorkflowState['type'],
      phase: essentialData.currentPhase as WorkflowState['phase'],
      currentTask: essentialData.activeTask !== 'No active task' ? essentialData.activeTask : undefined,
      progress,
      documents: essentialData.documentStates,
      decisions: allDecisions,
      userPreferences,
      timestamp: new Date(),
      contextSize: this.estimateRestoredContextSize(compactedState)
    };
    
    return workflowState;
  }

  /**
   * Infers current task status from essential data
   */
  private inferCurrentTaskStatus(essentialData: EssentialData): Progress['currentTaskStatus'] {
    if (essentialData.activeTask === 'No active task') {
      return 'not_started';
    }
    
    // If there's an active task, it's likely in progress
    // Only mark as completed if there are explicit completion indicators in next steps
    const explicitCompletionIndicators = ['task complete', 'task finished', 'task done'];
    const hasExplicitCompletion = essentialData.nextSteps.some(step => 
      explicitCompletionIndicators.some(indicator => step.toLowerCase().includes(indicator))
    );
    
    if (hasExplicitCompletion) {
      return 'completed';
    }
    
    // Default to in_progress if there's an active task
    return 'in_progress';
  }

  /**
   * Estimates the context size of the restored workflow state
   */
  private estimateRestoredContextSize(compactedState: CompactedState): number {
    // Base the estimate on the compacted size plus some expansion factor
    const baseSize = compactedState.reconstructionMetadata.compactedSize;
    const expansionFactor = 1.5; // Assume 50% expansion during restoration
    
    return Math.floor(baseSize * expansionFactor);
  }

  /**
   * Archives older preserved states to keep storage clean
   */
  private async archiveOlderStates(currentStateId: string): Promise<number> {
    try {
      const preservedStates = await this.detectPreservedStates();
      
      // Keep only the current state and archive the rest
      const statesToArchive = preservedStates.filter(state => state.id !== currentStateId);
      
      let archivedCount = 0;
      for (const state of statesToArchive) {
        const sourceFile = state.filePath;
        const archiveFile = path.join(this.archivePath, path.basename(sourceFile));
        
        try {
          await fs.promises.rename(sourceFile, archiveFile);
          archivedCount++;
        } catch (error) {
          console.warn(`Failed to archive state ${state.id}:`, error);
        }
      }
      
      return archivedCount;
    } catch (error) {
      console.warn('Failed to archive older states:', error);
      return 0;
    }
  }

  /**
   * Decompresses data using gzip
   */
  private async decompressData(compressedData: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(compressedData, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    });
  }

  /**
   * Ensures storage directories exist
   */
  private ensureStorageDirectories(): void {
    const directories = [
      this.storageBasePath,
      this.archivePath,
      path.join(this.storageBasePath, 'emergency')
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Gets the most recent preserved state without loading it fully
   */
  async getMostRecentState(): Promise<PreservedState | null> {
    const preservedStates = await this.detectPreservedStates();
    return preservedStates.length > 0 ? preservedStates[0] : null;
  }

  /**
   * Validates that a preserved state can be loaded successfully
   */
  async validatePreservedState(stateId: string): Promise<boolean> {
    try {
      const stateFile = `${stateId}.json`;
      const filePath = path.join(this.storageBasePath, stateFile);
      
      if (!fs.existsSync(filePath)) {
        return false;
      }
      
      // Try to read and parse the file
      const compressedData = await fs.promises.readFile(filePath);
      const decompressedData = await this.decompressData(compressedData);
      const compactedState: CompactedState = JSON.parse(decompressedData);
      
      // Validate essential structure
      return !!(
        compactedState.id &&
        compactedState.essentialData &&
        compactedState.essentialData.workflowType &&
        compactedState.essentialData.currentPhase &&
        compactedState.reconstructionMetadata
      );
    } catch (error) {
      return false;
    }
  }
}