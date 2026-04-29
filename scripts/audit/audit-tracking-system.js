#!/usr/bin/env node

/**
 * Audit Logging and Tracking System
 * 
 * Comprehensive audit logging for all changes, issues, fixes, and validation results.
 * Provides audit report generation and analysis tools for compliance and tracking.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Audit configuration
const AUDIT_CONFIG = {
  log_directory: '.audit-logs',
  retention_days: 90,
  max_log_size: 10 * 1024 * 1024, // 10MB
  report_formats: ['json', 'csv', 'html'],
  categories: [
    'issue_identification',
    'fix_application', 
    'validation',
    'deployment',
    'rollback',
    'configuration_change',
    'security_event'
  ],
  severity_levels: ['low', 'medium', 'high', 'critical']
};

class AuditTracker {
  constructor() {
    this.auditDir = join(projectRoot, AUDIT_CONFIG.log_directory);
    this.ensureAuditDirectory();
    this.currentLogFile = this.getCurrentLogFile();
  }

  ensureAuditDirectory() {
    if (!existsSync(this.auditDir)) {
      mkdirSync(this.auditDir, { recursive: true });
    }
  }

  getCurrentLogFile() {
    const today = new Date().toISOString().split('T')[0];
    return join(this.auditDir, `audit-${today}.jsonl`);
  }

  generateId() {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  logEntry(type, category, severity, description, details = {}, user = 'system') {
    const entry = {
      id: this.generateId(),
      timestamp: new Date().toISOString(),
      type,
      category,
      severity,
      description,
      details,
      user,
      session_id: this.getSessionId(),
      environment: process.env.NODE_ENV || 'development'
    };

    try {
      // Append to current log file
      appendFileSync(this.currentLogFile, JSON.stringify(entry) + '\n');
      
      // Check if log rotation is needed
      this.checkLogRotation();
      
      console.log(`📝 Audit logged: ${type} - ${description}`);
      return entry.id;
    } catch (error) {
      console.error('❌ Failed to write audit log:', error.message);
      throw error;
    }
  }

  getSessionId() {
    // Simple session ID based on process start time
    return `session_${process.pid}_${Date.now()}`;
  }

  checkLogRotation() {
    try {
      const stats = require('fs').statSync(this.currentLogFile);
      if (stats.size > AUDIT_CONFIG.max_log_size) {
        this.rotateLog();
      }
    } catch (error) {
      // File doesn't exist yet, no rotation needed
    }
  }

  rotateLog() {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const rotatedFile = this.currentLogFile.replace('.jsonl', `-${timestamp}.jsonl`);
    
    try {
      require('fs').renameSync(this.currentLogFile, rotatedFile);
      console.log(`📁 Log rotated to: ${rotatedFile}`);
    } catch (error) {
      console.error('❌ Failed to rotate log:', error.message);
    }
  }
}
  // Audit logging methods for different types of events
  logIssueIdentification(category, severity, description, details = {}) {
    return this.logEntry('issue_identification', category, severity, description, {
      ...details,
      identified_at: new Date().toISOString(),
      source: 'audit_system'
    });
  }

  logFixApplication(issueId, category, description, details = {}) {
    return this.logEntry('fix_application', category, 'medium', description, {
      ...details,
      related_issue: issueId,
      applied_at: new Date().toISOString(),
      fix_type: details.fix_type || 'manual'
    });
  }

  logValidation(category, description, results = {}) {
    const severity = results.success ? 'low' : 'medium';
    return this.logEntry('validation', category, severity, description, {
      ...results,
      validated_at: new Date().toISOString(),
      validation_type: results.type || 'manual'
    });
  }

  logDeployment(environment, version, description, details = {}) {
    return this.logEntry('deployment', 'infrastructure', 'medium', description, {
      ...details,
      environment,
      version,
      deployed_at: new Date().toISOString(),
      deployment_type: details.type || 'manual'
    });
  }

  logRollback(deploymentId, reason, details = {}) {
    return this.logEntry('rollback', 'infrastructure', 'high', reason, {
      ...details,
      related_deployment: deploymentId,
      rolled_back_at: new Date().toISOString(),
      rollback_type: details.type || 'manual'
    });
  }

  logConfigurationChange(component, description, changes = {}) {
    return this.logEntry('configuration_change', 'infrastructure', 'medium', description, {
      component,
      changes,
      changed_at: new Date().toISOString(),
      change_type: changes.type || 'manual'
    });
  }

  logSecurityEvent(eventType, description, details = {}) {
    const severity = details.severity || 'high';
    return this.logEntry('security_event', 'security', severity, description, {
      ...details,
      event_type: eventType,
      detected_at: new Date().toISOString(),
      source: details.source || 'security_monitor'
    });
  }

  // Query methods for retrieving audit logs
  async getAuditLogs(filters = {}) {
    const logs = [];
    const logFiles = this.getLogFiles();

    for (const logFile of logFiles) {
      try {
        const content = readFileSync(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        for (const line of lines) {
          try {
            const entry = JSON.parse(line);
            if (this.matchesFilters(entry, filters)) {
              logs.push(entry);
            }
          } catch (error) {
            console.warn(`⚠️  Invalid JSON in log file ${logFile}: ${line}`);
          }
        }
      } catch (error) {
        console.warn(`⚠️  Could not read log file ${logFile}: ${error.message}`);
      }
    }

    return logs.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  getLogFiles() {
    try {
      const files = require('fs').readdirSync(this.auditDir);
      return files
        .filter(file => file.startsWith('audit-') && file.endsWith('.jsonl'))
        .map(file => join(this.auditDir, file))
        .sort();
    } catch (error) {
      return [];
    }
  }

  matchesFilters(entry, filters) {
    if (filters.type && entry.type !== filters.type) return false;
    if (filters.category && entry.category !== filters.category) return false;
    if (filters.severity && entry.severity !== filters.severity) return false;
    if (filters.user && entry.user !== filters.user) return false;
    if (filters.environment && entry.environment !== filters.environment) return false;
    
    if (filters.startDate && new Date(entry.timestamp) < new Date(filters.startDate)) return false;
    if (filters.endDate && new Date(entry.timestamp) > new Date(filters.endDate)) return false;
    
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase();
      const searchableText = `${entry.description} ${JSON.stringify(entry.details)}`.toLowerCase();
      if (!searchableText.includes(searchTerm)) return false;
    }

    return true;
  }

  // Report generation methods
  async generateAuditReport(filters = {}, format = 'json') {
    const logs = await this.getAuditLogs(filters);
    const report = {
      generated_at: new Date().toISOString(),
      filters,
      summary: this.generateSummary(logs),
      entries: logs
    };

    switch (format.toLowerCase()) {
      case 'json':
        return this.generateJsonReport(report);
      case 'csv':
        return this.generateCsvReport(report);
      case 'html':
        return this.generateHtmlReport(report);
      default:
        throw new Error(`Unsupported report format: ${format}`);
    }
  }

  generateSummary(logs) {
    const summary = {
      total_entries: logs.length,
      date_range: {
        start: logs.length > 0 ? logs[logs.length - 1].timestamp : null,
        end: logs.length > 0 ? logs[0].timestamp : null
      },
      by_type: {},
      by_category: {},
      by_severity: {},
      by_user: {},
      by_environment: {}
    };

    logs.forEach(log => {
      // Count by type
      summary.by_type[log.type] = (summary.by_type[log.type] || 0) + 1;
      
      // Count by category
      summary.by_category[log.category] = (summary.by_category[log.category] || 0) + 1;
      
      // Count by severity
      summary.by_severity[log.severity] = (summary.by_severity[log.severity] || 0) + 1;
      
      // Count by user
      summary.by_user[log.user] = (summary.by_user[log.user] || 0) + 1;
      
      // Count by environment
      summary.by_environment[log.environment] = (summary.by_environment[log.environment] || 0) + 1;
    });

    return summary;
  }

  generateJsonReport(report) {
    const reportPath = join(this.auditDir, `audit-report-${Date.now()}.json`);
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    return { format: 'json', path: reportPath, data: report };
  }

  generateCsvReport(report) {
    const csvLines = [
      'ID,Timestamp,Type,Category,Severity,User,Environment,Description,Details'
    ];

    report.entries.forEach(entry => {
      const csvLine = [
        entry.id,
        entry.timestamp,
        entry.type,
        entry.category,
        entry.severity,
        entry.user,
        entry.environment,
        `"${entry.description.replace(/"/g, '""')}"`,
        `"${JSON.stringify(entry.details).replace(/"/g, '""')}"`
      ].join(',');
      csvLines.push(csvLine);
    });

    const csvContent = csvLines.join('\n');
    const reportPath = join(this.auditDir, `audit-report-${Date.now()}.csv`);
    writeFileSync(reportPath, csvContent);
    
    return { format: 'csv', path: reportPath, data: csvContent };
  }

  generateHtmlReport(report) {
    const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Audit Report - ${new Date(report.generated_at).toLocaleDateString()}</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        .header { background: #f5f5f5; padding: 20px; border-radius: 5px; margin-bottom: 20px; }
        .summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; margin-bottom: 30px; }
        .summary-card { background: white; border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
        .summary-card h3 { margin-top: 0; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .severity-critical { background-color: #ffebee; }
        .severity-high { background-color: #fff3e0; }
        .severity-medium { background-color: #f3e5f5; }
        .severity-low { background-color: #e8f5e8; }
        .details { max-width: 300px; overflow: hidden; text-overflow: ellipsis; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Audit Report</h1>
        <p>Generated: ${new Date(report.generated_at).toLocaleString()}</p>
        <p>Total Entries: ${report.summary.total_entries}</p>
        ${report.summary.date_range.start ? `<p>Date Range: ${new Date(report.summary.date_range.start).toLocaleDateString()} - ${new Date(report.summary.date_range.end).toLocaleDateString()}</p>` : ''}
    </div>

    <div class="summary">
        <div class="summary-card">
            <h3>By Type</h3>
            ${Object.entries(report.summary.by_type).map(([type, count]) => `<p>${type}: ${count}</p>`).join('')}
        </div>
        <div class="summary-card">
            <h3>By Severity</h3>
            ${Object.entries(report.summary.by_severity).map(([severity, count]) => `<p>${severity}: ${count}</p>`).join('')}
        </div>
        <div class="summary-card">
            <h3>By Category</h3>
            ${Object.entries(report.summary.by_category).map(([category, count]) => `<p>${category}: ${count}</p>`).join('')}
        </div>
        <div class="summary-card">
            <h3>By Environment</h3>
            ${Object.entries(report.summary.by_environment).map(([env, count]) => `<p>${env}: ${count}</p>`).join('')}
        </div>
    </div>

    <table>
        <thead>
            <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Category</th>
                <th>Severity</th>
                <th>User</th>
                <th>Description</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
            ${report.entries.map(entry => `
                <tr class="severity-${entry.severity}">
                    <td>${new Date(entry.timestamp).toLocaleString()}</td>
                    <td>${entry.type}</td>
                    <td>${entry.category}</td>
                    <td>${entry.severity}</td>
                    <td>${entry.user}</td>
                    <td>${entry.description}</td>
                    <td class="details">${JSON.stringify(entry.details)}</td>
                </tr>
            `).join('')}
        </tbody>
    </table>
</body>
</html>`;

    const reportPath = join(this.auditDir, `audit-report-${Date.now()}.html`);
    writeFileSync(reportPath, html);
    
    return { format: 'html', path: reportPath, data: html };
  }

  // Maintenance methods
  async cleanupOldLogs() {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - AUDIT_CONFIG.retention_days);
    
    const logFiles = this.getLogFiles();
    let deletedCount = 0;

    for (const logFile of logFiles) {
      try {
        const stats = require('fs').statSync(logFile);
        if (stats.mtime < cutoffDate) {
          require('fs').unlinkSync(logFile);
          deletedCount++;
          console.log(`🗑️  Deleted old audit log: ${logFile}`);
        }
      } catch (error) {
        console.warn(`⚠️  Could not process log file ${logFile}: ${error.message}`);
      }
    }

    console.log(`🧹 Cleanup complete: ${deletedCount} old log files deleted`);
    return deletedCount;
  }

  async validateLogIntegrity() {
    const logFiles = this.getLogFiles();
    const results = {
      total_files: logFiles.length,
      valid_files: 0,
      invalid_files: 0,
      total_entries: 0,
      invalid_entries: 0,
      issues: []
    };

    for (const logFile of logFiles) {
      try {
        const content = readFileSync(logFile, 'utf-8');
        const lines = content.trim().split('\n').filter(line => line.trim());
        
        let fileValid = true;
        let fileEntries = 0;
        let fileInvalidEntries = 0;

        for (const line of lines) {
          fileEntries++;
          try {
            const entry = JSON.parse(line);
            
            // Validate required fields
            const requiredFields = ['id', 'timestamp', 'type', 'category', 'severity', 'description'];
            for (const field of requiredFields) {
              if (!entry[field]) {
                results.issues.push(`Missing field '${field}' in ${logFile}:${fileEntries}`);
                fileInvalidEntries++;
                fileValid = false;
              }
            }

            // Validate timestamp format
            if (entry.timestamp && isNaN(new Date(entry.timestamp).getTime())) {
              results.issues.push(`Invalid timestamp in ${logFile}:${fileEntries}`);
              fileInvalidEntries++;
              fileValid = false;
            }

          } catch (error) {
            results.issues.push(`Invalid JSON in ${logFile}:${fileEntries}`);
            fileInvalidEntries++;
            fileValid = false;
          }
        }

        results.total_entries += fileEntries;
        results.invalid_entries += fileInvalidEntries;
        
        if (fileValid) {
          results.valid_files++;
        } else {
          results.invalid_files++;
        }

      } catch (error) {
        results.issues.push(`Could not read file ${logFile}: ${error.message}`);
        results.invalid_files++;
      }
    }

    return results;
  }

  // Statistics and analytics
  async getAuditStatistics(days = 30) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    
    const logs = await this.getAuditLogs({
      startDate: startDate.toISOString()
    });

    const stats = {
      period: `${days} days`,
      total_entries: logs.length,
      daily_average: Math.round(logs.length / days),
      trends: this.calculateTrends(logs, days),
      top_users: this.getTopUsers(logs),
      issue_resolution_rate: this.calculateResolutionRate(logs),
      severity_distribution: this.getSeverityDistribution(logs)
    };

    return stats;
  }

  calculateTrends(logs, days) {
    const dailyCounts = {};
    const today = new Date();
    
    // Initialize all days with 0
    for (let i = 0; i < days; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts[dateKey] = 0;
    }

    // Count entries per day
    logs.forEach(log => {
      const dateKey = log.timestamp.split('T')[0];
      if (dailyCounts.hasOwnProperty(dateKey)) {
        dailyCounts[dateKey]++;
      }
    });

    return dailyCounts;
  }

  getTopUsers(logs) {
    const userCounts = {};
    logs.forEach(log => {
      userCounts[log.user] = (userCounts[log.user] || 0) + 1;
    });

    return Object.entries(userCounts)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .map(([user, count]) => ({ user, count }));
  }

  calculateResolutionRate(logs) {
    const issues = logs.filter(log => log.type === 'issue_identification');
    const fixes = logs.filter(log => log.type === 'fix_application');
    
    const resolvedIssues = fixes.filter(fix => 
      fix.details.related_issue && 
      issues.some(issue => issue.id === fix.details.related_issue)
    );

    return {
      total_issues: issues.length,
      resolved_issues: resolvedIssues.length,
      resolution_rate: issues.length > 0 ? (resolvedIssues.length / issues.length) * 100 : 0
    };
  }

  getSeverityDistribution(logs) {
    const distribution = {};
    AUDIT_CONFIG.severity_levels.forEach(level => {
      distribution[level] = logs.filter(log => log.severity === level).length;
    });
    return distribution;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const tracker = new AuditTracker();

  if (args.length === 0 || args[0] === '--help') {
    console.log('📋 Audit Logging and Tracking System\n');
    console.log('Usage:');
    console.log('  node audit-tracking-system.js log <type> <category> <severity> <description>');
    console.log('  node audit-tracking-system.js query [--type=<type>] [--category=<category>] [--severity=<severity>]');
    console.log('  node audit-tracking-system.js report [--format=json|csv|html] [--output=<file>]');
    console.log('  node audit-tracking-system.js stats [--days=<number>]');
    console.log('  node audit-tracking-system.js cleanup');
    console.log('  node audit-tracking-system.js validate');
    console.log('\nExamples:');
    console.log('  node audit-tracking-system.js log issue_identification frontend high "UI component not rendering"');
    console.log('  node audit-tracking-system.js query --type=fix_application --severity=high');
    console.log('  node audit-tracking-system.js report --format=html');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'log':
        if (args.length < 5) {
          console.error('❌ Usage: log <type> <category> <severity> <description>');
          process.exit(1);
        }
        const [, type, category, severity, description] = args;
        const entryId = tracker.logEntry(type, category, severity, description);
        console.log(`✅ Logged entry: ${entryId}`);
        break;

      case 'query':
        const filters = {};
        args.slice(1).forEach(arg => {
          if (arg.startsWith('--')) {
            const [key, value] = arg.substring(2).split('=');
            filters[key] = value;
          }
        });
        
        const logs = await tracker.getAuditLogs(filters);
        console.log(`📋 Found ${logs.length} audit entries:`);
        logs.slice(0, 10).forEach(log => {
          console.log(`  ${log.timestamp} [${log.severity.toUpperCase()}] ${log.type}: ${log.description}`);
        });
        if (logs.length > 10) {
          console.log(`  ... and ${logs.length - 10} more entries`);
        }
        break;

      case 'report':
        let format = 'json';
        let outputFile = null;
        
        args.slice(1).forEach(arg => {
          if (arg.startsWith('--format=')) {
            format = arg.split('=')[1];
          } else if (arg.startsWith('--output=')) {
            outputFile = arg.split('=')[1];
          }
        });

        const report = await tracker.generateAuditReport({}, format);
        console.log(`📊 Generated ${format.toUpperCase()} report: ${report.path}`);
        
        if (outputFile) {
          require('fs').copyFileSync(report.path, outputFile);
          console.log(`📄 Report copied to: ${outputFile}`);
        }
        break;

      case 'stats':
        let days = 30;
        args.slice(1).forEach(arg => {
          if (arg.startsWith('--days=')) {
            days = parseInt(arg.split('=')[1]);
          }
        });

        const stats = await tracker.getAuditStatistics(days);
        console.log('📈 Audit Statistics:');
        console.log(`   Period: ${stats.period}`);
        console.log(`   Total entries: ${stats.total_entries}`);
        console.log(`   Daily average: ${stats.daily_average}`);
        console.log(`   Resolution rate: ${stats.issue_resolution_rate.resolution_rate.toFixed(1)}%`);
        console.log('   Top users:');
        stats.top_users.slice(0, 5).forEach(({ user, count }) => {
          console.log(`     ${user}: ${count} entries`);
        });
        break;

      case 'cleanup':
        const deletedCount = await tracker.cleanupOldLogs();
        console.log(`🧹 Cleanup complete: ${deletedCount} files deleted`);
        break;

      case 'validate':
        const validation = await tracker.validateLogIntegrity();
        console.log('🔍 Log Validation Results:');
        console.log(`   Total files: ${validation.total_files}`);
        console.log(`   Valid files: ${validation.valid_files}`);
        console.log(`   Invalid files: ${validation.invalid_files}`);
        console.log(`   Total entries: ${validation.total_entries}`);
        console.log(`   Invalid entries: ${validation.invalid_entries}`);
        
        if (validation.issues.length > 0) {
          console.log('   Issues found:');
          validation.issues.slice(0, 10).forEach(issue => {
            console.log(`     - ${issue}`);
          });
          if (validation.issues.length > 10) {
            console.log(`     ... and ${validation.issues.length - 10} more issues`);
          }
        }
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

export { AuditTracker };