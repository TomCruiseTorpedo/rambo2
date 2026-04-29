#!/usr/bin/env node

/**
 * Pre-Deployment Validation Script
 * 
 * Comprehensive validation checks to run before deploying to production.
 * Ensures system stability and prevents deployment of broken code.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { spawn } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Validation configuration
const VALIDATION_CONFIG = {
  required_files: [
    'package.json',
    'vite.config.ts',
    'tsconfig.json',
    'src/main.tsx',
    'src/App.tsx',
    'supabase/config.toml'
  ],
  required_directories: [
    'src/components',
    'src/pages',
    'supabase/functions',
    'supabase/field_mappings'
  ],
  required_functions: [
    'supabase/functions/process-sred/index.ts',
    'supabase/functions/process-document-ocr/index.ts',
    'supabase/functions/fill-pdf-t661/index.ts'
  ],
  required_mappings: [
    'supabase/field_mappings/t661_mapping.json',
    'supabase/field_mappings/t661_full_map.json'
  ],
  required_env_vars: [
    'SUPABASE_URL',
    'SUPABASE_ANON_KEY'
  ],
  test_thresholds: {
    min_coverage: 70,        // Minimum test coverage percentage
    max_test_time: 300000,   // Maximum test execution time (5 minutes)
    max_build_time: 180000   // Maximum build time (3 minutes)
  }
};

class PreDeploymentValidator {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      checks: [],
      startTime: Date.now()
    };
  }

  log(level, category, check, message, details = null) {
    const result = {
      level,
      category,
      check,
      message,
      details,
      timestamp: new Date().toISOString()
    };
    
    this.results.checks.push(result);
    
    const icon = level === 'pass' ? '✅' : level === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${category}] ${check}: ${message}`);
    
    if (details) {
      console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
    }
    
    if (level === 'pass') this.results.passed++;
    else if (level === 'fail') this.results.failed++;
    else this.results.warnings++;
  }

  async runAllValidations() {
    console.log('🚀 Starting Pre-Deployment Validation...\n');
    
    try {
      await this.validateFileStructure();
      await this.validateDependencies();
      await this.validateConfiguration();
      await this.validateBuild();
      await this.validateTests();
      await this.validateFunctions();
      await this.validateSecurity();
      await this.validatePerformance();
      
      return this.generateReport();
    } catch (error) {
      this.log('fail', 'System', 'Validation Process', `Validation failed: ${error.message}`);
      return this.generateReport();
    }
  }

  async validateFileStructure() {
    const category = 'File Structure';
    
    // Check required files
    for (const file of VALIDATION_CONFIG.required_files) {
      const filePath = join(projectRoot, file);
      if (existsSync(filePath)) {
        this.log('pass', category, `Required file: ${file}`, 'File exists');
      } else {
        this.log('fail', category, `Required file: ${file}`, 'File missing');
      }
    }

    // Check required directories
    for (const dir of VALIDATION_CONFIG.required_directories) {
      const dirPath = join(projectRoot, dir);
      if (existsSync(dirPath) && statSync(dirPath).isDirectory()) {
        this.log('pass', category, `Required directory: ${dir}`, 'Directory exists');
      } else {
        this.log('fail', category, `Required directory: ${dir}`, 'Directory missing');
      }
    }

    // Check function files
    for (const func of VALIDATION_CONFIG.required_functions) {
      const funcPath = join(projectRoot, func);
      if (existsSync(funcPath)) {
        this.log('pass', category, `Function file: ${func}`, 'Function exists');
      } else {
        this.log('fail', category, `Function file: ${func}`, 'Function missing');
      }
    }

    // Check field mappings
    for (const mapping of VALIDATION_CONFIG.required_mappings) {
      const mappingPath = join(projectRoot, mapping);
      if (existsSync(mappingPath)) {
        try {
          const mappingData = JSON.parse(readFileSync(mappingPath, 'utf-8'));
          const fieldCount = Object.keys(mappingData).length;
          this.log('pass', category, `Field mapping: ${mapping}`, 
            `Valid JSON with ${fieldCount} fields`);
        } catch (error) {
          this.log('fail', category, `Field mapping: ${mapping}`, 
            `Invalid JSON: ${error.message}`);
        }
      } else {
        this.log('fail', category, `Field mapping: ${mapping}`, 'Mapping file missing');
      }
    }
  }

  async validateDependencies() {
    const category = 'Dependencies';
    
    try {
      const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
      
      // Check essential dependencies
      const essentialDeps = [
        'react',
        'vite',
        '@supabase/supabase-js',
        'typescript'
      ];
      
      for (const dep of essentialDeps) {
        if (packageJson.dependencies?.[dep] || packageJson.devDependencies?.[dep]) {
          this.log('pass', category, `Dependency: ${dep}`, 'Dependency present');
        } else {
          this.log('fail', category, `Dependency: ${dep}`, 'Dependency missing');
        }
      }

      // Check for security vulnerabilities
      try {
        const auditResult = await this.runCommand('npm', ['audit', '--audit-level=high']);
        if (auditResult.exitCode === 0) {
          this.log('pass', category, 'Security Audit', 'No high-severity vulnerabilities');
        } else {
          this.log('fail', category, 'Security Audit', 'High-severity vulnerabilities found');
        }
      } catch (error) {
        this.log('warn', category, 'Security Audit', `Audit failed: ${error.message}`);
      }

      // Check for outdated dependencies
      try {
        const outdatedResult = await this.runCommand('npm', ['outdated']);
        if (outdatedResult.exitCode === 0) {
          this.log('pass', category, 'Dependency Updates', 'All dependencies up to date');
        } else {
          this.log('warn', category, 'Dependency Updates', 'Some dependencies are outdated');
        }
      } catch (error) {
        this.log('warn', category, 'Dependency Updates', `Update check failed: ${error.message}`);
      }

    } catch (error) {
      this.log('fail', category, 'Package Configuration', `Cannot read package.json: ${error.message}`);
    }
  }

  async validateConfiguration() {
    const category = 'Configuration';
    
    // Check environment variables
    for (const envVar of VALIDATION_CONFIG.required_env_vars) {
      if (process.env[envVar]) {
        this.log('pass', category, `Environment Variable: ${envVar}`, 'Variable set');
      } else {
        this.log('fail', category, `Environment Variable: ${envVar}`, 'Variable missing');
      }
    }

    // Check TypeScript configuration
    try {
      const tsConfig = JSON.parse(readFileSync(join(projectRoot, 'tsconfig.json'), 'utf-8'));
      if (tsConfig.compilerOptions?.strict) {
        this.log('pass', category, 'TypeScript Config', 'Strict mode enabled');
      } else {
        this.log('warn', category, 'TypeScript Config', 'Strict mode not enabled');
      }
    } catch (error) {
      this.log('fail', category, 'TypeScript Config', `Invalid tsconfig.json: ${error.message}`);
    }

    // Check Vite configuration
    try {
      const viteConfigPath = join(projectRoot, 'vite.config.ts');
      if (existsSync(viteConfigPath)) {
        this.log('pass', category, 'Vite Config', 'Configuration file exists');
      } else {
        this.log('fail', category, 'Vite Config', 'Configuration file missing');
      }
    } catch (error) {
      this.log('fail', category, 'Vite Config', `Configuration error: ${error.message}`);
    }

    // Check Supabase configuration
    try {
      const supabaseConfigPath = join(projectRoot, 'supabase/config.toml');
      if (existsSync(supabaseConfigPath)) {
        this.log('pass', category, 'Supabase Config', 'Configuration file exists');
      } else {
        this.log('fail', category, 'Supabase Config', 'Configuration file missing');
      }
    } catch (error) {
      this.log('fail', category, 'Supabase Config', `Configuration error: ${error.message}`);
    }
  }

  async validateBuild() {
    const category = 'Build Process';
    
    try {
      console.log('🔨 Running build process...');
      const buildStart = Date.now();
      
      const buildResult = await this.runCommand('npm', ['run', 'build'], {
        timeout: VALIDATION_CONFIG.test_thresholds.max_build_time
      });
      
      const buildTime = Date.now() - buildStart;
      
      if (buildResult.exitCode === 0) {
        this.log('pass', category, 'Build Process', 
          `Build successful in ${(buildTime / 1000).toFixed(1)}s`);
        
        // Check build output
        const distPath = join(projectRoot, 'dist');
        if (existsSync(distPath)) {
          this.log('pass', category, 'Build Output', 'Dist directory created');
          
          // Check for essential build files
          const essentialBuildFiles = ['index.html', 'assets'];
          for (const file of essentialBuildFiles) {
            const filePath = join(distPath, file);
            if (existsSync(filePath)) {
              this.log('pass', category, `Build File: ${file}`, 'File exists in build output');
            } else {
              this.log('fail', category, `Build File: ${file}`, 'File missing from build output');
            }
          }
        } else {
          this.log('fail', category, 'Build Output', 'Dist directory not created');
        }
      } else {
        this.log('fail', category, 'Build Process', 
          `Build failed: ${buildResult.stderr || buildResult.stdout}`);
      }
    } catch (error) {
      this.log('fail', category, 'Build Process', `Build error: ${error.message}`);
    }
  }

  async validateTests() {
    const category = 'Testing';
    
    try {
      console.log('🧪 Running test suite...');
      const testStart = Date.now();
      
      const testResult = await this.runCommand('npm', ['run', 'test:run'], {
        timeout: VALIDATION_CONFIG.test_thresholds.max_test_time
      });
      
      const testTime = Date.now() - testStart;
      
      if (testResult.exitCode === 0) {
        this.log('pass', category, 'Test Suite', 
          `All tests passed in ${(testTime / 1000).toFixed(1)}s`);
      } else {
        this.log('fail', category, 'Test Suite', 
          `Tests failed: ${testResult.stderr || testResult.stdout}`);
      }

      // Run coverage check
      try {
        const coverageResult = await this.runCommand('npm', ['run', 'test:coverage']);
        if (coverageResult.exitCode === 0) {
          this.log('pass', category, 'Test Coverage', 'Coverage report generated');
        } else {
          this.log('warn', category, 'Test Coverage', 'Coverage check failed');
        }
      } catch (error) {
        this.log('warn', category, 'Test Coverage', `Coverage error: ${error.message}`);
      }

      // Run linting
      try {
        const lintResult = await this.runCommand('npm', ['run', 'lint']);
        if (lintResult.exitCode === 0) {
          this.log('pass', category, 'Code Linting', 'No linting errors');
        } else {
          this.log('fail', category, 'Code Linting', 'Linting errors found');
        }
      } catch (error) {
        this.log('warn', category, 'Code Linting', `Linting error: ${error.message}`);
      }

    } catch (error) {
      this.log('fail', category, 'Testing', `Test error: ${error.message}`);
    }
  }

  async validateFunctions() {
    const category = 'Edge Functions';
    
    // Check function syntax
    for (const func of VALIDATION_CONFIG.required_functions) {
      const funcPath = join(projectRoot, func);
      if (existsSync(funcPath)) {
        try {
          const funcContent = readFileSync(funcPath, 'utf-8');
          
          // Basic syntax checks
          if (funcContent.includes('export default') || funcContent.includes('export {')) {
            this.log('pass', category, `Function Syntax: ${func}`, 'Valid export found');
          } else {
            this.log('warn', category, `Function Syntax: ${func}`, 'No export found');
          }

          // Check for error handling
          if (funcContent.includes('try') && funcContent.includes('catch')) {
            this.log('pass', category, `Error Handling: ${func}`, 'Error handling present');
          } else {
            this.log('warn', category, `Error Handling: ${func}`, 'No error handling found');
          }

        } catch (error) {
          this.log('fail', category, `Function Validation: ${func}`, 
            `Cannot read function: ${error.message}`);
        }
      }
    }

    // Test function deployment (if Supabase CLI is available)
    try {
      const supabaseResult = await this.runCommand('supabase', ['--version']);
      if (supabaseResult.exitCode === 0) {
        this.log('pass', category, 'Supabase CLI', 'CLI available for deployment');
        
        // Validate function configuration
        try {
          const validateResult = await this.runCommand('supabase', ['functions', 'list']);
          if (validateResult.exitCode === 0) {
            this.log('pass', category, 'Function Configuration', 'Functions configured correctly');
          } else {
            this.log('warn', category, 'Function Configuration', 'Function configuration issues');
          }
        } catch (error) {
          this.log('warn', category, 'Function Configuration', `Validation error: ${error.message}`);
        }
      } else {
        this.log('warn', category, 'Supabase CLI', 'CLI not available');
      }
    } catch (error) {
      this.log('warn', category, 'Supabase CLI', `CLI check failed: ${error.message}`);
    }
  }

  async validateSecurity() {
    const category = 'Security';
    
    // Check for hardcoded secrets
    try {
      const secretPatterns = [
        /api[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /secret[_-]?key\s*[:=]\s*['"][^'"]+['"]/gi,
        /password\s*[:=]\s*['"][^'"]+['"]/gi,
        /token\s*[:=]\s*['"][^'"]+['"]/gi
      ];

      let secretsFound = false;
      const sourceFiles = await this.getSourceFiles();
      
      for (const file of sourceFiles) {
        const content = readFileSync(file, 'utf-8');
        for (const pattern of secretPatterns) {
          if (pattern.test(content)) {
            secretsFound = true;
            this.log('fail', category, `Hardcoded Secrets: ${file}`, 
              'Potential hardcoded secret found');
            break;
          }
        }
      }

      if (!secretsFound) {
        this.log('pass', category, 'Hardcoded Secrets', 'No hardcoded secrets found');
      }

    } catch (error) {
      this.log('warn', category, 'Security Scan', `Security scan failed: ${error.message}`);
    }

    // Check HTTPS configuration
    try {
      const vercelConfig = join(projectRoot, 'vercel.json');
      if (existsSync(vercelConfig)) {
        const config = JSON.parse(readFileSync(vercelConfig, 'utf-8'));
        if (config.headers && config.headers.some(h => h.key === 'Strict-Transport-Security')) {
          this.log('pass', category, 'HTTPS Configuration', 'HSTS header configured');
        } else {
          this.log('warn', category, 'HTTPS Configuration', 'HSTS header not configured');
        }
      }
    } catch (error) {
      this.log('warn', category, 'HTTPS Configuration', `Configuration check failed: ${error.message}`);
    }
  }

  async validatePerformance() {
    const category = 'Performance';
    
    // Check bundle size
    try {
      const distPath = join(projectRoot, 'dist');
      if (existsSync(distPath)) {
        const stats = await this.getBundleStats(distPath);
        
        if (stats.totalSize < 5 * 1024 * 1024) { // 5MB
          this.log('pass', category, 'Bundle Size', 
            `Bundle size acceptable: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
          this.log('warn', category, 'Bundle Size', 
            `Bundle size large: ${(stats.totalSize / 1024 / 1024).toFixed(2)}MB`);
        }

        if (stats.jsSize < 2 * 1024 * 1024) { // 2MB
          this.log('pass', category, 'JavaScript Size', 
            `JS bundle acceptable: ${(stats.jsSize / 1024 / 1024).toFixed(2)}MB`);
        } else {
          this.log('warn', category, 'JavaScript Size', 
            `JS bundle large: ${(stats.jsSize / 1024 / 1024).toFixed(2)}MB`);
        }
      }
    } catch (error) {
      this.log('warn', category, 'Bundle Analysis', `Bundle analysis failed: ${error.message}`);
    }

    // Check for performance best practices
    const sourceFiles = await this.getSourceFiles();
    let performanceIssues = 0;

    for (const file of sourceFiles.slice(0, 10)) { // Check first 10 files
      try {
        const content = readFileSync(file, 'utf-8');
        
        // Check for console.log statements
        if (content.includes('console.log')) {
          performanceIssues++;
        }
        
        // Check for large inline styles
        if (content.includes('style={{') && content.length > 10000) {
          performanceIssues++;
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }

    if (performanceIssues === 0) {
      this.log('pass', category, 'Performance Best Practices', 'No obvious performance issues');
    } else {
      this.log('warn', category, 'Performance Best Practices', 
        `${performanceIssues} potential performance issues found`);
    }
  }

  async getSourceFiles() {
    const { glob } = await import('glob');
    return glob.sync('src/**/*.{ts,tsx,js,jsx}', { cwd: projectRoot, absolute: true });
  }

  async getBundleStats(distPath) {
    const { glob } = await import('glob');
    const files = glob.sync('**/*', { cwd: distPath, absolute: true });
    
    let totalSize = 0;
    let jsSize = 0;
    
    for (const file of files) {
      try {
        const stats = statSync(file);
        if (stats.isFile()) {
          totalSize += stats.size;
          if (file.endsWith('.js')) {
            jsSize += stats.size;
          }
        }
      } catch (error) {
        // Skip files that can't be read
      }
    }
    
    return { totalSize, jsSize };
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

  generateReport() {
    const duration = Date.now() - this.results.startTime;
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    
    console.log('\n📊 Pre-Deployment Validation Summary:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(1)}s`);
    
    const deploymentReady = this.results.failed === 0;
    
    if (deploymentReady) {
      console.log('\n🚀 DEPLOYMENT READY: All critical validations passed');
    } else {
      console.log('\n🚫 DEPLOYMENT BLOCKED: Critical issues must be resolved');
      console.log('\n🚨 Critical Issues:');
      this.results.checks
        .filter(c => c.level === 'fail')
        .forEach(c => console.log(`   - ${c.category}: ${c.check} - ${c.message}`));
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️  Warnings (should be addressed):');
      this.results.checks
        .filter(c => c.level === 'warn')
        .forEach(c => console.log(`   - ${c.category}: ${c.check} - ${c.message}`));
    }
    
    // Generate detailed report
    const report = {
      timestamp: new Date().toISOString(),
      duration,
      summary: {
        passed: this.results.passed,
        failed: this.results.failed,
        warnings: this.results.warnings,
        successRate: parseFloat(successRate),
        deploymentReady
      },
      checks: this.results.checks
    };
    
    try {
      const reportPath = join(projectRoot, 'pre-deployment-validation-report.json');
      writeFileSync(reportPath, JSON.stringify(report, null, 2));
      console.log(`\n📄 Detailed report saved to: pre-deployment-validation-report.json`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }
    
    return {
      success: deploymentReady,
      report
    };
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    console.log('🚀 Pre-Deployment Validation Tool\n');
    console.log('Usage:');
    console.log('  node pre-deployment-validation.js           # Run full validation');
    console.log('  node pre-deployment-validation.js --quick   # Run quick validation');
    console.log('  node pre-deployment-validation.js --help    # Show this help');
    return;
  }

  const validator = new PreDeploymentValidator();
  
  try {
    const result = await validator.runAllValidations();
    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error(`❌ Validation failed: ${error.message}`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { PreDeploymentValidator };