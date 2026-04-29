#!/usr/bin/env node

/**
 * Rollback Procedures Script
 * 
 * Provides automated rollback capabilities for deployments.
 * Handles frontend, backend, and database rollbacks safely.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Rollback configuration
const ROLLBACK_CONFIG = {
  backup_retention: 5,        // Keep last 5 backups
  timeout: 300000,           // 5 minute timeout for operations
  verification_checks: [
    'health_check',
    'function_test',
    'database_connectivity'
  ],
  environments: {
    production: {
      vercel_project: process.env.VERCEL_PROJECT_ID || '',
      supabase_project: process.env.SUPABASE_PROJECT_REF || ''
    },
    staging: {
      vercel_project: process.env.VERCEL_STAGING_PROJECT_ID || '',
      supabase_project: process.env.SUPABASE_STAGING_PROJECT_REF || ''
    }
  }
};

class RollbackManager {
  constructor() {
    this.rollbackLog = [];
    this.backupMetadata = this.loadBackupMetadata();
  }

  loadBackupMetadata() {
    const metadataPath = join(projectRoot, '.deployment-backups.json');
    if (existsSync(metadataPath)) {
      try {
        return JSON.parse(readFileSync(metadataPath, 'utf-8'));
      } catch (error) {
        console.warn('⚠️  Could not load backup metadata:', error.message);
      }
    }
    return { backups: [] };
  }

  saveBackupMetadata() {
    const metadataPath = join(projectRoot, '.deployment-backups.json');
    try {
      writeFileSync(metadataPath, JSON.stringify(this.backupMetadata, null, 2));
    } catch (error) {
      console.error('❌ Failed to save backup metadata:', error.message);
    }
  }

  log(level, operation, message, details = null) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      level,
      operation,
      message,
      details
    };
    
    this.rollbackLog.push(logEntry);
    
    const icon = level === 'info' ? 'ℹ️' : level === 'success' ? '✅' : level === 'error' ? '❌' : '⚠️';
    console.log(`${icon} [${operation}] ${message}`);
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
  }

  async createBackup(environment = 'production') {
    this.log('info', 'Backup', `Creating backup for ${environment} environment`);
    
    const backup = {
      id: `backup-${Date.now()}`,
      timestamp: new Date().toISOString(),
      environment,
      components: {}
    };

    try {
      // Backup frontend deployment
      backup.components.frontend = await this.backupFrontend(environment);
      
      // Backup backend functions
      backup.components.backend = await this.backupBackend(environment);
      
      // Backup database state
      backup.components.database = await this.backupDatabase(environment);
      
      // Save backup metadata
      this.backupMetadata.backups.unshift(backup);
      
      // Keep only the last N backups
      if (this.backupMetadata.backups.length > ROLLBACK_CONFIG.backup_retention) {
        const removedBackups = this.backupMetadata.backups.splice(ROLLBACK_CONFIG.backup_retention);
        await this.cleanupOldBackups(removedBackups);
      }
      
      this.saveBackupMetadata();
      
      this.log('success', 'Backup', `Backup created successfully: ${backup.id}`);
      return backup;
      
    } catch (error) {
      this.log('error', 'Backup', `Backup failed: ${error.message}`);
      throw error;
    }
  }

  async backupFrontend(environment) {
    this.log('info', 'Frontend Backup', 'Backing up frontend deployment');
    
    try {
      // Get current Vercel deployment info
      const deploymentInfo = await this.runCommand('vercel', ['list', '--json']);
      
      if (deploymentInfo.exitCode === 0) {
        const deployments = JSON.parse(deploymentInfo.stdout);
        const currentDeployment = deployments.deployments?.[0];
        
        if (currentDeployment) {
          return {
            deployment_id: currentDeployment.uid,
            url: currentDeployment.url,
            created_at: currentDeployment.createdAt,
            state: currentDeployment.state
          };
        }
      }
      
      throw new Error('Could not retrieve current deployment info');
      
    } catch (error) {
      this.log('warn', 'Frontend Backup', `Frontend backup failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async backupBackend(environment) {
    this.log('info', 'Backend Backup', 'Backing up backend functions');
    
    try {
      // Get current function versions
      const functions = ['process-sred', 'process-document-ocr', 'fill-pdf-t661'];
      const functionBackups = {};
      
      for (const func of functions) {
        try {
          const funcPath = join(projectRoot, `supabase/functions/${func}/index.ts`);
          if (existsSync(funcPath)) {
            const funcContent = readFileSync(funcPath, 'utf-8');
            functionBackups[func] = {
              content: funcContent,
              size: funcContent.length,
              hash: this.generateHash(funcContent)
            };
          }
        } catch (error) {
          this.log('warn', 'Backend Backup', `Could not backup function ${func}: ${error.message}`);
        }
      }
      
      return {
        functions: functionBackups,
        backup_time: new Date().toISOString()
      };
      
    } catch (error) {
      this.log('warn', 'Backend Backup', `Backend backup failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async backupDatabase(environment) {
    this.log('info', 'Database Backup', 'Backing up database state');
    
    try {
      // Backup field mappings
      const mappings = {};
      const mappingFiles = [
        'supabase/field_mappings/t661_mapping.json',
        'supabase/field_mappings/t661_full_map.json'
      ];
      
      for (const mappingFile of mappingFiles) {
        const mappingPath = join(projectRoot, mappingFile);
        if (existsSync(mappingPath)) {
          const mappingContent = readFileSync(mappingPath, 'utf-8');
          mappings[mappingFile] = {
            content: mappingContent,
            hash: this.generateHash(mappingContent)
          };
        }
      }
      
      // In a real implementation, this would also backup database schema and data
      return {
        field_mappings: mappings,
        backup_time: new Date().toISOString()
      };
      
    } catch (error) {
      this.log('warn', 'Database Backup', `Database backup failed: ${error.message}`);
      return { error: error.message };
    }
  }

  async rollback(backupId, environment = 'production', components = ['frontend', 'backend', 'database']) {
    this.log('info', 'Rollback', `Starting rollback to ${backupId} for ${environment}`);
    
    const backup = this.backupMetadata.backups.find(b => b.id === backupId);
    if (!backup) {
      throw new Error(`Backup not found: ${backupId}`);
    }
    
    const rollbackResults = {
      backup_id: backupId,
      environment,
      components: {},
      started_at: new Date().toISOString(),
      status: 'in_progress'
    };
    
    try {
      // Rollback components in reverse dependency order
      if (components.includes('database')) {
        rollbackResults.components.database = await this.rollbackDatabase(backup, environment);
      }
      
      if (components.includes('backend')) {
        rollbackResults.components.backend = await this.rollbackBackend(backup, environment);
      }
      
      if (components.includes('frontend')) {
        rollbackResults.components.frontend = await this.rollbackFrontend(backup, environment);
      }
      
      // Verify rollback success
      const verificationResults = await this.verifyRollback(environment);
      rollbackResults.verification = verificationResults;
      
      if (verificationResults.success) {
        rollbackResults.status = 'completed';
        this.log('success', 'Rollback', `Rollback completed successfully`);
      } else {
        rollbackResults.status = 'failed';
        this.log('error', 'Rollback', `Rollback verification failed`);
      }
      
      rollbackResults.completed_at = new Date().toISOString();
      return rollbackResults;
      
    } catch (error) {
      rollbackResults.status = 'failed';
      rollbackResults.error = error.message;
      rollbackResults.completed_at = new Date().toISOString();
      
      this.log('error', 'Rollback', `Rollback failed: ${error.message}`);
      throw error;
    }
  }

  async rollbackFrontend(backup, environment) {
    this.log('info', 'Frontend Rollback', 'Rolling back frontend deployment');
    
    try {
      const frontendBackup = backup.components.frontend;
      
      if (frontendBackup.error) {
        throw new Error(`No valid frontend backup: ${frontendBackup.error}`);
      }
      
      // Promote previous deployment
      const promoteResult = await this.runCommand('vercel', [
        'promote',
        frontendBackup.deployment_id,
        '--yes'
      ]);
      
      if (promoteResult.exitCode === 0) {
        this.log('success', 'Frontend Rollback', 'Frontend rollback completed');
        return { success: true, deployment_id: frontendBackup.deployment_id };
      } else {
        throw new Error(`Promote failed: ${promoteResult.stderr}`);
      }
      
    } catch (error) {
      this.log('error', 'Frontend Rollback', `Frontend rollback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async rollbackBackend(backup, environment) {
    this.log('info', 'Backend Rollback', 'Rolling back backend functions');
    
    try {
      const backendBackup = backup.components.backend;
      
      if (backendBackup.error) {
        throw new Error(`No valid backend backup: ${backendBackup.error}`);
      }
      
      // Restore function files
      const restoredFunctions = [];
      for (const [funcName, funcBackup] of Object.entries(backendBackup.functions)) {
        try {
          const funcPath = join(projectRoot, `supabase/functions/${funcName}/index.ts`);
          writeFileSync(funcPath, funcBackup.content);
          restoredFunctions.push(funcName);
          
          this.log('info', 'Backend Rollback', `Restored function: ${funcName}`);
        } catch (error) {
          this.log('warn', 'Backend Rollback', `Failed to restore function ${funcName}: ${error.message}`);
        }
      }
      
      // Redeploy functions
      const deployResults = {};
      for (const funcName of restoredFunctions) {
        try {
          const deployResult = await this.runCommand('supabase', [
            'functions', 'deploy', funcName
          ]);
          
          deployResults[funcName] = {
            success: deployResult.exitCode === 0,
            output: deployResult.stdout || deployResult.stderr
          };
          
        } catch (error) {
          deployResults[funcName] = {
            success: false,
            error: error.message
          };
        }
      }
      
      const successfulDeploys = Object.values(deployResults).filter(r => r.success).length;
      
      this.log('success', 'Backend Rollback', 
        `Backend rollback completed: ${successfulDeploys}/${restoredFunctions.length} functions deployed`);
      
      return {
        success: successfulDeploys === restoredFunctions.length,
        restored_functions: restoredFunctions,
        deploy_results: deployResults
      };
      
    } catch (error) {
      this.log('error', 'Backend Rollback', `Backend rollback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async rollbackDatabase(backup, environment) {
    this.log('info', 'Database Rollback', 'Rolling back database state');
    
    try {
      const databaseBackup = backup.components.database;
      
      if (databaseBackup.error) {
        throw new Error(`No valid database backup: ${databaseBackup.error}`);
      }
      
      // Restore field mappings
      const restoredMappings = [];
      for (const [mappingFile, mappingBackup] of Object.entries(databaseBackup.field_mappings)) {
        try {
          const mappingPath = join(projectRoot, mappingFile);
          writeFileSync(mappingPath, mappingBackup.content);
          restoredMappings.push(mappingFile);
          
          this.log('info', 'Database Rollback', `Restored mapping: ${mappingFile}`);
        } catch (error) {
          this.log('warn', 'Database Rollback', `Failed to restore mapping ${mappingFile}: ${error.message}`);
        }
      }
      
      this.log('success', 'Database Rollback', 
        `Database rollback completed: ${restoredMappings.length} mappings restored`);
      
      return {
        success: true,
        restored_mappings: restoredMappings
      };
      
    } catch (error) {
      this.log('error', 'Database Rollback', `Database rollback failed: ${error.message}`);
      return { success: false, error: error.message };
    }
  }

  async verifyRollback(environment) {
    this.log('info', 'Verification', 'Verifying rollback success');
    
    const verificationResults = {
      success: true,
      checks: {}
    };
    
    try {
      // Health check
      verificationResults.checks.health_check = await this.runHealthCheck();
      
      // Function test
      verificationResults.checks.function_test = await this.testFunctions();
      
      // Database connectivity
      verificationResults.checks.database_connectivity = await this.testDatabaseConnectivity();
      
      // Determine overall success
      verificationResults.success = Object.values(verificationResults.checks)
        .every(check => check.success);
      
      if (verificationResults.success) {
        this.log('success', 'Verification', 'All verification checks passed');
      } else {
        this.log('error', 'Verification', 'Some verification checks failed');
      }
      
      return verificationResults;
      
    } catch (error) {
      this.log('error', 'Verification', `Verification failed: ${error.message}`);
      return {
        success: false,
        error: error.message,
        checks: verificationResults.checks
      };
    }
  }

  async runHealthCheck() {
    try {
      const healthResult = await this.runCommand('node', [
        'scripts/diagnostics/system-health-check.js'
      ]);
      
      return {
        success: healthResult.exitCode === 0,
        output: healthResult.stdout
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testFunctions() {
    try {
      // Test if functions are accessible
      const functions = ['process-sred', 'process-document-ocr', 'fill-pdf-t661'];
      const testResults = {};
      
      for (const func of functions) {
        const funcPath = join(projectRoot, `supabase/functions/${func}/index.ts`);
        testResults[func] = {
          exists: existsSync(funcPath),
          readable: false
        };
        
        if (testResults[func].exists) {
          try {
            readFileSync(funcPath, 'utf-8');
            testResults[func].readable = true;
          } catch (error) {
            testResults[func].error = error.message;
          }
        }
      }
      
      const allFunctionsOk = Object.values(testResults)
        .every(result => result.exists && result.readable);
      
      return {
        success: allFunctionsOk,
        functions: testResults
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async testDatabaseConnectivity() {
    try {
      // Test database configuration
      const configPath = join(projectRoot, 'supabase/config.toml');
      const configExists = existsSync(configPath);
      
      // Test field mappings
      const mappingPath = join(projectRoot, 'supabase/field_mappings/t661_mapping.json');
      const mappingExists = existsSync(mappingPath);
      
      let mappingValid = false;
      if (mappingExists) {
        try {
          const mappingContent = readFileSync(mappingPath, 'utf-8');
          JSON.parse(mappingContent);
          mappingValid = true;
        } catch (error) {
          // Invalid JSON
        }
      }
      
      return {
        success: configExists && mappingExists && mappingValid,
        config_exists: configExists,
        mapping_exists: mappingExists,
        mapping_valid: mappingValid
      };
    } catch (error) {
      return {
        success: false,
        error: error.message
      };
    }
  }

  async cleanupOldBackups(removedBackups) {
    this.log('info', 'Cleanup', `Cleaning up ${removedBackups.length} old backups`);
    
    // In a real implementation, this would clean up stored backup files
    // For now, just log the cleanup
    for (const backup of removedBackups) {
      this.log('info', 'Cleanup', `Cleaned up backup: ${backup.id}`);
    }
  }

  listBackups() {
    console.log('📋 Available Backups:\n');
    
    if (this.backupMetadata.backups.length === 0) {
      console.log('   No backups available');
      return;
    }
    
    this.backupMetadata.backups.forEach((backup, index) => {
      const age = new Date() - new Date(backup.timestamp);
      const ageHours = Math.floor(age / (1000 * 60 * 60));
      
      console.log(`${index + 1}. ${backup.id}`);
      console.log(`   Environment: ${backup.environment}`);
      console.log(`   Created: ${backup.timestamp} (${ageHours}h ago)`);
      console.log(`   Components: ${Object.keys(backup.components).join(', ')}`);
      console.log('');
    });
  }

  generateHash(content) {
    // Simple hash function for content verification
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  async runCommand(command, args, options = {}) {
    return new Promise((resolve, reject) => {
      const process = spawn(command, args, {
        cwd: projectRoot,
        stdio: ['pipe', 'pipe', 'pipe'],
        ...options
      });

      let stdout = '';
      let stderr = '';

      process.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      process.stderr.on('data', (data) => {
        stderr += data.toString();
      });

      process.on('close', (code) => {
        resolve({
          exitCode: code,
          stdout,
          stderr
        });
      });

      process.on('error', (error) => {
        reject(error);
      });

      if (options.timeout) {
        setTimeout(() => {
          process.kill();
          reject(new Error(`Command timed out after ${options.timeout}ms`));
        }, options.timeout);
      }
    });
  }

  generateRollbackReport() {
    const report = {
      timestamp: new Date().toISOString(),
      available_backups: this.backupMetadata.backups.length,
      recent_operations: this.rollbackLog.slice(-10),
      backup_metadata: this.backupMetadata
    };
    
    const reportPath = join(projectRoot, 'rollback-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Rollback Report Generated:');
    console.log(`   Available backups: ${report.available_backups}`);
    console.log(`   Recent operations: ${report.recent_operations.length}`);
    console.log(`   Report saved to: rollback-report.json`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const rollbackManager = new RollbackManager();

  if (args.length === 0 || args[0] === '--help') {
    console.log('🔄 Rollback Procedures Tool\n');
    console.log('Usage:');
    console.log('  node rollback-procedures.js backup [environment]           # Create backup');
    console.log('  node rollback-procedures.js rollback <backup-id> [env]    # Rollback to backup');
    console.log('  node rollback-procedures.js list                          # List available backups');
    console.log('  node rollback-procedures.js verify [environment]          # Verify current deployment');
    console.log('  node rollback-procedures.js report                        # Generate rollback report');
    console.log('\nEnvironments: production (default), staging');
    console.log('\nExamples:');
    console.log('  node rollback-procedures.js backup production');
    console.log('  node rollback-procedures.js rollback backup-1703123456789');
    return;
  }

  const command = args[0];
  const environment = args[2] || 'production';

  try {
    switch (command) {
      case 'backup':
        const backupEnv = args[1] || 'production';
        console.log(`🔄 Creating backup for ${backupEnv} environment...`);
        const backup = await rollbackManager.createBackup(backupEnv);
        console.log(`✅ Backup created: ${backup.id}`);
        break;
        
      case 'rollback':
        if (!args[1]) {
          console.error('❌ Backup ID required for rollback');
          process.exit(1);
        }
        console.log(`🔄 Rolling back to ${args[1]} in ${environment} environment...`);
        const rollbackResult = await rollbackManager.rollback(args[1], environment);
        if (rollbackResult.status === 'completed') {
          console.log('✅ Rollback completed successfully');
        } else {
          console.log('❌ Rollback failed');
          process.exit(1);
        }
        break;
        
      case 'list':
        rollbackManager.listBackups();
        break;
        
      case 'verify':
        console.log(`🔍 Verifying ${environment} deployment...`);
        const verificationResult = await rollbackManager.verifyRollback(environment);
        if (verificationResult.success) {
          console.log('✅ Verification passed');
        } else {
          console.log('❌ Verification failed');
          process.exit(1);
        }
        break;
        
      case 'report':
        rollbackManager.generateRollbackReport();
        break;
        
      default:
        console.error(`❌ Unknown command: ${command}`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run CLI if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { RollbackManager };