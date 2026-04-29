// Error Handler for Workflow Context Preservation
// Provides comprehensive error handling, recovery mechanisms, and emergency backup system

import * as fs from 'fs';
import * as path from 'path';
import { CompactedState, WorkflowState } from '../types';
import { StorageUtils } from './StorageUtils';

export enum ErrorType {
  STORAGE_FAILURE = 'STORAGE_FAILURE',
  CORRUPTED_STATE = 'CORRUPTED_STATE',
  MISSING_STATE = 'MISSING_STATE',
  COMPACTION_FAILURE = 'COMPACTION_FAILURE',
  RESTORATION_FAILURE = 'RESTORATION_FAILURE',
  CONTEXT_LIMIT_EXCEEDED = 'CONTEXT_LIMIT_EXCEEDED',
  PERMISSION_DENIED = 'PERMISSION_DENIED',
  DISK_FULL = 'DISK_FULL',
  NETWORK_ERROR = 'NETWORK_ERROR'
}

export interface ErrorContext {
  operation: string;
  workflowId?: string;
  stateId?: string;
  filePath?: string;
  timestamp: Date;
  additionalInfo?: Record<string, any>;
}

export interface RecoveryResult {
  success: boolean;
  recoveredData?: any;
  fallbackUsed?: string;
  message: string;
  nextSteps: string[];
}

export interface EmergencyBackup {
  id: string;
  workflowId: string;
  minimalState: MinimalWorkflowState;
  timestamp: Date;
  reason: string;
}

export interface MinimalWorkflowState {
  id: string;
  type: string;
  phase: string;
  currentTask?: string;
  criticalDecisions: string[];
  nextSteps: string[];
}

export class WorkflowPreservationError extends Error {
  public readonly type: ErrorType;
  public readonly context: ErrorContext;
  public readonly recoverable: boolean;

  constructor(
    type: ErrorType,
    message: string,
    context: ErrorContext,
    recoverable: boolean = true
  ) {
    super(message);
    this.name = 'WorkflowPreservationError';
    this.type = type;
    this.context = context;
    this.recoverable = recoverable;
  }
}

export class ErrorHandler {
  private readonly storageUtils: StorageUtils;
  private readonly emergencyPath: string;
  private readonly logPath: string;
  private readonly maxRetries: number = 3;
  private readonly retryDelays: number[] = [100, 500, 1000]; // ms

  constructor(storageBasePath: string = '.kiro/state/workflows') {
    try {
      this.storageUtils = new StorageUtils(storageBasePath);
      this.emergencyPath = path.join(storageBasePath, 'emergency');
      this.logPath = path.join(storageBasePath, 'error.log');
      this.ensureEmergencyDirectory();
    } catch (error) {
      // If we can't initialize storage, create a minimal fallback
      this.emergencyPath = '/tmp/emergency-fallback';
      this.logPath = '/tmp/error-fallback.log';
      // Don't throw - allow ErrorHandler to be created even with invalid paths
      // This enables testing of error scenarios
    }
  }

  /**
   * Handles storage failures with retry logic and fallback mechanisms
   */
  async handleStorageFailure(
    operation: () => Promise<any>,
    context: ErrorContext,
    fallbackData?: any
  ): Promise<RecoveryResult> {
    let lastError: Error | null = null;
    
    // Retry with exponential backoff
    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        if (attempt > 0) {
          await this.logRecovery(context, `Operation succeeded on attempt ${attempt + 1}`);
        }
        
        return {
          success: true,
          recoveredData: result,
          message: attempt > 0 ? `Operation succeeded after ${attempt + 1} attempts` : 'Operation succeeded',
          nextSteps: ['Continue with normal workflow']
        };
      } catch (error) {
        lastError = error as Error;
        await this.logError(new WorkflowPreservationError(
          ErrorType.STORAGE_FAILURE,
          `Storage operation failed (attempt ${attempt + 1}): ${lastError.message}`,
          { ...context, additionalInfo: { attempt: attempt + 1, error: lastError.message } }
        ));
        
        if (attempt < this.maxRetries - 1) {
          await this.delay(this.retryDelays[attempt]);
        }
      }
    }
    
    // All retries failed, try fallback mechanisms
    if (fallbackData) {
      try {
        const fallbackResult = await this.saveToEmergencyBackup(fallbackData, context);
        return {
          success: true,
          recoveredData: fallbackResult,
          fallbackUsed: 'emergency_backup',
          message: 'Primary storage failed, data saved to emergency backup',
          nextSteps: [
            'Check storage system health',
            'Attempt to restore from emergency backup when storage is available',
            'Consider manual data recovery if needed'
          ]
        };
      } catch (fallbackError) {
        await this.logError(new WorkflowPreservationError(
          ErrorType.STORAGE_FAILURE,
          `Emergency backup also failed: ${(fallbackError as Error).message}`,
          context,
          false
        ));
      }
    }
    
    return {
      success: false,
      message: `Storage operation failed after ${this.maxRetries} attempts: ${lastError?.message}`,
      nextSteps: [
        'Check file system permissions and disk space',
        'Verify storage path accessibility',
        'Consider manual state reconstruction',
        'Contact system administrator if problem persists'
      ]
    };
  }

  /**
   * Handles corrupted state files with recovery attempts
   */
  async handleCorruptedState(stateId: string, context: ErrorContext): Promise<RecoveryResult> {
    await this.logError(new WorkflowPreservationError(
      ErrorType.CORRUPTED_STATE,
      `Corrupted state file detected: ${stateId}`,
      context
    ));

    // Try to recover from archived states
    try {
      const archivedStates = await this.findArchivedStates(stateId);
      
      if (archivedStates.length > 0) {
        // Try to load the most recent archived state
        const mostRecentArchived = archivedStates[0];
        const recoveredState = await this.loadArchivedState(mostRecentArchived);
        
        await this.logRecovery(context, `Recovered from archived state: ${mostRecentArchived}`);
        
        return {
          success: true,
          recoveredData: recoveredState,
          fallbackUsed: 'archived_state',
          message: `Recovered from archived state (${mostRecentArchived})`,
          nextSteps: [
            'Verify recovered data integrity',
            'Remove corrupted state file',
            'Continue with recovered workflow state'
          ]
        };
      }
    } catch (archiveError) {
      await this.logError(new WorkflowPreservationError(
        ErrorType.CORRUPTED_STATE,
        `Failed to recover from archived states: ${(archiveError as Error).message}`,
        context
      ));
    }

    // Try to recover from emergency backups
    try {
      const emergencyBackups = await this.findEmergencyBackups(context.workflowId);
      
      if (emergencyBackups.length > 0) {
        const mostRecentBackup = emergencyBackups[0];
        
        await this.logRecovery(context, `Recovered from emergency backup: ${mostRecentBackup.id}`);
        
        return {
          success: true,
          recoveredData: mostRecentBackup.minimalState,
          fallbackUsed: 'emergency_backup',
          message: `Recovered minimal state from emergency backup`,
          nextSteps: [
            'Reconstruct full workflow state from minimal data',
            'Verify critical workflow information',
            'Continue with reduced context but preserved essentials'
          ]
        };
      }
    } catch (emergencyError) {
      await this.logError(new WorkflowPreservationError(
        ErrorType.CORRUPTED_STATE,
        `Failed to recover from emergency backups: ${(emergencyError as Error).message}`,
        context
      ));
    }

    return {
      success: false,
      message: 'Unable to recover from corrupted state - no valid backups found',
      nextSteps: [
        'Start fresh workflow if possible',
        'Manually reconstruct workflow state from available documents',
        'Check if user has external backups or notes',
        'Report data loss to user with available recovery options'
      ]
    };
  }

  /**
   * Handles missing preserved state scenarios
   */
  async handleMissingState(stateId: string, context: ErrorContext): Promise<RecoveryResult> {
    await this.logError(new WorkflowPreservationError(
      ErrorType.MISSING_STATE,
      `Preserved state not found: ${stateId}`,
      context
    ));

    // Search for alternative states
    try {
      const allStates = await this.storageUtils.listStates();
      
      if (allStates.length > 0) {
        // Find the most recent state for the same workflow type
        const sameWorkflowStates = allStates.filter(state => 
          context.workflowId && (state.workflowId.includes(context.workflowId) || state.id.includes(context.workflowId))
        );
        
        if (sameWorkflowStates.length > 0) {
          const alternativeState = sameWorkflowStates[0];
          const loadedState = await this.storageUtils.loadState(alternativeState.id);
          
          await this.logRecovery(context, `Found alternative state: ${alternativeState.id}`);
          
          return {
            success: true,
            recoveredData: loadedState,
            fallbackUsed: 'alternative_state',
            message: `Found alternative preserved state for same workflow`,
            nextSteps: [
              'Verify alternative state is suitable for continuation',
              'Check for any data gaps or inconsistencies',
              'Continue with alternative workflow state'
            ]
          };
        }
        
        // If no same-workflow states, offer the most recent state
        const mostRecentState = allStates[0];
        const loadedState = await this.storageUtils.loadState(mostRecentState.id);
        
        await this.logRecovery(context, `Offering most recent state: ${mostRecentState.id}`);
        
        return {
          success: true,
          recoveredData: loadedState,
          fallbackUsed: 'most_recent_state',
          message: `No matching workflow found, offering most recent preserved state`,
          nextSteps: [
            'Review if recent state is relevant to current work',
            'Consider starting fresh workflow if state is unrelated',
            'Extract any useful information from available state'
          ]
        };
      }
    } catch (searchError) {
      await this.logError(new WorkflowPreservationError(
        ErrorType.MISSING_STATE,
        `Failed to search for alternative states: ${(searchError as Error).message}`,
        context
      ));
    }

    return {
      success: false,
      message: 'No preserved states found in storage',
      nextSteps: [
        'Start a new workflow from scratch',
        'Check if states were moved or archived externally',
        'Verify storage path configuration',
        'Consider if this is the first use of the system'
      ]
    };
  }

  /**
   * Handles compaction failures with intelligent fallbacks
   */
  async handleCompactionFailure(
    workflowState: WorkflowState,
    context: ErrorContext,
    targetRatio: number = 0.8
  ): Promise<RecoveryResult> {
    await this.logError(new WorkflowPreservationError(
      ErrorType.COMPACTION_FAILURE,
      `Compaction failed to achieve target ratio: ${targetRatio}`,
      context
    ));

    try {
      // Create minimal emergency state
      const minimalState = this.createMinimalState(workflowState);
      const emergencyBackup = await this.saveToEmergencyBackup(minimalState, context);
      
      await this.logRecovery(context, `Created minimal emergency backup: ${emergencyBackup.id}`);
      
      return {
        success: true,
        recoveredData: minimalState,
        fallbackUsed: 'minimal_state',
        message: 'Compaction failed, preserved minimal critical state',
        nextSteps: [
          'Continue with reduced context',
          'Prioritize essential workflow information',
          'Consider manual context cleanup if needed',
          'Monitor context usage more closely'
        ]
      };
    } catch (emergencyError) {
      await this.logError(new WorkflowPreservationError(
        ErrorType.COMPACTION_FAILURE,
        `Emergency minimal state creation failed: ${(emergencyError as Error).message}`,
        context,
        false
      ));
      
      return {
        success: false,
        message: 'Compaction and emergency backup both failed',
        nextSteps: [
          'Manually reduce workflow context',
          'Remove non-essential information',
          'Start new session with critical information only',
          'Review compaction algorithm settings'
        ]
      };
    }
  }

  /**
   * Handles context limit exceeded scenarios
   */
  async handleContextLimitExceeded(
    workflowState: WorkflowState,
    context: ErrorContext
  ): Promise<RecoveryResult> {
    await this.logError(new WorkflowPreservationError(
      ErrorType.CONTEXT_LIMIT_EXCEEDED,
      'Context limit exceeded before preservation could complete',
      context
    ));

    try {
      // Force immediate minimal preservation
      const minimalState = this.createMinimalState(workflowState);
      const emergencyId = `emergency-${Date.now()}`;
      
      const emergencyBackup: EmergencyBackup = {
        id: emergencyId,
        workflowId: workflowState.id,
        minimalState,
        timestamp: new Date(),
        reason: 'Context limit exceeded'
      };
      
      const backupPath = path.join(this.emergencyPath, `${emergencyId}.json`);
      await fs.promises.writeFile(backupPath, JSON.stringify(emergencyBackup, null, 2));
      
      await this.logRecovery(context, `Emergency preservation completed: ${emergencyId}`);
      
      return {
        success: true,
        recoveredData: emergencyBackup,
        fallbackUsed: 'emergency_preservation',
        message: 'Emergency preservation completed with minimal state',
        nextSteps: [
          'Start new session immediately',
          'Load emergency backup to continue workflow',
          'Reconstruct full context from minimal state',
          'Implement more aggressive context monitoring'
        ]
      };
    } catch (emergencyError) {
      await this.logError(new WorkflowPreservationError(
        ErrorType.CONTEXT_LIMIT_EXCEEDED,
        `Emergency preservation failed: ${(emergencyError as Error).message}`,
        context,
        false
      ));
      
      return {
        success: false,
        message: 'Context limit exceeded and emergency preservation failed',
        nextSteps: [
          'Session will terminate with potential data loss',
          'Manually note current workflow state',
          'Start fresh session and reconstruct workflow manually',
          'Review context monitoring thresholds'
        ]
      };
    }
  }

  /**
   * Creates a minimal workflow state for emergency preservation
   */
  private createMinimalState(workflowState: WorkflowState): MinimalWorkflowState {
    return {
      id: workflowState.id,
      type: workflowState.type,
      phase: workflowState.phase,
      currentTask: workflowState.currentTask,
      criticalDecisions: workflowState.decisions
        .filter(d => d.impact === 'high')
        .slice(0, 3) // Keep only top 3 high-impact decisions
        .map(d => d.description),
      nextSteps: this.generateEmergencyNextSteps(workflowState)
    };
  }

  /**
   * Generates next steps for emergency scenarios
   */
  private generateEmergencyNextSteps(workflowState: WorkflowState): string[] {
    const steps: string[] = [];
    
    steps.push(`Resume ${workflowState.type} workflow in ${workflowState.phase} phase`);
    
    if (workflowState.currentTask) {
      steps.push(`Continue with task: ${workflowState.currentTask}`);
    }
    
    steps.push('Reconstruct full context from available information');
    steps.push('Verify critical decisions and progress');
    
    return steps;
  }

  /**
   * Saves data to emergency backup location
   */
  private async saveToEmergencyBackup(data: any, context: ErrorContext): Promise<EmergencyBackup> {
    const emergencyId = `emergency-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const backup: EmergencyBackup = {
      id: emergencyId,
      workflowId: context.workflowId || 'unknown',
      minimalState: data,
      timestamp: new Date(),
      reason: `Emergency backup due to ${context.operation} failure`
    };
    
    const backupPath = path.join(this.emergencyPath, `${emergencyId}.json`);
    await fs.promises.writeFile(backupPath, JSON.stringify(backup, null, 2));
    
    return backup;
  }

  /**
   * Finds archived states for a given state ID
   */
  private async findArchivedStates(stateId: string): Promise<string[]> {
    const archivePath = path.join(this.storageUtils.getConfig().archivePath);
    
    if (!fs.existsSync(archivePath)) {
      return [];
    }
    
    const files = await fs.promises.readdir(archivePath);
    return files
      .filter(file => file.includes(stateId) && file.endsWith('.json'))
      .sort((a, b) => {
        // Sort by modification time, most recent first
        const statsA = fs.statSync(path.join(archivePath, a));
        const statsB = fs.statSync(path.join(archivePath, b));
        return statsB.mtime.getTime() - statsA.mtime.getTime();
      });
  }

  /**
   * Loads a state from the archive
   */
  private async loadArchivedState(fileName: string): Promise<CompactedState> {
    const archivePath = path.join(this.storageUtils.getConfig().archivePath);
    const filePath = path.join(archivePath, fileName);
    
    const data = await fs.promises.readFile(filePath);
    const serialized = data.toString('utf8');
    
    return JSON.parse(serialized) as CompactedState;
  }

  /**
   * Finds emergency backups for a workflow
   */
  private async findEmergencyBackups(workflowId?: string): Promise<EmergencyBackup[]> {
    if (!fs.existsSync(this.emergencyPath)) {
      return [];
    }
    
    const files = await fs.promises.readdir(this.emergencyPath);
    const backups: EmergencyBackup[] = [];
    
    for (const file of files) {
      if (file.endsWith('.json')) {
        try {
          const filePath = path.join(this.emergencyPath, file);
          const data = await fs.promises.readFile(filePath, 'utf8');
          const backup: EmergencyBackup = JSON.parse(data);
          
          if (!workflowId || backup.workflowId === workflowId) {
            backups.push(backup);
          }
        } catch (error) {
          // Skip corrupted backup files
          console.warn(`Skipping corrupted emergency backup: ${file}`);
        }
      }
    }
    
    // Sort by timestamp, most recent first
    return backups.sort((a, b) => 
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Logs an error to the error log file
   */
  private async logError(error: WorkflowPreservationError): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: error.type,
      message: error.message,
      context: error.context,
      recoverable: error.recoverable,
      stack: error.stack
    };
    
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.promises.appendFile(this.logPath, logLine);
    } catch (logError) {
      // If we can't log, at least output to console
      console.error('Failed to write to error log:', logError);
      console.error('Original error:', logEntry);
    }
  }

  /**
   * Logs a successful recovery to the error log file
   */
  private async logRecovery(context: ErrorContext, message: string): Promise<void> {
    const logEntry = {
      timestamp: new Date().toISOString(),
      type: 'RECOVERY_SUCCESS',
      message,
      context
    };
    
    try {
      const logLine = JSON.stringify(logEntry) + '\n';
      await fs.promises.appendFile(this.logPath, logLine);
    } catch (logError) {
      console.error('Failed to write recovery log:', logError);
    }
  }

  /**
   * Ensures emergency directory exists
   */
  private ensureEmergencyDirectory(): void {
    if (!fs.existsSync(this.emergencyPath)) {
      fs.mkdirSync(this.emergencyPath, { recursive: true });
    }
  }

  /**
   * Delays execution for the specified number of milliseconds
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets error statistics from the log file
   */
  async getErrorStatistics(): Promise<{
    totalErrors: number;
    errorsByType: Record<ErrorType, number>;
    recentErrors: number;
    recoveryRate: number;
  }> {
    try {
      if (!fs.existsSync(this.logPath)) {
        return {
          totalErrors: 0,
          errorsByType: {} as Record<ErrorType, number>,
          recentErrors: 0,
          recoveryRate: 0
        };
      }
      
      const logContent = await fs.promises.readFile(this.logPath, 'utf8');
      const lines = logContent.trim().split('\n').filter(line => line.length > 0);
      
      const errorsByType: Record<ErrorType, number> = {} as Record<ErrorType, number>;
      let totalErrors = 0;
      let recoveries = 0;
      let recentErrors = 0;
      
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      
      for (const line of lines) {
        try {
          const entry = JSON.parse(line);
          const entryTime = new Date(entry.timestamp);
          
          if (entry.type === 'RECOVERY_SUCCESS') {
            recoveries++;
          } else {
            totalErrors++;
            errorsByType[entry.type as ErrorType] = (errorsByType[entry.type as ErrorType] || 0) + 1;
            
            if (entryTime >= oneDayAgo) {
              recentErrors++;
            }
          }
        } catch (parseError) {
          // Skip malformed log entries
        }
      }
      
      const recoveryRate = totalErrors > 0 ? recoveries / totalErrors : 0;
      
      return {
        totalErrors,
        errorsByType,
        recentErrors,
        recoveryRate
      };
    } catch (error) {
      return {
        totalErrors: 0,
        errorsByType: {} as Record<ErrorType, number>,
        recentErrors: 0,
        recoveryRate: 0
      };
    }
  }
}