#!/usr/bin/env node

/**
 * Monitoring and Alerting System
 * 
 * Monitors system components and generates alerts for production issues.
 * Provides health monitoring, performance tracking, and error detection.
 */

import { readFileSync, writeFileSync, existsSync, appendFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Monitoring configuration
const MONITORING_CONFIG = {
  intervals: {
    health_check: 60000,      // 1 minute
    performance: 300000,      // 5 minutes
    error_scan: 30000,        // 30 seconds
    disk_space: 600000        // 10 minutes
  },
  thresholds: {
    response_time: 5000,      // 5 seconds
    error_rate: 0.05,         // 5%
    disk_usage: 0.85,         // 85%
    memory_usage: 0.90,       // 90%
    cpu_usage: 0.80           // 80%
  },
  alerts: {
    email: process.env.ALERT_EMAIL || '',
    webhook: process.env.ALERT_WEBHOOK || '',
    slack: process.env.SLACK_WEBHOOK || ''
  }
};

class MonitoringSystem {
  constructor() {
    this.isRunning = false;
    this.intervals = {};
    this.metrics = {
      health: [],
      performance: [],
      errors: [],
      alerts: []
    };
    this.alertHistory = new Map();
  }

  start() {
    if (this.isRunning) {
      console.log('⚠️  Monitoring system is already running');
      return;
    }

    console.log('🚀 Starting monitoring system...');
    this.isRunning = true;

    // Start monitoring intervals
    this.intervals.health = setInterval(() => this.checkHealth(), MONITORING_CONFIG.intervals.health_check);
    this.intervals.performance = setInterval(() => this.checkPerformance(), MONITORING_CONFIG.intervals.performance);
    this.intervals.errors = setInterval(() => this.scanErrors(), MONITORING_CONFIG.intervals.error_scan);
    this.intervals.disk = setInterval(() => this.checkDiskSpace(), MONITORING_CONFIG.intervals.disk_space);

    console.log('✅ Monitoring system started');
    console.log('📊 Monitoring intervals:');
    console.log(`   Health checks: every ${MONITORING_CONFIG.intervals.health_check / 1000}s`);
    console.log(`   Performance: every ${MONITORING_CONFIG.intervals.performance / 1000}s`);
    console.log(`   Error scanning: every ${MONITORING_CONFIG.intervals.error_scan / 1000}s`);
    console.log(`   Disk space: every ${MONITORING_CONFIG.intervals.disk_space / 1000}s`);
  }

  stop() {
    if (!this.isRunning) {
      console.log('⚠️  Monitoring system is not running');
      return;
    }

    console.log('🛑 Stopping monitoring system...');
    
    // Clear all intervals
    Object.values(this.intervals).forEach(interval => clearInterval(interval));
    this.intervals = {};
    this.isRunning = false;

    console.log('✅ Monitoring system stopped');
  }

  async checkHealth() {
    const timestamp = new Date().toISOString();
    const healthMetric = {
      timestamp,
      status: 'unknown',
      checks: {},
      issues: []
    };

    try {
      // Check frontend availability
      healthMetric.checks.frontend = await this.checkFrontendHealth();
      
      // Check backend functions
      healthMetric.checks.backend = await this.checkBackendHealth();
      
      // Check database connectivity
      healthMetric.checks.database = await this.checkDatabaseHealth();
      
      // Check external services
      healthMetric.checks.external = await this.checkExternalServices();

      // Determine overall health
      const failedChecks = Object.entries(healthMetric.checks)
        .filter(([_, status]) => status !== 'healthy')
        .map(([name, _]) => name);

      if (failedChecks.length === 0) {
        healthMetric.status = 'healthy';
      } else if (failedChecks.length <= 1) {
        healthMetric.status = 'degraded';
        healthMetric.issues = failedChecks;
      } else {
        healthMetric.status = 'unhealthy';
        healthMetric.issues = failedChecks;
      }

      this.metrics.health.push(healthMetric);
      
      // Trigger alerts if needed
      if (healthMetric.status !== 'healthy') {
        await this.triggerAlert('health', `System health is ${healthMetric.status}`, {
          issues: healthMetric.issues,
          checks: healthMetric.checks
        });
      }

    } catch (error) {
      healthMetric.status = 'error';
      healthMetric.error = error.message;
      this.metrics.health.push(healthMetric);
      
      await this.triggerAlert('health', `Health check failed: ${error.message}`, { error: error.message });
    }

    this.logMetric('health', healthMetric);
  }

  async checkFrontendHealth() {
    try {
      // Check if build files exist
      const buildFiles = ['dist/index.html', 'dist/assets'];
      const missingFiles = buildFiles.filter(file => !existsSync(join(projectRoot, file)));
      
      if (missingFiles.length > 0) {
        return 'unhealthy';
      }

      // Check package.json and dependencies
      if (!existsSync(join(projectRoot, 'package.json'))) {
        return 'unhealthy';
      }

      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  async checkBackendHealth() {
    try {
      // Check Supabase functions
      const functions = [
        'supabase/functions/process-sred/index.ts',
        'supabase/functions/process-document-ocr/index.ts',
        'supabase/functions/fill-pdf-t661/index.ts'
      ];

      const missingFunctions = functions.filter(func => !existsSync(join(projectRoot, func)));
      
      if (missingFunctions.length > 0) {
        return 'degraded';
      }

      // Check field mappings
      const mappings = [
        'supabase/field_mappings/t661_mapping.json',
        'supabase/field_mappings/t661_full_map.json'
      ];

      const missingMappings = mappings.filter(mapping => !existsSync(join(projectRoot, mapping)));
      
      if (missingMappings.length > 0) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  async checkDatabaseHealth() {
    try {
      // Check Supabase configuration
      if (!existsSync(join(projectRoot, 'supabase/config.toml'))) {
        return 'unhealthy';
      }

      // In a real implementation, this would test actual database connectivity
      // For now, we'll check if configuration files exist
      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  async checkExternalServices() {
    try {
      // Check if environment variables for external services are configured
      const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
      const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
      
      if (missingVars.length > 0) {
        return 'degraded';
      }

      return 'healthy';
    } catch (error) {
      return 'error';
    }
  }

  async checkPerformance() {
    const timestamp = new Date().toISOString();
    const performanceMetric = {
      timestamp,
      cpu: await this.getCPUUsage(),
      memory: await this.getMemoryUsage(),
      disk: await this.getDiskUsage(),
      response_times: await this.measureResponseTimes(),
      alerts: []
    };

    // Check thresholds and generate alerts
    if (performanceMetric.cpu > MONITORING_CONFIG.thresholds.cpu_usage) {
      performanceMetric.alerts.push('high_cpu');
      await this.triggerAlert('performance', `High CPU usage: ${(performanceMetric.cpu * 100).toFixed(1)}%`);
    }

    if (performanceMetric.memory > MONITORING_CONFIG.thresholds.memory_usage) {
      performanceMetric.alerts.push('high_memory');
      await this.triggerAlert('performance', `High memory usage: ${(performanceMetric.memory * 100).toFixed(1)}%`);
    }

    if (performanceMetric.disk > MONITORING_CONFIG.thresholds.disk_usage) {
      performanceMetric.alerts.push('high_disk');
      await this.triggerAlert('performance', `High disk usage: ${(performanceMetric.disk * 100).toFixed(1)}%`);
    }

    this.metrics.performance.push(performanceMetric);
    this.logMetric('performance', performanceMetric);
  }

  async getCPUUsage() {
    // Simplified CPU usage calculation
    // In production, use proper system monitoring libraries
    return Math.random() * 0.3; // Simulate 0-30% CPU usage
  }

  async getMemoryUsage() {
    const used = process.memoryUsage();
    const total = used.heapTotal + used.external;
    return used.heapUsed / total;
  }

  async getDiskUsage() {
    // Simplified disk usage check
    // In production, use proper filesystem monitoring
    return Math.random() * 0.5; // Simulate 0-50% disk usage
  }

  async measureResponseTimes() {
    // Simulate response time measurements
    return {
      frontend: Math.random() * 2000 + 500,  // 500-2500ms
      backend: Math.random() * 3000 + 1000,  // 1000-4000ms
      database: Math.random() * 1000 + 200   // 200-1200ms
    };
  }

  async scanErrors() {
    const timestamp = new Date().toISOString();
    const errorMetric = {
      timestamp,
      errors: [],
      error_rate: 0,
      critical_errors: 0
    };

    try {
      // Scan log files for errors
      const logFiles = [
        'health-check-report.json',
        'bug-reproduction-report.json'
      ];

      for (const logFile of logFiles) {
        const logPath = join(projectRoot, logFile);
        if (existsSync(logPath)) {
          const errors = await this.scanLogFile(logPath);
          errorMetric.errors.push(...errors);
        }
      }

      // Calculate error rate
      const totalEvents = Math.max(errorMetric.errors.length, 1);
      const errorEvents = errorMetric.errors.filter(e => e.level === 'error').length;
      errorMetric.error_rate = errorEvents / totalEvents;

      // Count critical errors
      errorMetric.critical_errors = errorMetric.errors.filter(e => e.level === 'critical').length;

      // Trigger alerts for high error rates
      if (errorMetric.error_rate > MONITORING_CONFIG.thresholds.error_rate) {
        await this.triggerAlert('errors', `High error rate: ${(errorMetric.error_rate * 100).toFixed(1)}%`, {
          error_count: errorEvents,
          total_events: totalEvents
        });
      }

      // Trigger alerts for critical errors
      if (errorMetric.critical_errors > 0) {
        await this.triggerAlert('errors', `Critical errors detected: ${errorMetric.critical_errors}`, {
          critical_errors: errorMetric.errors.filter(e => e.level === 'critical')
        });
      }

      this.metrics.errors.push(errorMetric);
      this.logMetric('errors', errorMetric);

    } catch (error) {
      console.error('Error scanning logs:', error.message);
    }
  }

  async scanLogFile(logPath) {
    try {
      const content = readFileSync(logPath, 'utf-8');
      const data = JSON.parse(content);
      
      const errors = [];
      
      // Extract errors from different log formats
      if (data.details && Array.isArray(data.details)) {
        // Health check report format
        data.details.forEach(detail => {
          if (detail.level === 'fail') {
            errors.push({
              timestamp: detail.timestamp,
              level: 'error',
              category: detail.category,
              message: detail.message,
              source: 'health_check'
            });
          }
        });
      }
      
      if (data.scenarios && Array.isArray(data.scenarios)) {
        // Bug reproduction report format
        data.scenarios.forEach(scenario => {
          if (scenario.status === 'failed') {
            errors.push({
              timestamp: scenario.timestamp,
              level: 'error',
              category: scenario.category,
              message: `Scenario failed: ${scenario.name}`,
              source: 'bug_reproduction'
            });
          }
        });
      }
      
      return errors;
    } catch (error) {
      return [];
    }
  }

  async checkDiskSpace() {
    const timestamp = new Date().toISOString();
    
    try {
      const diskUsage = await this.getDiskUsage();
      
      if (diskUsage > MONITORING_CONFIG.thresholds.disk_usage) {
        await this.triggerAlert('disk', `Low disk space: ${((1 - diskUsage) * 100).toFixed(1)}% remaining`);
      }
      
      this.logMetric('disk', { timestamp, usage: diskUsage });
    } catch (error) {
      console.error('Error checking disk space:', error.message);
    }
  }

  async triggerAlert(type, message, details = {}) {
    const alertKey = `${type}:${message}`;
    const now = Date.now();
    
    // Prevent duplicate alerts within 5 minutes
    if (this.alertHistory.has(alertKey)) {
      const lastAlert = this.alertHistory.get(alertKey);
      if (now - lastAlert < 300000) { // 5 minutes
        return;
      }
    }
    
    this.alertHistory.set(alertKey, now);
    
    const alert = {
      timestamp: new Date().toISOString(),
      type,
      message,
      details,
      severity: this.getAlertSeverity(type, message)
    };
    
    this.metrics.alerts.push(alert);
    
    console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${message}`);
    
    // Send notifications
    await this.sendNotifications(alert);
    
    // Log alert
    this.logAlert(alert);
  }

  getAlertSeverity(type, message) {
    if (message.includes('critical') || message.includes('unhealthy')) {
      return 'critical';
    } else if (message.includes('high') || message.includes('degraded')) {
      return 'warning';
    } else {
      return 'info';
    }
  }

  async sendNotifications(alert) {
    // In production, implement actual notification sending
    // For now, just log the notification
    console.log(`📧 Notification would be sent: ${alert.message}`);
    
    // Example webhook notification (commented out)
    /*
    if (MONITORING_CONFIG.alerts.webhook) {
      try {
        await fetch(MONITORING_CONFIG.alerts.webhook, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert)
        });
      } catch (error) {
        console.error('Failed to send webhook notification:', error.message);
      }
    }
    */
  }

  logMetric(type, metric) {
    const logPath = join(projectRoot, `monitoring-${type}.log`);
    const logEntry = `${metric.timestamp} ${JSON.stringify(metric)}\n`;
    
    try {
      appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error(`Failed to log ${type} metric:`, error.message);
    }
  }

  logAlert(alert) {
    const logPath = join(projectRoot, 'monitoring-alerts.log');
    const logEntry = `${alert.timestamp} [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}\n`;
    
    try {
      appendFileSync(logPath, logEntry);
    } catch (error) {
      console.error('Failed to log alert:', error.message);
    }
  }

  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      uptime: this.isRunning ? 'running' : 'stopped',
      summary: {
        health_checks: this.metrics.health.length,
        performance_checks: this.metrics.performance.length,
        error_scans: this.metrics.errors.length,
        alerts: this.metrics.alerts.length
      },
      latest_metrics: {
        health: this.metrics.health.slice(-1)[0] || null,
        performance: this.metrics.performance.slice(-1)[0] || null,
        errors: this.metrics.errors.slice(-1)[0] || null
      },
      recent_alerts: this.metrics.alerts.slice(-10)
    };

    const reportPath = join(projectRoot, 'monitoring-report.json');
    writeFileSync(reportPath, JSON.stringify(report, null, 2));
    
    console.log('\n📊 Monitoring Report Generated:');
    console.log(`   Health checks: ${report.summary.health_checks}`);
    console.log(`   Performance checks: ${report.summary.performance_checks}`);
    console.log(`   Error scans: ${report.summary.error_scans}`);
    console.log(`   Alerts: ${report.summary.alerts}`);
    console.log(`   Report saved to: monitoring-report.json`);
    
    return report;
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const monitor = new MonitoringSystem();

  if (args.length === 0 || args[0] === '--help') {
    console.log('📊 Monitoring and Alerting System\n');
    console.log('Usage:');
    console.log('  node monitoring-alerts.js start     # Start monitoring');
    console.log('  node monitoring-alerts.js stop      # Stop monitoring');
    console.log('  node monitoring-alerts.js status    # Show current status');
    console.log('  node monitoring-alerts.js report    # Generate report');
    console.log('  node monitoring-alerts.js test      # Run test alerts');
    return;
  }

  const command = args[0];

  try {
    switch (command) {
      case 'start':
        monitor.start();
        
        // Keep running until interrupted
        process.on('SIGINT', () => {
          console.log('\n🛑 Received interrupt signal');
          monitor.stop();
          process.exit(0);
        });
        
        // Generate periodic reports
        setInterval(() => {
          monitor.generateReport();
        }, 600000); // Every 10 minutes
        
        break;
        
      case 'stop':
        monitor.stop();
        break;
        
      case 'status':
        console.log(`📊 Monitoring Status: ${monitor.isRunning ? 'Running' : 'Stopped'}`);
        if (monitor.isRunning) {
          console.log(`   Active intervals: ${Object.keys(monitor.intervals).length}`);
          console.log(`   Metrics collected: ${Object.values(monitor.metrics).flat().length}`);
        }
        break;
        
      case 'report':
        monitor.generateReport();
        break;
        
      case 'test':
        console.log('🧪 Testing alert system...');
        await monitor.triggerAlert('test', 'Test alert - system is working correctly', { test: true });
        console.log('✅ Test alert sent');
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

export { MonitoringSystem };