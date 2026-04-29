// TypeScript interfaces for Workflow Context Preservation System

export interface WorkflowState {
  id: string;
  type: 'spec-creation' | 'task-execution' | 'design-review';
  phase: 'requirements' | 'design' | 'tasks' | 'implementation';
  currentTask?: string;
  progress: Progress;
  documents: DocumentState[];
  decisions: Decision[];
  userPreferences: UserPreferences;
  timestamp: Date;
  contextSize: number;
}

export interface CompactedState {
  id: string;
  essentialData: EssentialData;
  compressedContext: string;
  reconstructionMetadata: ReconstructionMetadata;
  compressionRatio: number;
  timestamp: Date;
}

export interface EssentialData {
  workflowType: string;
  currentPhase: string;
  activeTask: string;
  criticalDecisions: Decision[];
  documentStates: DocumentState[];
  nextSteps: string[];
  requirementReferences: string[];
}

export interface Progress {
  completedTasks: string[];
  currentTaskStatus: 'not_started' | 'in_progress' | 'completed';
  approvalStates: Record<string, boolean>;
  iterationCount: number;
  lastUserFeedback?: string;
}

export interface DocumentState {
  id: string;
  name: string;
  path: string;
  content: string;
  lastModified: Date;
  status: 'draft' | 'approved' | 'in_review';
}

export interface Decision {
  id: string;
  description: string;
  rationale: string;
  timestamp: Date;
  impact: 'low' | 'medium' | 'high';
  category: 'technical' | 'design' | 'requirement';
}

export interface UserPreferences {
  theme: 'light' | 'dark' | 'auto';
  language: string;
  notifications: boolean;
  autoSave: boolean;
  compressionLevel: 'low' | 'medium' | 'high';
}

export interface ReconstructionMetadata {
  originalSize: number;
  compactedSize: number;
  compressionAlgorithm: string;
  preservedComponents: string[];
  lostComponents: string[];
  reconstructionInstructions: string[];
}

export interface WorkflowInfo {
  id: string;
  type: WorkflowState['type'];
  phase: WorkflowState['phase'];
  lastActivity: Date;
  priority: 'low' | 'medium' | 'high';
}

export interface PreservedState {
  id: string;
  workflowId: string;
  filePath: string;
  timestamp: Date;
  size: number;
  compressionRatio: number;
}

// Context monitoring types
export interface ContextUtilization {
  current: number;
  maximum: number;
  percentage: number;
  estimatedRemaining: number;
}

export interface ThresholdCallback {
  threshold: number;
  callback: () => void;
  triggered: boolean;
}

// Storage types
export interface StorageConfig {
  basePath: string;
  archivePath: string;
  emergencyPath: string;
  maxFileSize: number;
  compressionEnabled: boolean;
}