#!/usr/bin/env node

/**
 * System Health Check Tool
 * 
 * Performs comprehensive health checks across all system components
 * to identify potential issues and verify system functionality.
 */

import { readFileSync, existsSync, statSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '../..');

// Health check configuration
const HEALTH_CHECKS = {
  frontend: {
    name: 'Frontend Components',
    checks: [
      'package.json exists',
      'vite.config.ts exists',
      'src/main.tsx exists',
      'src/App.tsx exists',
      'Essential components exist',
      'No TypeScript errors in key files'
    ]
  },
  backend: {
    name: 'Backend Functions',
    checks: [
      'Supabase functions exist',
      'Field mappings exist',
      'Templates exist',
      'Function configurations valid'
    ]
  },
  documentation: {
    name: 'Documentation',
    checks: [
      'README.md exists',
      'Documentation structure',
      'No broken links in docs',
      'Required sections present'
    ]
  },
  testing: {
    name: 'Testing Infrastructure',
    checks: [
      'Test configuration exists',
      'Test files present',
      'Coverage configuration',
      'Test dependencies installed'
    ]
  }
};

class HealthChecker {
  constructor() {
    this.results = {
      passed: 0,
      failed: 0,
      warnings: 0,
      details: []
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
    
    this.results.details.push(result);
    
    const icon = level === 'pass' ? '✅' : level === 'fail' ? '❌' : '⚠️';
    console.log(`${icon} [${category}] ${check}: ${message}`);
    
    if (details) {
      console.log(`   Details: ${details}`);
    }
    
    if (level === 'pass') this.results.passed++;
    else if (level === 'fail') this.results.failed++;
    else this.results.warnings++;
  }

  checkFileExists(filePath, category, description) {
    const fullPath = join(projectRoot, filePath);
    if (existsSync(fullPath)) {
      this.log('pass', category, description, `Found at ${filePath}`);
      return true;
    } else {
      this.log('fail', category, description, `Missing file: ${filePath}`);
      return false;
    }
  }

  checkDirectoryExists(dirPath, category, description) {
    const fullPath = join(projectRoot, dirPath);
    if (existsSync(fullPath) && statSync(fullPath).isDirectory()) {
      this.log('pass', category, description, `Directory exists: ${dirPath}`);
      return true;
    } else {
      this.log('fail', category, description, `Missing directory: ${dirPath}`);
      return false;
    }
  }

  checkPackageJson() {
    const category = 'Frontend';
    
    if (!this.checkFileExists('package.json', category, 'Package configuration')) {
      return;
    }

    try {
      const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
      
      // Check essential dependencies
      const essentialDeps = ['react', 'vite', '@supabase/supabase-js'];
      const missingDeps = essentialDeps.filter(dep => 
        !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
      );
      
      if (missingDeps.length === 0) {
        this.log('pass', category, 'Essential dependencies', 'All essential dependencies present');
      } else {
        this.log('fail', category, 'Essential dependencies', 
          `Missing dependencies: ${missingDeps.join(', ')}`);
      }

      // Check scripts
      const essentialScripts = ['dev', 'build', 'test'];
      const missingScripts = essentialScripts.filter(script => !packageJson.scripts?.[script]);
      
      if (missingScripts.length === 0) {
        this.log('pass', category, 'Build scripts', 'All essential scripts present');
      } else {
        this.log('warn', category, 'Build scripts', 
          `Missing scripts: ${missingScripts.join(', ')}`);
      }

    } catch (error) {
      this.log('fail', category, 'Package configuration', 
        'Invalid package.json format', error.message);
    }
  }

  checkFrontendStructure() {
    const category = 'Frontend';
    
    // Check essential files
    const essentialFiles = [
      'src/main.tsx',
      'src/App.tsx',
      'src/pages/Index.tsx',
      'vite.config.ts',
      'tsconfig.json'
    ];

    essentialFiles.forEach(file => {
      this.checkFileExists(file, category, `Essential file: ${file}`);
    });

    // Check component directories
    const componentDirs = [
      'src/components',
      'src/components/ui',
      'src/components/help',
      'src/components/upload'
    ];

    componentDirs.forEach(dir => {
      this.checkDirectoryExists(dir, category, `Component directory: ${dir}`);
    });

    // Check for TypeScript configuration
    if (this.checkFileExists('tsconfig.json', category, 'TypeScript configuration')) {
      try {
        const tsConfig = JSON.parse(readFileSync(join(projectRoot, 'tsconfig.json'), 'utf-8'));
        if (tsConfig.compilerOptions?.strict) {
          this.log('pass', category, 'TypeScript strict mode', 'Strict mode enabled');
        } else {
          this.log('warn', category, 'TypeScript strict mode', 'Strict mode not enabled');
        }
      } catch (error) {
        this.log('fail', category, 'TypeScript configuration', 
          'Invalid tsconfig.json', error.message);
      }
    }
  }

  checkBackendStructure() {
    const category = 'Backend';
    
    // Check Supabase structure
    const supabaseDirs = [
      'supabase',
      'supabase/functions',
      'supabase/field_mappings',
      'supabase/templates'
    ];

    supabaseDirs.forEach(dir => {
      this.checkDirectoryExists(dir, category, `Supabase directory: ${dir}`);
    });

    // Check essential functions
    const functions = [
      'supabase/functions/process-sred',
      'supabase/functions/process-document-ocr',
      'supabase/functions/fill-pdf-t661'
    ];

    functions.forEach(func => {
      this.checkDirectoryExists(func, category, `Edge function: ${func}`);
      this.checkFileExists(`${func}/index.ts`, category, `Function implementation: ${func}`);
    });

    // Check field mappings
    const mappings = [
      'supabase/field_mappings/t661_mapping.json',
      'supabase/field_mappings/t661_full_map.json'
    ];

    mappings.forEach(mapping => {
      if (this.checkFileExists(mapping, category, `Field mapping: ${mapping}`)) {
        try {
          const mappingData = JSON.parse(readFileSync(join(projectRoot, mapping), 'utf-8'));
          if (Object.keys(mappingData).length > 0) {
            this.log('pass', category, `Mapping validation: ${mapping}`, 
              `Contains ${Object.keys(mappingData).length} field mappings`);
          } else {
            this.log('warn', category, `Mapping validation: ${mapping}`, 'Empty mapping file');
          }
        } catch (error) {
          this.log('fail', category, `Mapping validation: ${mapping}`, 
            'Invalid JSON format', error.message);
        }
      }
    });

    // Check templates
    const templates = [
      'supabase/templates/t661-20e.pdf'
    ];

    templates.forEach(template => {
      this.checkFileExists(template, category, `PDF template: ${template}`);
    });
  }

  checkDocumentation() {
    const category = 'Documentation';
    
    // Check essential documentation
    const docs = [
      'README.md',
      'DEPLOYMENT.md',
      '.kiro/specs/rambo2-system-audit/requirements.md',
      '.kiro/specs/rambo2-system-audit/design.md',
      '.kiro/specs/rambo2-system-audit/tasks.md'
    ];

    docs.forEach(doc => {
      if (this.checkFileExists(doc, category, `Documentation: ${doc}`)) {
        try {
          const content = readFileSync(join(projectRoot, doc), 'utf-8');
          if (content.length > 100) {
            this.log('pass', category, `Content check: ${doc}`, 
              `Contains ${content.length} characters`);
          } else {
            this.log('warn', category, `Content check: ${doc}`, 'Very short content');
          }
        } catch (error) {
          this.log('fail', category, `Content check: ${doc}`, 
            'Cannot read file', error.message);
        }
      }
    });

    // Check for documentation structure
    const docDirs = [
      '.kiro',
      '.kiro/specs',
      '.ai_context'
    ];

    docDirs.forEach(dir => {
      this.checkDirectoryExists(dir, category, `Documentation directory: ${dir}`);
    });
  }

  checkTestingInfrastructure() {
    const category = 'Testing';
    
    // Check test configuration
    const testFiles = [
      'vitest.config.ts',
      'src/test-setup.ts'
    ];

    testFiles.forEach(file => {
      this.checkFileExists(file, category, `Test configuration: ${file}`);
    });

    // Check test directories
    const testDirs = [
      'tests',
      'src/components/__tests__',
      'src/workflow-context-preservation/__tests__'
    ];

    testDirs.forEach(dir => {
      this.checkDirectoryExists(dir, category, `Test directory: ${dir}`);
    });

    // Check for test dependencies
    if (existsSync(join(projectRoot, 'package.json'))) {
      try {
        const packageJson = JSON.parse(readFileSync(join(projectRoot, 'package.json'), 'utf-8'));
        const testDeps = ['vitest', '@testing-library/react', 'fast-check'];
        const missingTestDeps = testDeps.filter(dep => 
          !packageJson.dependencies?.[dep] && !packageJson.devDependencies?.[dep]
        );
        
        if (missingTestDeps.length === 0) {
          this.log('pass', category, 'Test dependencies', 'All test dependencies present');
        } else {
          this.log('fail', category, 'Test dependencies', 
            `Missing test dependencies: ${missingTestDeps.join(', ')}`);
        }
      } catch (error) {
        this.log('fail', category, 'Test dependencies', 'Cannot check dependencies', error.message);
      }
    }
  }

  checkEnvironmentVariables() {
    const category = 'Configuration';
    
    // Check for environment files
    const envFiles = ['.env.example', '.env.local'];
    let hasEnvConfig = false;
    
    envFiles.forEach(file => {
      if (existsSync(join(projectRoot, file))) {
        this.log('pass', category, `Environment file: ${file}`, 'Found');
        hasEnvConfig = true;
      }
    });

    if (!hasEnvConfig) {
      this.log('warn', category, 'Environment configuration', 
        'No environment files found (.env.example, .env.local)');
    }

    // Check Vercel configuration
    if (this.checkFileExists('vercel.json', category, 'Vercel configuration')) {
      try {
        const vercelConfig = JSON.parse(readFileSync(join(projectRoot, 'vercel.json'), 'utf-8'));
        if (vercelConfig.functions || vercelConfig.rewrites) {
          this.log('pass', category, 'Vercel configuration', 'Contains function/routing configuration');
        } else {
          this.log('warn', category, 'Vercel configuration', 'Basic configuration only');
        }
      } catch (error) {
        this.log('fail', category, 'Vercel configuration', 'Invalid JSON', error.message);
      }
    }
  }

  async runAllChecks() {
    console.log('🔍 Starting System Health Check...\n');
    
    this.checkPackageJson();
    this.checkFrontendStructure();
    this.checkBackendStructure();
    this.checkDocumentation();
    this.checkTestingInfrastructure();
    this.checkEnvironmentVariables();
    
    console.log('\n📊 Health Check Summary:');
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⚠️  Warnings: ${this.results.warnings}`);
    
    const total = this.results.passed + this.results.failed + this.results.warnings;
    const successRate = total > 0 ? ((this.results.passed / total) * 100).toFixed(1) : 0;
    console.log(`📈 Success Rate: ${successRate}%`);
    
    if (this.results.failed > 0) {
      console.log('\n🚨 Critical Issues Found:');
      this.results.details
        .filter(r => r.level === 'fail')
        .forEach(r => console.log(`   - ${r.category}: ${r.check} - ${r.message}`));
    }
    
    if (this.results.warnings > 0) {
      console.log('\n⚠️  Warnings:');
      this.results.details
        .filter(r => r.level === 'warn')
        .forEach(r => console.log(`   - ${r.category}: ${r.check} - ${r.message}`));
    }
    
    // Generate report file
    const reportPath = join(projectRoot, 'health-check-report.json');
    try {
      const report = {
        timestamp: new Date().toISOString(),
        summary: {
          passed: this.results.passed,
          failed: this.results.failed,
          warnings: this.results.warnings,
          successRate: parseFloat(successRate)
        },
        details: this.results.details
      };
      
      await import('fs').then(fs => 
        fs.writeFileSync(reportPath, JSON.stringify(report, null, 2))
      );
      console.log(`\n📄 Detailed report saved to: health-check-report.json`);
    } catch (error) {
      console.log(`\n❌ Failed to save report: ${error.message}`);
    }
    
    return this.results.failed === 0;
  }
}

// Run health check if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  const checker = new HealthChecker();
  checker.runAllChecks().then(success => {
    process.exit(success ? 0 : 1);
  }).catch(error => {
    console.error('Health check failed:', error);
    process.exit(1);
  });
}

export { HealthChecker };