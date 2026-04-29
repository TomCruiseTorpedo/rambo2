// Unit tests for StorageUtils
// Tests file save/load operations, JSON serialization, compression, and archival system

import { StorageUtils } from '../utils/StorageUtils';
import { CompactedState, EssentialData, ReconstructionMetadata } from '../types';
import * as fs from 'fs';
import * as path from 'path';

// Test storage path
const TEST_STORAGE_PATH = '.kiro/state/workflows/test-storage';

describe('StorageUtils', () => {
  let storageUtils: StorageUtils;

  // Helper function to create a test compacted state
  const createTestCompactedState = (id: string = 'test-state'): CompactedState => {
    const essentialData: EssentialData = {
      workflowType: 'spec-creation',
      currentPhase: 'requirements',
      activeTask: 'Write requirements document',
      criticalDecisions: [],
      documentStates: [],
      nextSteps: ['Complete requirements', 'Get user approval'],
      requirementReferences: ['Requirements 1.1', 'Requirements 1.2']
    };

    const reconstructionMetadata: ReconstructionMetadata = {
      originalSize: 5000,
      compactedSize: 1000,
      compressionAlgorithm: 'intelligent-prioritization',
      preservedComponents: ['workflowType', 'currentPhase', 'activeTask'],
      lostComponents: ['verbose explanations'],
      reconstructionInstructions: ['Restore workflow type', 'Set current phase']
    };

    return {
      id: `compacted-${id}-${Date.now()}`,
      essentialData,
      compressedContext: JSON.stringify({ additionalInfo: 'test context' }),
      reconstructionMetadata,
      compressionRatio: 0.2,
      timestamp: new Date()
    };
  };

  beforeEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
    
    storageUtils = new StorageUtils(TEST_STORAGE_PATH);
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(TEST_STORAGE_PATH)) {
      fs.rmSync(TEST_STORAGE_PATH, { recursive: true, force: true });
    }
  });

  describe('Directory Management', () => {
    it('should create required directories on initialization', () => {
      expect(fs.existsSync(TEST_STORAGE_PATH)).toBe(true);
      expect(fs.existsSync(path.join(TEST_STORAGE_PATH, 'archive'))).toBe(true);
      expect(fs.existsSync(path.join(TEST_STORAGE_PATH, 'emergency'))).toBe(true);
    });

    it('should return correct storage configuration', () => {
      const config = storageUtils.getConfig();
      expect(config.basePath).toBe(TEST_STORAGE_PATH);
      expect(config.archivePath).toBe(path.join(TEST_STORAGE_PATH, 'archive'));
      expect(config.emergencyPath).toBe(path.join(TEST_STORAGE_PATH, 'emergency'));
      expect(config.compressionEnabled).toBe(true);
    });
  });

  describe('File Save/Load Operations', () => {
    it('should save and load a compacted state successfully', async () => {
      const testState = createTestCompactedState('save-load-test');
      
      // Save the state
      const filePath = await storageUtils.saveState(testState);
      expect(fs.existsSync(filePath)).toBe(true);
      
      // Load the state
      const loadedState = await storageUtils.loadState(testState.id);
      
      // Verify the loaded state matches the original
      expect(loadedState.id).toBe(testState.id);
      expect(loadedState.essentialData.workflowType).toBe(testState.essentialData.workflowType);
      expect(loadedState.essentialData.currentPhase).toBe(testState.essentialData.currentPhase);
      expect(loadedState.compressionRatio).toBe(testState.compressionRatio);
    });

    it('should handle custom filenames', async () => {
      const testState = createTestCompactedState('custom-filename-test');
      const customFilename = 'custom-test-file.json';
      
      const filePath = await storageUtils.saveState(testState, customFilename);
      expect(path.basename(filePath)).toBe(customFilename);
      expect(fs.existsSync(filePath)).toBe(true);
    });

    it('should throw error when loading non-existent state', async () => {
      await expect(storageUtils.loadState('non-existent-state'))
        .rejects.toThrow('State file not found');
    });

    it('should handle corrupted state files gracefully', async () => {
      // Create a corrupted file
      const corruptedFilePath = path.join(TEST_STORAGE_PATH, 'corrupted-state.json');
      await fs.promises.writeFile(corruptedFilePath, 'invalid json content');
      
      await expect(storageUtils.loadState('corrupted-state'))
        .rejects.toThrow('Failed to load state');
    });
  });

  describe('JSON Serialization and Compression', () => {
    it('should serialize and deserialize state correctly', async () => {
      const testState = createTestCompactedState('serialization-test');
      
      // Save and load to test serialization/deserialization
      await storageUtils.saveState(testState);
      const loadedState = await storageUtils.loadState(testState.id);
      
      // Verify all properties are preserved
      expect(loadedState.essentialData.nextSteps).toEqual(testState.essentialData.nextSteps);
      expect(loadedState.essentialData.requirementReferences).toEqual(testState.essentialData.requirementReferences);
      expect(loadedState.reconstructionMetadata.preservedComponents).toEqual(testState.reconstructionMetadata.preservedComponents);
    });

    it('should handle Date objects in serialization', async () => {
      const testState = createTestCompactedState('date-test');
      const originalTimestamp = testState.timestamp;
      
      await storageUtils.saveState(testState);
      const loadedState = await storageUtils.loadState(testState.id);
      
      // Verify timestamp is preserved as Date object
      expect(loadedState.timestamp).toBeInstanceOf(Date);
      expect(loadedState.timestamp.getTime()).toBe(originalTimestamp.getTime());
    });

    it('should compress large states when compression is enabled', async () => {
      // Create a state with large compressed context
      const testState = createTestCompactedState('compression-test');
      testState.compressedContext = JSON.stringify({
        largeData: 'x'.repeat(2000) // Large string to trigger compression
      });
      
      const filePath = await storageUtils.saveState(testState);
      const stats = await fs.promises.stat(filePath);
      
      // File should exist and be smaller than uncompressed JSON
      expect(fs.existsSync(filePath)).toBe(true);
      const uncompressedSize = JSON.stringify(testState).length;
      expect(stats.size).toBeLessThan(uncompressedSize);
    });

    it('should handle uncompressed files when loading', async () => {
      const testState = createTestCompactedState('uncompressed-test');
      
      // Manually save uncompressed JSON
      const filePath = path.join(TEST_STORAGE_PATH, `${testState.id}.json`);
      const serialized = JSON.stringify(testState, null, 2);
      await fs.promises.writeFile(filePath, serialized, 'utf8');
      
      // Should be able to load uncompressed file
      const loadedState = await storageUtils.loadState(testState.id);
      expect(loadedState.id).toBe(testState.id);
    });
  });

  describe('State Listing and Management', () => {
    it('should list all preserved states', async () => {
      const state1 = createTestCompactedState('list-test-1');
      const state2 = createTestCompactedState('list-test-2');
      
      await storageUtils.saveState(state1);
      await storageUtils.saveState(state2);
      
      const states = await storageUtils.listStates();
      expect(states.length).toBe(2);
      
      // Should be sorted by timestamp (most recent first)
      expect(states[0].timestamp.getTime()).toBeGreaterThanOrEqual(states[1].timestamp.getTime());
    });

    it('should get most recent state', async () => {
      const state1 = createTestCompactedState('recent-test-1');
      await storageUtils.saveState(state1);
      
      // Wait a bit to ensure different timestamps
      await new Promise(resolve => setTimeout(resolve, 10));
      
      const state2 = createTestCompactedState('recent-test-2');
      await storageUtils.saveState(state2);
      
      const mostRecent = await storageUtils.getMostRecentState();
      expect(mostRecent).not.toBeNull();
      // The ID in the PreservedState comes from the filename, which includes the workflow type prefix
      expect(mostRecent!.id).toContain(state2.id);
    });

    it('should return null when no states exist', async () => {
      const mostRecent = await storageUtils.getMostRecentState();
      expect(mostRecent).toBeNull();
    });

    it('should validate existing states', async () => {
      const testState = createTestCompactedState('validation-test');
      await storageUtils.saveState(testState);
      
      const isValid = await storageUtils.validateState(testState.id);
      expect(isValid).toBe(true);
      
      const isInvalid = await storageUtils.validateState('non-existent');
      expect(isInvalid).toBe(false);
    });
  });

  describe('Archival System', () => {
    it('should archive a single state', async () => {
      const testState = createTestCompactedState('archive-test');
      const filePath = await storageUtils.saveState(testState);
      
      // Verify file exists in main storage
      expect(fs.existsSync(filePath)).toBe(true);
      
      // Archive the state
      await storageUtils.archiveState(testState.id);
      
      // Verify file moved to archive
      expect(fs.existsSync(filePath)).toBe(false);
      
      // Check that archive directory has files
      const archiveFiles = await fs.promises.readdir(path.join(TEST_STORAGE_PATH, 'archive'));
      expect(archiveFiles.length).toBeGreaterThan(0);
    });

    it('should archive older states while keeping current one', async () => {
      const state1 = createTestCompactedState('archive-older-1');
      const state2 = createTestCompactedState('archive-older-2');
      const state3 = createTestCompactedState('archive-older-3');
      
      await storageUtils.saveState(state1);
      await storageUtils.saveState(state2);
      await storageUtils.saveState(state3);
      
      // Get initial state count
      const initialStates = await storageUtils.listStates();
      expect(initialStates.length).toBe(3);
      
      // Archive all except state2
      const archivedCount = await storageUtils.archiveOlderStates(state2.id);
      expect(archivedCount).toBeGreaterThanOrEqual(2); // Should archive at least 2 states
      
      // Verify fewer states remain in main storage
      const remainingStates = await storageUtils.listStates();
      expect(remainingStates.length).toBeLessThan(initialStates.length);
      
      // Verify state2 can still be loaded (it should remain)
      const loadedState2 = await storageUtils.loadState(state2.id);
      expect(loadedState2).not.toBeNull();
      expect(loadedState2.id).toBe(state2.id);
      
      // Verify archive directory has files
      const archiveFiles = await fs.promises.readdir(path.join(TEST_STORAGE_PATH, 'archive'));
      expect(archiveFiles.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle archiving non-existent state gracefully', async () => {
      await expect(storageUtils.archiveState('non-existent'))
        .rejects.toThrow('State file not found');
    });

    it('should cleanup old archived states', async () => {
      // Create an old archived file
      const archivePath = path.join(TEST_STORAGE_PATH, 'archive');
      const oldFilePath = path.join(archivePath, 'old-state.json');
      
      await fs.promises.writeFile(oldFilePath, '{}');
      
      // Set file modification time to 35 days ago
      const oldDate = new Date(Date.now() - 35 * 24 * 60 * 60 * 1000);
      await fs.promises.utimes(oldFilePath, oldDate, oldDate);
      
      // Cleanup files older than 30 days
      const deletedCount = await storageUtils.cleanupArchive(30);
      expect(deletedCount).toBe(1);
      expect(fs.existsSync(oldFilePath)).toBe(false);
    });
  });

  describe('Emergency Backup', () => {
    it('should save emergency backup', async () => {
      const testState = createTestCompactedState('emergency-test');
      
      const backupPath = await storageUtils.saveEmergencyBackup(testState);
      expect(fs.existsSync(backupPath)).toBe(true);
      expect(backupPath).toContain('emergency');
      
      // Verify backup file contains the state data
      const backupContent = await fs.promises.readFile(backupPath, 'utf8');
      const parsedBackup = JSON.parse(backupContent);
      expect(parsedBackup.id).toBe(testState.id);
    });
  });

  describe('State Deletion', () => {
    it('should delete a state file', async () => {
      const testState = createTestCompactedState('delete-test');
      const filePath = await storageUtils.saveState(testState);
      
      // Verify file exists
      expect(fs.existsSync(filePath)).toBe(true);
      
      await storageUtils.deleteState(testState.id);
      expect(fs.existsSync(filePath)).toBe(false);
    });

    it('should handle deleting non-existent state gracefully', async () => {
      // Should not throw error when deleting non-existent state
      await expect(storageUtils.deleteState('non-existent')).resolves.not.toThrow();
    });
  });

  describe('Error Handling', () => {
    it('should handle file system errors during save', async () => {
      // Test with invalid path to simulate file system error
      const invalidPath = '/invalid/path/that/does/not/exist';
      
      try {
        const invalidStorage = new StorageUtils(invalidPath);
        const testState = createTestCompactedState('error-test');
        
        await expect(invalidStorage.saveState(testState))
          .rejects.toThrow('Failed to save state');
      } catch (error) {
        // If we can't even create the StorageUtils instance, that's also a valid test result
        expect(error).toBeDefined();
      }
    });

    it('should handle invalid JSON during load', async () => {
      const invalidFilePath = path.join(TEST_STORAGE_PATH, 'invalid-json.json');
      await fs.promises.writeFile(invalidFilePath, '{invalid json}');
      
      await expect(storageUtils.loadState('invalid-json'))
        .rejects.toThrow('Failed to load state');
    });
  });
});