// Storage Utilities for Workflow Context Preservation
// Provides file system operations, JSON serialization, and compression

import * as fs from 'fs';
import * as path from 'path';
import * as zlib from 'zlib';
import { CompactedState, PreservedState } from '../types';

export interface StorageConfig {
  basePath: string;
  archivePath: string;
  emergencyPath: string;
  compressionEnabled: boolean;
  maxFileSize: number;
}

export class StorageUtils {
  private readonly config: StorageConfig;

  constructor(basePath: string = '.kiro/state/workflows') {
    this.config = {
      basePath,
      archivePath: path.join(basePath, 'archive'),
      emergencyPath: path.join(basePath, 'emergency'),
      compressionEnabled: true,
      maxFileSize: 10 * 1024 * 1024 // 10MB default
    };
    this.ensureDirectories();
  }

  /**
   * Saves a compacted state to storage with optional compression
   */
  async saveState(state: CompactedState, filename?: string): Promise<string> {
    const fileName = filename || this.generateFileName(state);
    const filePath = path.join(this.config.basePath, fileName);

    try {
      // Serialize the state to JSON
      const serialized = this.serializeState(state);
      
      // Compress if enabled and data is large enough to benefit
      const data = this.config.compressionEnabled && serialized.length > 1024
        ? await this.compress(serialized)
        : Buffer.from(serialized, 'utf8');

      // Write to file
      await fs.promises.writeFile(filePath, data);
      
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Loads a compacted state from storage
   */
  async loadState(stateId: string): Promise<CompactedState> {
    let fileName: string;
    
    // If stateId already ends with .json, use it as is
    if (stateId.endsWith('.json')) {
      fileName = stateId;
    } else {
      // Try to find the file by looking for files that contain the stateId
      const files = await fs.promises.readdir(this.config.basePath);
      const matchingFiles = files.filter(file => 
        file.endsWith('.json') && file.includes(stateId)
      );
      
      if (matchingFiles.length === 0) {
        throw new Error(`State file not found for ID: ${stateId}`);
      }
      
      // Use the first matching file (should be unique)
      fileName = matchingFiles[0];
    }
    
    const filePath = path.join(this.config.basePath, fileName);

    try {
      if (!fs.existsSync(filePath)) {
        throw new Error(`State file not found: ${fileName}`);
      }

      // Read the file
      const data = await fs.promises.readFile(filePath);
      
      // Try to decompress, fall back to direct parsing if not compressed
      let serialized: string;
      try {
        serialized = await this.decompress(data);
      } catch {
        // Not compressed, treat as plain text
        serialized = data.toString('utf8');
      }

      // Deserialize the state
      return this.deserializeState(serialized);
    } catch (error) {
      throw new Error(`Failed to load state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Lists all preserved states in storage
   */
  async listStates(): Promise<PreservedState[]> {
    try {
      const files = await fs.promises.readdir(this.config.basePath);
      const stateFiles = files.filter(file => file.endsWith('.json') && !file.startsWith('.'));
      
      const preservedStates: PreservedState[] = [];
      
      for (const file of stateFiles) {
        try {
          const filePath = path.join(this.config.basePath, file);
          const stats = await fs.promises.stat(filePath);
          
          // Extract state ID from filename
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
          console.warn(`Failed to process state file ${file}:`, error);
        }
      }
      
      // Sort by timestamp, most recent first
      return preservedStates.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
    } catch (error) {
      throw new Error(`Failed to list states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archives a state file by moving it to the archive directory
   */
  async archiveState(stateId: string): Promise<void> {
    let fileName: string;
    
    // If stateId already ends with .json, use it as is
    if (stateId.endsWith('.json')) {
      fileName = stateId;
    } else {
      // Try to find the file by looking for files that contain the stateId
      const files = await fs.promises.readdir(this.config.basePath);
      const matchingFiles = files.filter(file => 
        file.endsWith('.json') && file.includes(stateId)
      );
      
      if (matchingFiles.length === 0) {
        throw new Error(`State file not found for ID: ${stateId}`);
      }
      
      // Use the first matching file (should be unique)
      fileName = matchingFiles[0];
    }
    
    const sourcePath = path.join(this.config.basePath, fileName);
    const targetPath = path.join(this.config.archivePath, fileName);

    try {
      if (!fs.existsSync(sourcePath)) {
        throw new Error(`State file not found: ${fileName}`);
      }

      await fs.promises.rename(sourcePath, targetPath);
    } catch (error) {
      throw new Error(`Failed to archive state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Archives all states except the specified one
   */
  async archiveOlderStates(currentStateId: string): Promise<number> {
    try {
      const states = await this.listStates();
      // Filter out the current state by checking if the state ID contains the currentStateId
      const statesToArchive = states.filter(state => 
        state.id !== currentStateId && !state.id.includes(currentStateId)
      );
      
      let archivedCount = 0;
      for (const state of statesToArchive) {
        try {
          await this.archiveState(state.id);
          archivedCount++;
        } catch (error) {
          console.warn(`Failed to archive state ${state.id}:`, error);
        }
      }
      
      return archivedCount;
    } catch (error) {
      throw new Error(`Failed to archive older states: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Deletes a state file permanently
   */
  async deleteState(stateId: string): Promise<void> {
    let fileName: string;
    
    // If stateId already ends with .json, use it as is
    if (stateId.endsWith('.json')) {
      fileName = stateId;
    } else {
      // Try to find the file by looking for files that contain the stateId
      const files = await fs.promises.readdir(this.config.basePath);
      const matchingFiles = files.filter(file => 
        file.endsWith('.json') && file.includes(stateId)
      );
      
      if (matchingFiles.length === 0) {
        // No file found, just return (already deleted or never existed)
        return;
      }
      
      // Use the first matching file (should be unique)
      fileName = matchingFiles[0];
    }
    
    const filePath = path.join(this.config.basePath, fileName);

    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      throw new Error(`Failed to delete state: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Saves a state to the emergency backup location
   */
  async saveEmergencyBackup(state: CompactedState): Promise<string> {
    const fileName = `emergency-${this.generateFileName(state)}`;
    const filePath = path.join(this.config.emergencyPath, fileName);

    try {
      const serialized = this.serializeState(state);
      await fs.promises.writeFile(filePath, serialized, 'utf8');
      return filePath;
    } catch (error) {
      throw new Error(`Failed to save emergency backup: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Validates that a state file exists and is readable
   */
  async validateState(stateId: string): Promise<boolean> {
    try {
      // Try to load and parse the state
      await this.loadState(stateId);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Gets the most recent state without loading it fully
   */
  async getMostRecentState(): Promise<PreservedState | null> {
    const states = await this.listStates();
    return states.length > 0 ? states[0] : null;
  }

  /**
   * Compresses data using gzip
   */
  private async compress(data: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      zlib.gzip(Buffer.from(data, 'utf8'), (err, result) => {
        if (err) reject(err);
        else resolve(result);
      });
    });
  }

  /**
   * Decompresses data using gzip
   */
  private async decompress(data: Buffer): Promise<string> {
    return new Promise((resolve, reject) => {
      zlib.gunzip(data, (err, result) => {
        if (err) reject(err);
        else resolve(result.toString('utf8'));
      });
    });
  }

  /**
   * Serializes a compacted state to JSON string
   */
  private serializeState(state: CompactedState): string {
    return JSON.stringify(state, null, 2);
  }

  /**
   * Deserializes a JSON string to a compacted state
   */
  private deserializeState(serialized: string): CompactedState {
    const parsed = JSON.parse(serialized);
    
    // Convert timestamp strings back to Date objects
    if (parsed.timestamp) {
      parsed.timestamp = new Date(parsed.timestamp);
    }
    
    return parsed as CompactedState;
  }

  /**
   * Generates a filename for a compacted state
   */
  private generateFileName(state: CompactedState): string {
    return `${state.essentialData.workflowType}-${state.id}.json`;
  }

  /**
   * Ensures all required directories exist
   */
  private ensureDirectories(): void {
    const directories = [
      this.config.basePath,
      this.config.archivePath,
      this.config.emergencyPath
    ];
    
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
  }

  /**
   * Gets storage configuration
   */
  getConfig(): Readonly<StorageConfig> {
    return { ...this.config };
  }

  /**
   * Cleans up old archived states (older than specified days)
   */
  async cleanupArchive(olderThanDays: number = 30): Promise<number> {
    try {
      const files = await fs.promises.readdir(this.config.archivePath);
      const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
      
      let deletedCount = 0;
      for (const file of files) {
        try {
          const filePath = path.join(this.config.archivePath, file);
          const stats = await fs.promises.stat(filePath);
          
          if (stats.mtime < cutoffDate) {
            await fs.promises.unlink(filePath);
            deletedCount++;
          }
        } catch (error) {
          console.warn(`Failed to cleanup archived file ${file}:`, error);
        }
      }
      
      return deletedCount;
    } catch (error) {
      throw new Error(`Failed to cleanup archive: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
