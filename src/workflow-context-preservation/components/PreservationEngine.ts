// Preservation Engine Component
// Compacts and saves workflow state when limits approached

import { 
  WorkflowState, 
  CompactedState, 
  EssentialData, 
  ReconstructionMetadata,
  Decision,
  DocumentState
} from '../types';
import { ErrorHandler, ErrorType, ErrorContext, WorkflowPreservationError } from '../utils/ErrorHandler';
import { PerformanceMonitor } from '../utils/PerformanceMonitor';
import { SecurityManager } from '../utils/SecurityManager';
import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';

export class PreservationEngine {
  private readonly storageBasePath: string;
  private readonly targetCompressionRatio: number = 0.8; // 80% reduction target
  private readonly errorHandler: ErrorHandler;
  private readonly performanceMonitor: PerformanceMonitor;
  private readonly securityManager: SecurityManager;
  private readonly compressionCache = new Map<string, Buffer>();
  private readonly maxCacheSize = 50; // Maximum cached items

  constructor(storageBasePath: string = '.kiro/state/workflows', securityManager?: SecurityManager) {
    this.storageBasePath = storageBasePath;
    this.errorHandler = new ErrorHandler(storageBasePath);
    this.performanceMonitor = new PerformanceMonitor();
    this.securityManager = securityManager || new SecurityManager({
      auditLogPath: path.join(storageBasePath, 'audit.log')
    });
    this.ensureStorageDirectories();
  }

  /**
   * Compacts workflow state by reducing context size while preserving essential information
   * Targets 80% reduction as guideline while prioritizing critical information
   */
  async compactWorkflowState(state: WorkflowState): Promise<CompactedState> {
    const { result } = await this.performanceMonitor.measureOperation(
      'compaction',
      async () => {
        return await this.performCompactionInternal(state);
      },
      this.calculateStateSize(state)
    );
    return result;
  }

  /**
   * Internal compaction implementation with performance optimizations
   */
  private async performCompactionInternal(state: WorkflowState): Promise<CompactedState> {
    const context: ErrorContext = {
      operation: 'compactWorkflowState',
      workflowId: state.id,
      timestamp: new Date(),
      additionalInfo: { originalSize: this.calculateStateSize(state) }
    };

    try {
      // Sanitize the workflow state before compaction
      const sanitizationResult = this.securityManager.sanitizeWorkflowState(state);
      const sanitizedState = sanitizationResult.sanitizedData;
      
      const essentialData = this.prioritizeEssentialData(sanitizedState);
      const originalSize = this.calculateStateSize(state);

      // Create compressed context by removing redundant information
      const compressedContext = this.createCompressedContext(sanitizedState, essentialData);

      const compactedSize =
        this.calculateEssentialDataSize(essentialData) + compressedContext.length;
      const compressionRatio = originalSize > 0 ? compactedSize / originalSize : 1;

      const reconstructionInstructions = [
        ...this.generateReconstructionInstructions(sanitizedState, essentialData)
      ];
      if (compressionRatio > 1 && originalSize > 0) {
        reconstructionInstructions.unshift(
          'Compression ratio is above 1: serialized essential data plus compressed context is larger than the original workflow JSON. That is normal when the input was small or sparse while outputs add structured summaries and metadata; it does not mean essential information was discarded.'
        );
      }

      const reconstructionMetadata: ReconstructionMetadata = {
        originalSize,
        compactedSize,
        compressionAlgorithm: 'intelligent-prioritization',
        preservedComponents: this.getPreservedComponents(essentialData),
        lostComponents: this.getLostComponents(sanitizedState, essentialData),
        reconstructionInstructions
      };

      // Product policy: never swap this result for an emergency minimal snapshot based on ratio alone (D1).

      return {
        id: `compacted-${state.id}-${Date.now()}`,
        essentialData,
        compressedContext,
        reconstructionMetadata,
        compressionRatio,
        timestamp: new Date()
      };
    } catch (error) {
      // Handle compaction failure
      const recoveryResult = await this.errorHandler.handleCompactionFailure(
        state,
        context,
        this.targetCompressionRatio
      );
      
      if (recoveryResult.success && recoveryResult.recoveredData) {
        // Return emergency compacted state
        const minimalState = recoveryResult.recoveredData;
        const minimalEssentialData: EssentialData = {
          workflowType: minimalState.type,
          currentPhase: minimalState.phase,
          activeTask: minimalState.currentTask || 'No active task',
          criticalDecisions: [],
          documentStates: [],
          nextSteps: minimalState.nextSteps,
          requirementReferences: []
        };
        
        return {
          id: `emergency-compacted-${state.id}-${Date.now()}`,
          essentialData: minimalEssentialData,
          compressedContext: JSON.stringify({ emergency: true, error: (error as Error).message }),
          reconstructionMetadata: {
            originalSize: this.calculateStateSize(state),
            compactedSize: JSON.stringify(minimalEssentialData).length,
            compressionAlgorithm: 'emergency-fallback',
            preservedComponents: ['workflowType', 'currentPhase', 'nextSteps'],
            lostComponents: ['Most data due to compaction error'],
            reconstructionInstructions: ['Emergency state - reconstruct manually']
          },
          compressionRatio: 0.05, // Extremely aggressive for emergency
          timestamp: new Date()
        };
      }
      
      throw new WorkflowPreservationError(
        ErrorType.COMPACTION_FAILURE,
        `Compaction failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
        context
      );
    }
  }

  /**
   * Saves compacted workflow state to persistent storage with error handling and recovery
   */
  async saveWorkflowState(state: CompactedState): Promise<string> {
    const fileName = `${state.essentialData.workflowType}-${state.id}.json`;
    const filePath = path.join(this.storageBasePath, fileName);
    
    const context: ErrorContext = {
      operation: 'saveWorkflowState',
      workflowId: state.essentialData.workflowType,
      stateId: state.id,
      filePath,
      timestamp: new Date()
    };

    const saveOperation = async () => {
      // Sanitize the state before saving
      const sanitizationResult = this.securityManager.sanitizeCompactedState(state);
      const sanitizedState = sanitizationResult.sanitizedData;
      
      // Serialize and optionally compress the state
      const serializedState = JSON.stringify(sanitizedState, null, 2);
      const compressedData = await this.compressData(serializedState);
      
      await fs.promises.writeFile(filePath, compressedData);
      
      // Set secure file permissions
      await this.securityManager.setFilePermissions(filePath);
      
      // Log audit entry
      await this.securityManager.logAuditEntry({
        operation: 'preservation',
        workflowId: state.essentialData.workflowType,
        details: `Saved workflow state with ${sanitizationResult.sanitizedFields.length} sanitized fields and ${sanitizationResult.removedFields.length} removed fields`,
        success: true,
        dataSize: compressedData.length,
        filePath
      });
      
      return filePath;
    };

    try {
      return await saveOperation();
    } catch (error) {
      // Log failed preservation attempt
      await this.securityManager.logAuditEntry({
        operation: 'preservation',
        workflowId: state.essentialData.workflowType,
        details: `Failed to save workflow state`,
        success: false,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        filePath
      });
      
      // Handle storage failure with recovery mechanisms
      const recoveryResult = await this.errorHandler.handleStorageFailure(
        saveOperation,
        context,
        state // Provide state as fallback data for emergency backup
      );
      
      if (recoveryResult.success) {
        return recoveryResult.recoveredData || filePath;
      } else {
        throw new WorkflowPreservationError(
          ErrorType.STORAGE_FAILURE,
          `Failed to save workflow state: ${error instanceof Error ? error.message : 'Unknown error'}`,
          context
        );
      }
    }
  }

  /**
   * Prioritizes essential workflow data for preservation
   * Focuses on current task details, recent decisions, active document states, and requirement references
   */
  prioritizeEssentialData(state: WorkflowState): EssentialData {
    // Prioritize recent and high-impact decisions
    const criticalDecisions = this.filterCriticalDecisions(state.decisions);
    
    // Prioritize active and recently modified documents
    const essentialDocuments = this.filterEssentialDocuments(state.documents);
    
    // Generate next steps based on current progress
    const nextSteps = this.generateNextSteps(state);
    
    // Extract requirement references from decisions and documents
    const requirementReferences = this.extractRequirementReferences(state);

    return {
      workflowType: state.type,
      currentPhase: state.phase,
      activeTask: state.currentTask || 'No active task',
      criticalDecisions,
      documentStates: essentialDocuments,
      nextSteps,
      requirementReferences
    };
  }

  /** JSON clone restores ISO strings; normalize so comparisons match Date semantics */
  private coerceDate(value: Date | string): Date {
    return value instanceof Date ? value : new Date(value);
  }

  /**
   * Filters decisions to keep only critical ones (recent, high-impact, or technical)
   */
  private filterCriticalDecisions(decisions: Decision[]): Decision[] {
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return decisions
      .filter(decision => {
        const ts = this.coerceDate(decision.timestamp as Date | string);
        if (ts >= oneDayAgo) return true;
        if (decision.impact === 'high') return true;
        if (decision.category === 'technical') return true;
        return false;
      })
      .sort(
        (a, b) =>
          this.coerceDate(b.timestamp as Date | string).getTime() -
          this.coerceDate(a.timestamp as Date | string).getTime()
      );
  }

  /**
   * Filters documents to keep only essential ones (active, recently modified, or approved)
   */
  private filterEssentialDocuments(documents: DocumentState[]): DocumentState[] {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const filtered = documents.filter(doc => {
      const lm = this.coerceDate(doc.lastModified as Date | string);
      if (lm >= oneHourAgo) return true;
      if (doc.status === 'approved') return true;
      if (doc.status === 'in_review') return true;
      return false;
    });

    // If filtering removed too many documents, keep at least the most recent ones
    if (filtered.length === 0 && documents.length > 0) {
      return documents
        .sort(
          (a, b) =>
            this.coerceDate(b.lastModified as Date | string).getTime() -
            this.coerceDate(a.lastModified as Date | string).getTime()
        )
        .slice(0, Math.min(2, documents.length));
    }

    return filtered.sort(
      (a, b) =>
        this.coerceDate(b.lastModified as Date | string).getTime() -
        this.coerceDate(a.lastModified as Date | string).getTime()
    );
  }

  /**
   * Generates next steps based on current workflow state
   */
  private generateNextSteps(state: WorkflowState): string[] {
    const steps: string[] = [];
    
    // Add phase-specific next steps
    switch (state.phase) {
      case 'requirements':
        steps.push('Review and finalize requirements document');
        steps.push('Get user approval for requirements');
        break;
      case 'design':
        steps.push('Complete design document');
        steps.push('Review correctness properties');
        steps.push('Get user approval for design');
        break;
      case 'tasks':
        steps.push('Finalize implementation task list');
        steps.push('Get user approval for tasks');
        break;
      case 'implementation':
        if (state.currentTask) {
          steps.push(`Continue with current task: ${state.currentTask}`);
        }
        steps.push('Execute remaining implementation tasks');
        break;
    }
    
    // Add task-specific next steps
    if (state.progress.currentTaskStatus === 'in_progress' && state.currentTask) {
      steps.unshift(`Complete current task: ${state.currentTask}`);
    }
    
    return steps;
  }

  /**
   * Extracts requirement references from decisions and documents
   */
  private extractRequirementReferences(state: WorkflowState): string[] {
    const references = new Set<string>();
    
    // Extract from decision rationales
    state.decisions.forEach(decision => {
      const matches = decision.rationale.match(/Requirements?\s+(\d+(?:\.\d+)*)/gi);
      if (matches) {
        matches.forEach(match => references.add(match));
      }
    });
    
    // Extract from document content
    state.documents.forEach(doc => {
      const matches = doc.content.match(/Requirements?\s+(\d+(?:\.\d+)*)/gi);
      if (matches) {
        matches.forEach(match => references.add(match));
      }
    });
    
    return Array.from(references).sort();
  }

  /**
   * Creates compressed context by removing redundant information
   */
  private createCompressedContext(state: WorkflowState, essentialData: EssentialData): string {
    const context = {
      // Keep only non-essential decisions for context
      additionalDecisions: state.decisions.filter(d => 
        !essentialData.criticalDecisions.some(cd => cd.id === d.id)
      ).map(d => ({
        description: d.description,
        category: d.category,
        impact: d.impact
      })),
      
      // Keep summary of user preferences
      preferences: {
        compressionLevel: state.userPreferences.compressionLevel,
        autoSave: state.userPreferences.autoSave
      },
      
      // Keep progress summary
      progressSummary: {
        completedTasksCount: state.progress.completedTasks.length,
        recentCompletedTasks: state.progress.completedTasks.slice(-3), // Keep last 3 completed tasks
        iterationCount: state.progress.iterationCount,
        hasUserFeedback: !!state.progress.lastUserFeedback
      }
    };
    
    return JSON.stringify(context);
  }

  /**
   * Calculates the size of a workflow state in characters
   */
  private calculateStateSize(state: WorkflowState): number {
    return JSON.stringify(state).length;
  }

  /**
   * Calculates the size of essential data in characters
   */
  private calculateEssentialDataSize(essentialData: EssentialData): number {
    return JSON.stringify(essentialData).length;
  }

  /**
   * Gets list of preserved components
   */
  private getPreservedComponents(essentialData: EssentialData): string[] {
    const components = ['workflowType', 'currentPhase', 'activeTask', 'nextSteps'];
    
    if (essentialData.criticalDecisions.length > 0) {
      components.push('criticalDecisions');
    }
    
    if (essentialData.documentStates.length > 0) {
      components.push('documentStates');
    }
    
    if (essentialData.requirementReferences.length > 0) {
      components.push('requirementReferences');
    }
    
    return components;
  }

  /**
   * Gets list of components that were lost during compaction
   */
  private getLostComponents(state: WorkflowState, essentialData: EssentialData): string[] {
    const lost: string[] = [];
    
    // Check if any decisions were lost
    if (state.decisions.length > essentialData.criticalDecisions.length) {
      lost.push(`${state.decisions.length - essentialData.criticalDecisions.length} non-critical decisions`);
    }
    
    // Check if any documents were lost
    if (state.documents.length > essentialData.documentStates.length) {
      lost.push(`${state.documents.length - essentialData.documentStates.length} non-essential documents`);
    }
    
    // Always lose some detailed context
    lost.push('detailed user preferences', 'verbose explanations', 'completed sub-task details');
    
    return lost;
  }

  /**
   * Generates instructions for reconstructing the workflow
   */
  private generateReconstructionInstructions(state: WorkflowState, essentialData: EssentialData): string[] {
    const instructions: string[] = [];
    
    instructions.push(`Restore workflow type: ${essentialData.workflowType}`);
    instructions.push(`Set current phase: ${essentialData.currentPhase}`);
    
    if (essentialData.activeTask !== 'No active task') {
      instructions.push(`Resume active task: ${essentialData.activeTask}`);
    }
    
    if (essentialData.criticalDecisions.length > 0) {
      instructions.push(`Load ${essentialData.criticalDecisions.length} critical decisions`);
    }
    
    if (essentialData.documentStates.length > 0) {
      instructions.push(`Restore ${essentialData.documentStates.length} essential documents`);
    }
    
    instructions.push('Apply default user preferences');
    instructions.push('Initialize progress tracking from preserved state');
    
    return instructions;
  }

  /**
   * Compresses data using gzip with caching for performance
   */
  private async compressData(data: string): Promise<Buffer> {
    // Create cache key based on data hash
    const cacheKey = this.createCacheKey(data);
    
    // Check cache first
    if (this.compressionCache.has(cacheKey)) {
      return this.compressionCache.get(cacheKey)!;
    }
    
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data, 'utf8'), (err, result) => {
        if (err) {
          reject(err);
        } else {
          // Cache the result for future use
          this.addToCache(cacheKey, result);
          resolve(result);
        }
      });
    });
  }

  /**
   * Creates a simple cache key for compression data
   */
  private createCacheKey(data: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `${hash}_${data.length}`;
  }

  /**
   * Adds compressed data to cache with size management
   */
  private addToCache(key: string, data: Buffer): void {
    // Remove oldest entries if cache is full
    if (this.compressionCache.size >= this.maxCacheSize) {
      const firstKey = this.compressionCache.keys().next().value;
      this.compressionCache.delete(firstKey);
    }
    
    this.compressionCache.set(key, data);
  }

  /**
   * Gets performance metrics for the preservation engine
   */
  getPerformanceMetrics() {
    return this.performanceMonitor.getPerformanceReport('compaction');
  }

  /**
   * Clears compression cache to free memory
   */
  clearCache(): void {
    this.compressionCache.clear();
  }

  /**
   * Ensures storage directories exist
   */
  private ensureStorageDirectories(): void {
    const directories = [
      this.storageBasePath,
      path.join(this.storageBasePath, 'archive'),
      path.join(this.storageBasePath, 'emergency')
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }
}