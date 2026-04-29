// Main Workflow Preservation System
// Coordinates all components for unified workflow context preservation

import * as path from 'path';
import { 
  WorkflowState, 
  CompactedState, 
  PreservedState, 
  ContextUtilization,
  StorageConfig,
  WorkflowInfo
} from './types';
import { ContextMonitor } from './components/ContextMonitor';
import { WorkflowManager } from './components/WorkflowManager';
import { PreservationEngine } from './components/PreservationEngine';
import { RestorationEngine } from './components/RestorationEngine';
import { SessionController, RolloverResult, ContinuityValidation } from './components/SessionController';
import { StorageUtils } from './utils/StorageUtils';
import { ErrorHandler, WorkflowPreservationError, ErrorType } from './utils/ErrorHandler';
import { PerformanceMonitor, PerformanceReport } from './utils/PerformanceMonitor';
import { SecurityManager, SecurityConfig, AuditLogEntry } from './utils/SecurityManager';

export interface SystemConfig {
  storageBasePath?: string;
  maxContextCapacity?: number;
  preservationThreshold?: number;
  warningThreshold?: number;
  compressionEnabled?: boolean;
  monitoringEnabled?: boolean;
  performanceMonitoringEnabled?: boolean;
  securityConfig?: Partial<SecurityConfig>;
}

export interface SystemStatus {
  isMonitoring: boolean;
  contextUtilization: ContextUtilization;
  activeWorkflows: WorkflowInfo[];
  preservedStates: PreservedState[];
  lastPreservation?: Date;
  lastRestoration?: Date;
  systemHealth: 'healthy' | 'warning' | 'critical';
  errors: string[];
}

export interface PreservationOptions {
  forcePreservation?: boolean;
  emergencyMode?: boolean;
  customThreshold?: number;
}

export interface RestorationOptions {
  specificStateId?: string;
  validateContinuity?: boolean;
  archiveOlderStates?: boolean;
}

/**
 * Main Workflow Preservation System
 * 
 * Coordinates all components to provide seamless workflow context preservation
 * when chat sessions approach context limits. Handles monitoring, preservation,
 * restoration, and error recovery in a unified system.
 */
export class WorkflowPreservationSystem {
  private readonly config: Required<SystemConfig>;
  private readonly contextMonitor: ContextMonitor;
  private readonly workflowManager: WorkflowManager;
  private readonly preservationEngine: PreservationEngine;
  private readonly restorationEngine: RestorationEngine;
  private readonly sessionController: SessionController;
  private readonly storageUtils: StorageUtils;
  private readonly errorHandler: ErrorHandler;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly securityManager: SecurityManager;
  
  private isInitialized: boolean = false;
  private lastPreservation?: Date;
  private lastRestoration?: Date;
  private systemErrors: string[] = [];

  constructor(config: SystemConfig = {}) {
    // Set default configuration
    this.config = {
      storageBasePath: config.storageBasePath || '.kiro/state/workflows',
      maxContextCapacity: config.maxContextCapacity || 100000,
      preservationThreshold: config.preservationThreshold || 95,
      warningThreshold: config.warningThreshold || 90,
      compressionEnabled: config.compressionEnabled ?? true,
      monitoringEnabled: config.monitoringEnabled ?? true,
      performanceMonitoringEnabled: config.performanceMonitoringEnabled ?? true
    };

    // Initialize security manager first
    this.securityManager = new SecurityManager({
      auditLogPath: path.join(this.config.storageBasePath, 'audit.log'),
      ...config.securityConfig
    });

    // Initialize components
    this.contextMonitor = new ContextMonitor(this.config.maxContextCapacity);
    this.workflowManager = new WorkflowManager();
    this.preservationEngine = new PreservationEngine(this.config.storageBasePath, this.securityManager);
    this.restorationEngine = new RestorationEngine(this.config.storageBasePath, this.securityManager);
    this.storageUtils = new StorageUtils(this.config.storageBasePath);
    this.errorHandler = new ErrorHandler(this.config.storageBasePath);
    this.performanceMonitor = new PerformanceMonitor({
      preservationMaxDuration: 500,
      restorationMaxDuration: 1000,
      monitoringMaxOverhead: 1.0
    });
    
    // Initialize session controller with all components
    this.sessionController = new SessionController(
      this.workflowManager,
      this.preservationEngine,
      this.restorationEngine,
      this.config.storageBasePath
    );
  }

  /**
   * Initializes the workflow preservation system
   * Sets up monitoring, registers callbacks, and prepares for operation
   */
  async initialize(): Promise<void> {
    try {
      if (this.isInitialized) {
        return;
      }

      // Register threshold callbacks for automatic preservation
      this.contextMonitor.registerThresholdCallback(
        this.config.warningThreshold,
        () => this.handleWarningThreshold()
      );

      this.contextMonitor.registerThresholdCallback(
        this.config.preservationThreshold,
        () => this.handlePreservationThreshold()
      );

      // Start monitoring if enabled
      if (this.config.monitoringEnabled) {
        this.contextMonitor.startMonitoring();
      }

      // Check for existing preserved states and offer restoration
      await this.checkForExistingStates();

      this.isInitialized = true;
    } catch (error) {
      const errorMsg = `Failed to initialize workflow preservation system: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      throw new WorkflowPreservationError(
        ErrorType.STORAGE_FAILURE,
        errorMsg,
        {
          operation: 'initialize',
          timestamp: new Date()
        }
      );
    }
  }

  /**
   * Creates a new workflow and starts tracking it
   */
  async createWorkflow(
    type: WorkflowState['type'],
    phase: WorkflowState['phase'] = 'requirements',
    currentTask?: string
  ): Promise<string> {
    this.ensureInitialized();
    
    try {
      const workflowId = this.workflowManager.createWorkflow(type, phase, currentTask);
      
      // Update context monitoring with new workflow
      await this.updateContextUtilization();
      
      return workflowId;
    } catch (error) {
      const errorMsg = `Failed to create workflow: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Updates context utilization and triggers preservation if needed
   */
  async updateContextUtilization(currentSize?: number): Promise<void> {
    this.ensureInitialized();
    
    if (this.config.performanceMonitoringEnabled) {
      await this.performanceMonitor.measureOperation(
        'monitoring',
        async () => {
          await this.performContextUtilizationUpdateInternal(currentSize);
        },
        currentSize
      );
    } else {
      await this.performContextUtilizationUpdateInternal(currentSize);
    }
  }

  /**
   * Internal context utilization update implementation
   */
  private async performContextUtilizationUpdateInternal(currentSize?: number): Promise<void> {
    try {
      // Calculate current context size if not provided
      if (currentSize === undefined) {
        currentSize = this.calculateCurrentContextSize();
      }

      // Update context monitor
      this.contextMonitor.updateUtilization(currentSize);

      // Update workflow context sizes
      const activeWorkflows = this.workflowManager.getActiveWorkflows();
      for (const workflow of activeWorkflows) {
        this.workflowManager.updateContextSize(workflow.id, currentSize);
      }
    } catch (error) {
      const errorMsg = `Failed to update context utilization: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      // Don't throw - context monitoring should be resilient
    }
  }

  /**
   * Manually triggers workflow preservation
   */
  async preserveWorkflows(options: PreservationOptions = {}): Promise<RolloverResult> {
    this.ensureInitialized();
    
    if (this.config.performanceMonitoringEnabled) {
      const { result } = await this.performanceMonitor.measureOperation(
        'preservation',
        async () => {
          return await this.performPreservationInternal(options);
        },
        this.calculateCurrentContextSize()
      );
      return result;
    } else {
      return await this.performPreservationInternal(options);
    }
  }

  /**
   * Internal preservation implementation
   */
  private async performPreservationInternal(options: PreservationOptions = {}): Promise<RolloverResult> {
    try {
      const currentUtilization = this.contextMonitor.getCurrentUtilization();
      
      // Check if preservation is needed or forced
      if (!options.forcePreservation && 
          !options.emergencyMode && 
          currentUtilization < (options.customThreshold || this.config.preservationThreshold)) {
        return {
          success: false,
          continuationSummary: 'Preservation not needed - context utilization below threshold',
          nextSteps: ['Continue with current session'],
          errors: ['Preservation threshold not reached']
        };
      }

      // Perform rollover
      const result = await this.sessionController.initiateRollover(currentUtilization);
      
      if (result.success) {
        this.lastPreservation = new Date();
        
        // Reset context monitoring for new session
        this.contextMonitor.resetThresholds();
      }
      
      return result;
    } catch (error) {
      const errorMsg = `Failed to preserve workflows: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      throw new WorkflowPreservationError(
        ErrorType.STORAGE_FAILURE,
        errorMsg,
        {
          operation: 'preserveWorkflows',
          timestamp: new Date()
        }
      );
    }
  }

  /**
   * Restores workflows from preserved state
   */
  async restoreWorkflows(options: RestorationOptions = {}): Promise<WorkflowState | null> {
    this.ensureInitialized();
    
    if (this.config.performanceMonitoringEnabled) {
      const { result } = await this.performanceMonitor.measureOperation(
        'restoration',
        async () => {
          return await this.performRestorationInternal(options);
        }
      );
      return result;
    } else {
      return await this.performRestorationInternal(options);
    }
  }

  /**
   * Internal restoration implementation
   */
  private async performRestorationInternal(options: RestorationOptions = {}): Promise<WorkflowState | null> {
    try {
      // Load workflow state
      const restoredState = await this.restorationEngine.loadWorkflowState(options.specificStateId);
      
      if (!restoredState) {
        return null;
      }

      // Validate continuity if requested
      if (options.validateContinuity) {
        const activeWorkflows = this.workflowManager.captureCurrentState();
        if (activeWorkflows.length > 0) {
          const continuityValidation = this.sessionController.validateContinuity(
            activeWorkflows[0],
            restoredState
          );
          
          if (!continuityValidation.isValid) {
            this.systemErrors.push(`Continuity validation failed: ${continuityValidation.issues.join(', ')}`);
          }
        }
      }

      // Add restored workflow to active workflows
      this.workflowManager.restoreWorkflow(restoredState);
      
      // Archive older states if requested
      if (options.archiveOlderStates) {
        try {
          await this.storageUtils.archiveOlderStates(restoredState.id);
        } catch (archiveError) {
          // Don't fail restoration if archiving fails
          this.systemErrors.push(`Failed to archive older states: ${archiveError instanceof Error ? archiveError.message : 'Unknown error'}`);
        }
      }

      this.lastRestoration = new Date();
      
      // Update context monitoring
      await this.updateContextUtilization();
      
      return restoredState;
    } catch (error) {
      const errorMsg = `Failed to restore workflows: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      throw new WorkflowPreservationError(
        ErrorType.RESTORATION_FAILURE,
        errorMsg,
        {
          operation: 'restoreWorkflows',
          timestamp: new Date(),
          stateId: options.specificStateId
        }
      );
    }
  }

  /**
   * Gets current system status
   */
  async getSystemStatus(): Promise<SystemStatus> {
    this.ensureInitialized();
    
    try {
      const contextUtilization: ContextUtilization = {
        current: this.contextMonitor.getCurrentUtilization(),
        maximum: this.config.maxContextCapacity,
        percentage: this.contextMonitor.getCurrentUtilization(),
        estimatedRemaining: this.contextMonitor.estimateRemainingCapacity()
      };

      const activeWorkflows = this.workflowManager.getActiveWorkflows();
      const preservedStates = await this.restorationEngine.detectPreservedStates();
      
      // Determine system health
      let systemHealth: SystemStatus['systemHealth'] = 'healthy';
      if (contextUtilization.percentage >= this.config.preservationThreshold) {
        systemHealth = 'critical';
      } else if (contextUtilization.percentage >= this.config.warningThreshold) {
        systemHealth = 'warning';
      }

      return {
        isMonitoring: this.contextMonitor.isActivelyMonitoring(),
        contextUtilization,
        activeWorkflows,
        preservedStates,
        lastPreservation: this.lastPreservation,
        lastRestoration: this.lastRestoration,
        systemHealth,
        errors: [...this.systemErrors] // Return copy to prevent external modification
      };
    } catch (error) {
      return {
        isMonitoring: false,
        contextUtilization: {
          current: 0,
          maximum: this.config.maxContextCapacity,
          percentage: 0,
          estimatedRemaining: this.config.maxContextCapacity
        },
        activeWorkflows: [],
        preservedStates: [],
        systemHealth: 'critical',
        errors: [`Failed to get system status: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };
    }
  }

  /**
   * Updates workflow progress
   */
  updateWorkflowProgress(workflowId: string, progress: any): void {
    this.ensureInitialized();
    
    try {
      this.workflowManager.updateWorkflowProgress(workflowId, progress);
    } catch (error) {
      const errorMsg = `Failed to update workflow progress: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
    }
  }

  /**
   * Updates workflow phase
   */
  updateWorkflowPhase(workflowId: string, phase: WorkflowState['phase']): void {
    this.ensureInitialized();
    
    try {
      this.workflowManager.updateWorkflowPhase(workflowId, phase);
    } catch (error) {
      const errorMsg = `Failed to update workflow phase: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
    }
  }

  /**
   * Adds a document to a workflow
   */
  addWorkflowDocument(workflowId: string, document: any): void {
    this.ensureInitialized();
    
    try {
      this.workflowManager.addDocument(workflowId, document);
    } catch (error) {
      const errorMsg = `Failed to add workflow document: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
    }
  }

  /**
   * Adds a decision to a workflow
   */
  addWorkflowDecision(workflowId: string, decision: any): void {
    this.ensureInitialized();
    
    try {
      this.workflowManager.addDecision(workflowId, decision);
    } catch (error) {
      const errorMsg = `Failed to add workflow decision: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
    }
  }

  /**
   * Stops monitoring and cleans up resources
   */
  async shutdown(): Promise<void> {
    try {
      // Stop monitoring
      this.contextMonitor.stopMonitoring();
      
      // Optionally preserve current state before shutdown
      const activeWorkflows = this.workflowManager.getActiveWorkflows();
      if (activeWorkflows.length > 0) {
        try {
          await this.preserveWorkflows({ forcePreservation: true });
        } catch (error) {
          // Don't fail shutdown if preservation fails
          this.systemErrors.push(`Failed to preserve workflows during shutdown: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
      }
      
      // Close security manager resources
      await this.securityManager.close();
      
      this.isInitialized = false;
    } catch (error) {
      const errorMsg = `Failed to shutdown cleanly: ${error instanceof Error ? error.message : 'Unknown error'}`;
      this.systemErrors.push(errorMsg);
      throw error;
    }
  }

  /**
   * Clears system errors
   */
  clearErrors(): void {
    this.systemErrors = [];
  }

  /**
   * Gets system configuration
   */
  getConfig(): Readonly<Required<SystemConfig>> {
    return { ...this.config };
  }

  /**
   * Gets performance report for all operations or specific operation type
   */
  getPerformanceReport(operationType?: 'preservation' | 'restoration' | 'monitoring' | 'compaction'): PerformanceReport {
    this.ensureInitialized();
    return this.performanceMonitor.getPerformanceReport(operationType);
  }

  /**
   * Exports performance metrics for analysis
   */
  exportPerformanceMetrics(): string {
    this.ensureInitialized();
    return this.performanceMonitor.exportMetrics();
  }

  /**
   * Imports performance metrics from previous sessions
   */
  importPerformanceMetrics(jsonData: string): void {
    this.ensureInitialized();
    this.performanceMonitor.importMetrics(jsonData);
  }

  /**
   * Clears all performance metrics
   */
  clearPerformanceMetrics(): void {
    this.ensureInitialized();
    this.performanceMonitor.clearMetrics();
  }

  /**
   * Gets audit log entries for a specific workflow or operation
   */
  async getAuditEntries(filter?: {
    workflowId?: string;
    operation?: AuditLogEntry['operation'];
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<AuditLogEntry[]> {
    this.ensureInitialized();
    return await this.securityManager.getAuditEntries(filter);
  }

  /**
   * Generates a security report for a workflow
   */
  async generateSecurityReport(workflowId: string): Promise<{
    auditEntries: AuditLogEntry[];
    filePermissionsValid: boolean;
    lastSanitization?: Date;
    securityEvents: string[];
  }> {
    this.ensureInitialized();
    return await this.securityManager.generateSecurityReport(workflowId);
  }

  /**
   * Cleans up old audit log entries
   */
  async cleanupAuditLog(olderThanDays: number = 90): Promise<number> {
    this.ensureInitialized();
    return await this.securityManager.cleanupAuditLog(olderThanDays);
  }

  /**
   * Gets security configuration
   */
  getSecurityConfig(): Readonly<SecurityConfig> {
    this.ensureInitialized();
    return this.securityManager.getConfig();
  }

  /**
   * Handles warning threshold being reached
   */
  private async handleWarningThreshold(): Promise<void> {
    try {
      // Prepare for imminent preservation
      // This could include pre-compacting data, cleaning up temporary state, etc.
      console.log('Warning threshold reached - preparing for preservation');
    } catch (error) {
      this.systemErrors.push(`Warning threshold handler failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Handles preservation threshold being reached
   */
  private async handlePreservationThreshold(): Promise<void> {
    try {
      // Automatically trigger preservation
      await this.preserveWorkflows({ forcePreservation: true });
    } catch (error) {
      this.systemErrors.push(`Automatic preservation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Checks for existing preserved states on initialization
   */
  private async checkForExistingStates(): Promise<void> {
    try {
      const preservedStates = await this.restorationEngine.detectPreservedStates();
      
      if (preservedStates.length > 0) {
        console.log(`Found ${preservedStates.length} preserved workflow states available for restoration`);
      }
    } catch (error) {
      this.systemErrors.push(`Failed to check for existing states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Calculates current context size based on active workflows
   */
  private calculateCurrentContextSize(): number {
    try {
      const activeWorkflows = this.workflowManager.captureCurrentState();
      
      let totalSize = 0;
      for (const workflow of activeWorkflows) {
        totalSize += JSON.stringify(workflow).length;
      }
      
      return totalSize;
    } catch (error) {
      // Return a reasonable estimate if calculation fails
      return 1000; // 1KB default estimate
    }
  }

  /**
   * Ensures the system is initialized before operations
   */
  private ensureInitialized(): void {
    if (!this.isInitialized) {
      throw new WorkflowPreservationError(
        ErrorType.STORAGE_FAILURE,
        'Workflow preservation system not initialized. Call initialize() first.',
        {
          operation: 'ensureInitialized',
          timestamp: new Date()
        }
      );
    }
  }
}