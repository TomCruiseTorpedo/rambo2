// Security Manager for Workflow Context Preservation
// Handles data sanitization, file permissions, and audit logging

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { WorkflowState, CompactedState, Decision, DocumentState } from '../types';

export interface SecurityConfig {
  auditLogPath: string;
  enableDataSanitization: boolean;
  enableFilePermissions: boolean;
  enableAuditLogging: boolean;
  sensitiveDataPatterns: RegExp[];
  filePermissions: {
    mode: number;
    owner?: string;
    group?: string;
  };
}

export interface AuditLogEntry {
  timestamp: Date;
  operation: 'preservation' | 'restoration' | 'access' | 'deletion' | 'archive';
  workflowId: string;
  userId?: string;
  sessionId?: string;
  details: string;
  success: boolean;
  errorMessage?: string;
  dataSize?: number;
  filePath?: string;
}

export interface SanitizationResult {
  sanitizedData: any;
  removedFields: string[];
  sanitizedFields: string[];
  originalSize: number;
  sanitizedSize: number;
}

/**
 * Security Manager for Workflow Context Preservation
 * 
 * Provides comprehensive security features including:
 * - Data sanitization to remove sensitive information
 * - File permission management for workflow states
 * - Comprehensive audit logging for all operations
 */
export class SecurityManager {
  private readonly config: SecurityConfig;
  private readonly auditLogStream: fs.WriteStream;

  constructor(config: Partial<SecurityConfig> = {}) {
    this.config = {
      auditLogPath: config.auditLogPath || '.kiro/state/workflows/audit.log',
      enableDataSanitization: config.enableDataSanitization ?? true,
      enableFilePermissions: config.enableFilePermissions ?? true,
      enableAuditLogging: config.enableAuditLogging ?? true,
      sensitiveDataPatterns: config.sensitiveDataPatterns || this.getDefaultSensitivePatterns(),
      filePermissions: {
        mode: config.filePermissions?.mode || 0o600, // Read/write for owner only
        owner: config.filePermissions?.owner,
        group: config.filePermissions?.group
      }
    };

    // Ensure audit log directory exists
    this.ensureAuditLogDirectory();

    // Initialize audit log stream
    this.auditLogStream = fs.createWriteStream(this.config.auditLogPath, { flags: 'a' });
  }

  /**
   * Sanitizes workflow state data before preservation
   */
  sanitizeWorkflowState(state: WorkflowState): SanitizationResult {
    if (!this.config.enableDataSanitization) {
      return {
        sanitizedData: state,
        removedFields: [],
        sanitizedFields: [],
        originalSize: JSON.stringify(state).length,
        sanitizedSize: JSON.stringify(state).length
      };
    }

    const originalSize = JSON.stringify(state).length;
    const sanitizedState = JSON.parse(JSON.stringify(state)); // Deep clone
    const removedFields: string[] = [];
    const sanitizedFields: string[] = [];

    // Sanitize documents
    if (sanitizedState.documents) {
      sanitizedState.documents = sanitizedState.documents.map((doc: DocumentState, index: number) => {
        const sanitizedDoc = this.sanitizeDocumentContent(doc);
        if (sanitizedDoc.contentModified) {
          sanitizedFields.push(`documents[${index}].content`);
        }
        return sanitizedDoc.document;
      });
    }

    // Sanitize decisions
    if (sanitizedState.decisions) {
      sanitizedState.decisions = sanitizedState.decisions.map((decision: Decision, index: number) => {
        const sanitizedDecision = this.sanitizeDecisionContent(decision);
        if (sanitizedDecision.contentModified) {
          sanitizedFields.push(`decisions[${index}]`);
        }
        return sanitizedDecision.decision;
      });
    }

    // Sanitize user preferences (remove potentially sensitive settings)
    if (sanitizedState.userPreferences) {
      const sensitivePreferences = ['apiKeys', 'tokens', 'credentials', 'passwords'];
      sensitivePreferences.forEach(field => {
        if (sanitizedState.userPreferences[field]) {
          delete sanitizedState.userPreferences[field];
          removedFields.push(`userPreferences.${field}`);
        }
      });
    }

    // Sanitize progress feedback
    if (sanitizedState.progress?.lastUserFeedback) {
      const sanitizedFeedback = this.sanitizeText(sanitizedState.progress.lastUserFeedback);
      if (sanitizedFeedback.modified) {
        sanitizedState.progress.lastUserFeedback = sanitizedFeedback.text;
        sanitizedFields.push('progress.lastUserFeedback');
      }
    }

    const sanitizedSize = JSON.stringify(sanitizedState).length;

    return {
      sanitizedData: sanitizedState,
      removedFields,
      sanitizedFields,
      originalSize,
      sanitizedSize
    };
  }

  /**
   * Sanitizes compacted state data
   */
  sanitizeCompactedState(state: CompactedState): SanitizationResult {
    if (!this.config.enableDataSanitization) {
      return {
        sanitizedData: state,
        removedFields: [],
        sanitizedFields: [],
        originalSize: JSON.stringify(state).length,
        sanitizedSize: JSON.stringify(state).length
      };
    }

    const originalSize = JSON.stringify(state).length;
    const sanitizedState = JSON.parse(JSON.stringify(state)); // Deep clone
    const removedFields: string[] = [];
    const sanitizedFields: string[] = [];

    // Sanitize essential data
    if (sanitizedState.essentialData) {
      // Sanitize critical decisions
      if (sanitizedState.essentialData.criticalDecisions) {
        sanitizedState.essentialData.criticalDecisions = sanitizedState.essentialData.criticalDecisions.map((decision: Decision, index: number) => {
          const sanitizedDecision = this.sanitizeDecisionContent(decision);
          if (sanitizedDecision.contentModified) {
            sanitizedFields.push(`essentialData.criticalDecisions[${index}]`);
          }
          return sanitizedDecision.decision;
        });
      }

      // Sanitize document states
      if (sanitizedState.essentialData.documentStates) {
        sanitizedState.essentialData.documentStates = sanitizedState.essentialData.documentStates.map((doc: DocumentState, index: number) => {
          const sanitizedDoc = this.sanitizeDocumentContent(doc);
          if (sanitizedDoc.contentModified) {
            sanitizedFields.push(`essentialData.documentStates[${index}].content`);
          }
          return sanitizedDoc.document;
        });
      }
    }

    // Sanitize compressed context
    if (sanitizedState.compressedContext) {
      const sanitizedContext = this.sanitizeText(sanitizedState.compressedContext);
      if (sanitizedContext.modified) {
        sanitizedState.compressedContext = sanitizedContext.text;
        sanitizedFields.push('compressedContext');
      }
    }

    const sanitizedSize = JSON.stringify(sanitizedState).length;

    return {
      sanitizedData: sanitizedState,
      removedFields,
      sanitizedFields,
      originalSize,
      sanitizedSize
    };
  }

  /**
   * Sets secure file permissions on a workflow state file
   */
  async setFilePermissions(filePath: string): Promise<void> {
    if (!this.config.enableFilePermissions) {
      return;
    }

    try {
      // Set file mode (permissions)
      await fs.promises.chmod(filePath, this.config.filePermissions.mode);

      // Set owner and group if specified (Unix-like systems only)
      if (process.platform !== 'win32') {
        if (this.config.filePermissions.owner || this.config.filePermissions.group) {
          const { spawn } = require('child_process');
          
          if (this.config.filePermissions.owner) {
            const chownProcess = spawn('chown', [this.config.filePermissions.owner, filePath]);
            await new Promise((resolve, reject) => {
              chownProcess.on('close', (code) => {
                if (code === 0) resolve(void 0);
                else reject(new Error(`chown failed with code ${code}`));
              });
            });
          }

          if (this.config.filePermissions.group) {
            const chgrpProcess = spawn('chgrp', [this.config.filePermissions.group, filePath]);
            await new Promise((resolve, reject) => {
              chgrpProcess.on('close', (code) => {
                if (code === 0) resolve(void 0);
                else reject(new Error(`chgrp failed with code ${code}`));
              });
            });
          }
        }
      }
    } catch (error) {
      throw new Error(`Failed to set file permissions: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates file permissions on a workflow state file
   */
  async validateFilePermissions(filePath: string): Promise<boolean> {
    if (!this.config.enableFilePermissions) {
      return true;
    }

    try {
      const stats = await fs.promises.stat(filePath);
      const currentMode = stats.mode & parseInt('777', 8);
      const expectedMode = this.config.filePermissions.mode & parseInt('777', 8);
      
      return currentMode === expectedMode;
    } catch (error) {
      return false;
    }
  }

  /**
   * Logs an audit entry for preservation and restoration operations
   */
  async logAuditEntry(entry: Omit<AuditLogEntry, 'timestamp'>): Promise<void> {
    if (!this.config.enableAuditLogging) {
      return;
    }

    const auditEntry: AuditLogEntry = {
      timestamp: new Date(),
      ...entry
    };

    const logLine = JSON.stringify(auditEntry) + '\n';
    
    return new Promise((resolve, reject) => {
      this.auditLogStream.write(logLine, (error) => {
        if (error) {
          reject(new Error(`Failed to write audit log: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  /**
   * Retrieves audit log entries for a specific workflow or operation
   */
  async getAuditEntries(filter?: {
    workflowId?: string;
    operation?: AuditLogEntry['operation'];
    startDate?: Date;
    endDate?: Date;
    userId?: string;
  }): Promise<AuditLogEntry[]> {
    if (!this.config.enableAuditLogging || !fs.existsSync(this.config.auditLogPath)) {
      return [];
    }

    try {
      const logContent = await fs.promises.readFile(this.config.auditLogPath, 'utf8');
      const lines = logContent.split('\n').filter(line => line.trim());
      
      const entries: AuditLogEntry[] = lines.map(line => {
        try {
          const entry = JSON.parse(line);
          entry.timestamp = new Date(entry.timestamp);
          return entry;
        } catch {
          return null;
        }
      }).filter(entry => entry !== null);

      // Apply filters
      let filteredEntries = entries;
      
      if (filter) {
        if (filter.workflowId) {
          filteredEntries = filteredEntries.filter(entry => entry.workflowId === filter.workflowId);
        }
        
        if (filter.operation) {
          filteredEntries = filteredEntries.filter(entry => entry.operation === filter.operation);
        }
        
        if (filter.startDate) {
          filteredEntries = filteredEntries.filter(entry => entry.timestamp >= filter.startDate!);
        }
        
        if (filter.endDate) {
          filteredEntries = filteredEntries.filter(entry => entry.timestamp <= filter.endDate!);
        }
        
        if (filter.userId) {
          filteredEntries = filteredEntries.filter(entry => entry.userId === filter.userId);
        }
      }

      return filteredEntries.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      throw new Error(`Failed to read audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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
    const auditEntries = await this.getAuditEntries({ workflowId });
    
    // Check for security-related events
    const securityEvents: string[] = [];
    
    // Look for failed operations
    const failedOperations = auditEntries.filter(entry => !entry.success);
    if (failedOperations.length > 0) {
      securityEvents.push(`${failedOperations.length} failed operations detected`);
    }

    // Look for unusual access patterns
    const accessEntries = auditEntries.filter(entry => entry.operation === 'access');
    if (accessEntries.length > 10) {
      securityEvents.push(`High number of access operations (${accessEntries.length})`);
    }

    // Find last sanitization
    const sanitizationEntries = auditEntries.filter(entry => 
      entry.details.includes('sanitization') || entry.details.includes('sanitized')
    );
    const lastSanitization = sanitizationEntries.length > 0 ? sanitizationEntries[0].timestamp : undefined;

    return {
      auditEntries,
      filePermissionsValid: true, // Will be updated when checking actual files
      lastSanitization,
      securityEvents
    };
  }

  /**
   * Clears audit log entries older than specified days
   */
  async cleanupAuditLog(olderThanDays: number = 90): Promise<number> {
    if (!this.config.enableAuditLogging || !fs.existsSync(this.config.auditLogPath)) {
      return 0;
    }

    try {
      const entries = await this.getAuditEntries();
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      const recentEntries = entries.filter(entry => entry.timestamp >= cutoffDate);
      const removedCount = entries.length - recentEntries.length;
      
      // Rewrite the audit log with only recent entries
      const logContent = recentEntries.map(entry => JSON.stringify(entry)).join('\n') + '\n';
      await fs.promises.writeFile(this.config.auditLogPath, logContent, 'utf8');
      
      return removedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup audit log: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Closes the audit log stream
   */
  async close(): Promise<void> {
    return new Promise((resolve) => {
      this.auditLogStream.end(() => {
        resolve();
      });
    });
  }

  /**
   * Gets security configuration
   */
  getConfig(): Readonly<SecurityConfig> {
    return { ...this.config };
  }

  /**
   * Sanitizes document content
   */
  private sanitizeDocumentContent(document: DocumentState): { document: DocumentState; contentModified: boolean } {
    const sanitizedDoc = { ...document };
    const sanitizedContent = this.sanitizeText(document.content);
    
    sanitizedDoc.content = sanitizedContent.text;
    
    return {
      document: sanitizedDoc,
      contentModified: sanitizedContent.modified
    };
  }

  /**
   * Sanitizes decision content
   */
  private sanitizeDecisionContent(decision: Decision): { decision: Decision; contentModified: boolean } {
    const sanitizedDecision = { ...decision };
    let contentModified = false;

    const sanitizedDescription = this.sanitizeText(decision.description);
    if (sanitizedDescription.modified) {
      sanitizedDecision.description = sanitizedDescription.text;
      contentModified = true;
    }

    const sanitizedRationale = this.sanitizeText(decision.rationale);
    if (sanitizedRationale.modified) {
      sanitizedDecision.rationale = sanitizedRationale.text;
      contentModified = true;
    }

    return {
      decision: sanitizedDecision,
      contentModified
    };
  }

  /**
   * Sanitizes text content by removing sensitive patterns
   */
  private sanitizeText(text: string): { text: string; modified: boolean } {
    let sanitizedText = text;
    let modified = false;

    for (const pattern of this.config.sensitiveDataPatterns) {
      const originalText = sanitizedText;
      sanitizedText = sanitizedText.replace(pattern, '[REDACTED]');
      if (sanitizedText !== originalText) {
        modified = true;
      }
    }

    return { text: sanitizedText, modified };
  }

  /**
   * Gets default sensitive data patterns
   */
  private getDefaultSensitivePatterns(): RegExp[] {
    return [
      // API Keys and tokens
      /\b[A-Za-z0-9]{32,}\b/g, // Generic long alphanumeric strings
      /sk-[A-Za-z0-9]{48}/g, // OpenAI API keys
      /ghp_[A-Za-z0-9]{36}/g, // GitHub personal access tokens
      /gho_[A-Za-z0-9]{36}/g, // GitHub OAuth tokens
      /ghu_[A-Za-z0-9]{36}/g, // GitHub user tokens
      /ghs_[A-Za-z0-9]{36}/g, // GitHub server tokens
      
      // AWS credentials
      /AKIA[0-9A-Z]{16}/g, // AWS Access Key ID
      /[A-Za-z0-9/+=]{40}/g, // AWS Secret Access Key pattern
      
      // Email addresses (partial sanitization)
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
      
      // Phone numbers
      /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/g,
      /\b\(\d{3}\)\s*\d{3}[-.]?\d{4}\b/g,
      
      // Credit card numbers (basic pattern)
      /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g,
      
      // Social Security Numbers
      /\b\d{3}-\d{2}-\d{4}\b/g,
      
      // IP addresses (private ranges)
      /\b192\.168\.\d{1,3}\.\d{1,3}\b/g,
      /\b10\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g,
      /\b172\.(1[6-9]|2[0-9]|3[0-1])\.\d{1,3}\.\d{1,3}\b/g,
      
      // Passwords in configuration-like text
      /password\s*[:=]\s*[^\s\n]+/gi,
      /pwd\s*[:=]\s*[^\s\n]+/gi,
      /secret\s*[:=]\s*[^\s\n]+/gi,
      /token\s*[:=]\s*[^\s\n]+/gi,
      /key\s*[:=]\s*[^\s\n]+/gi
    ];
  }

  /**
   * Ensures audit log directory exists
   */
  private ensureAuditLogDirectory(): void {
    const auditLogDir = path.dirname(this.config.auditLogPath);
    if (!fs.existsSync(auditLogDir)) {
      fs.mkdirSync(auditLogDir, { recursive: true });
    }
  }
}