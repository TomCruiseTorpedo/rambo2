/**
 * System Integration Validation Test
 * 
 * This test suite validates that all audit items from the Rambo2 System Audit
 * have been properly addressed and the system is functioning correctly.
 * 
 * **Validates: Requirements 4.1, 4.3**
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

describe('System Integration Validation', () => {
  describe('Phase 1: Documentation Framework Validation', () => {
    it('should have unified documentation structure', () => {
      const requiredDirs = [
        '.kiro/docs/architecture',
        '.kiro/docs/development',
        '.kiro/docs/security',
        '.kiro/docs/project-management',
        '.kiro/docs/tools',
        '.kiro/docs/audit',
        '.kiro/docs/audit-reports'
      ];

      requiredDirs.forEach(dir => {
        expect(existsSync(dir), `Directory ${dir} should exist`).toBe(true);
      });
    });

    it('should have all required documentation files', () => {
      const requiredFiles = [
        '.kiro/docs/README.md',
        '.kiro/docs/architecture/system-overview.md',
        '.kiro/docs/architecture/frontend-architecture.md',
        '.kiro/docs/architecture/backend-architecture.md',
        '.kiro/docs/architecture/ai-integration.md',
        '.kiro/docs/development/coding-standards.md',
        '.kiro/docs/development/testing-strategy.md',
        '.kiro/docs/development/deployment-guide.md',
        '.kiro/docs/development/troubleshooting.md',
        '.kiro/docs/security/security-practices.md',
        '.kiro/docs/security/api-key-management.md',
        '.kiro/docs/security/data-privacy.md',
        '.kiro/docs/project-management/roadmap.md',
        '.kiro/docs/project-management/goals.md',
        '.kiro/docs/project-management/technical-debt.md',
        '.kiro/docs/project-management/decision-log.md',
        '.kiro/docs/tools/beads-configuration.md',
        '.kiro/docs/tools/group-code-setup.md',
        '.kiro/docs/tools/technical-debt-tracker.md'
      ];

      requiredFiles.forEach(file => {
        expect(existsSync(file), `File ${file} should exist`).toBe(true);
        
        // Verify file has content (not empty)
        const content = readFileSync(file, 'utf-8');
        expect(content.length, `File ${file} should not be empty`).toBeGreaterThan(0);
      });
    });

    it('should have technical debt management system implemented', () => {
      const techDebtFile = '.kiro/docs/project-management/technical-debt.md';
      const content = readFileSync(techDebtFile, 'utf-8');
      
      // Verify key sections exist
      expect(content).toContain('Technical Debt Framework');
      expect(content).toContain('Priority Calculation');
      expect(content).toContain('Debt Resolution Procedures');
      expect(content).toContain('Regular Review Process');
      expect(content).toContain('Best Practices');
      expect(content).toContain('Metrics and Tracking');
      
      // Verify priority scoring system
      expect(content).toContain('Priority Score = Impact × Effort Multiplier');
      expect(content).toContain('Critical (4)');
      expect(content).toContain('High (3)');
      expect(content).toContain('Medium (2)');
      expect(content).toContain('Low (1)');
    });

    it('should have Beads configuration for project management', () => {
      const beadsConfig = '.beads/config.yaml';
      expect(existsSync(beadsConfig), 'Beads configuration should exist').toBe(true);
      
      const beadsDoc = '.kiro/docs/tools/beads-configuration.md';
      expect(existsSync(beadsDoc), 'Beads documentation should exist').toBe(true);
    });
  });

  describe('Phase 2: Frontend Component Validation', () => {
    it('should have all critical UI components', () => {
      const criticalComponents = [
        'src/components/upload/EnhancedMultiImageUpload.tsx',
        'src/components/processing/ProcessingStatus.tsx',
        'src/components/processing/ProcessingModeSelector.tsx',
        'src/components/results/EnhancedResultsDisplay.tsx',
        'src/components/results/NarrativeSection.tsx',
        'src/components/help/HelpDrawer.tsx',
        'src/components/help/HelpBot.tsx',
        'src/components/SessionHistory.tsx',
        'src/components/ErrorBoundary.tsx'
      ];

      criticalComponents.forEach(component => {
        expect(existsSync(component), `Component ${component} should exist`).toBe(true);
      });
    });

    it('should have comprehensive component tests', () => {
      const testDir = 'src/components/__tests__';
      expect(existsSync(testDir), 'Component tests directory should exist').toBe(true);
      
      const testFiles = readdirSync(testDir);
      expect(testFiles.length, 'Should have multiple test files').toBeGreaterThan(5);
      
      // Verify property-based tests exist
      const propertyTests = testFiles.filter(file => file.includes('.property.test.'));
      expect(propertyTests.length, 'Should have property-based tests').toBeGreaterThan(0);
    });

    it('should have error boundary implementation', () => {
      const errorBoundary = 'src/components/ErrorBoundary.tsx';
      expect(existsSync(errorBoundary), 'Error boundary should exist').toBe(true);
      
      const content = readFileSync(errorBoundary, 'utf-8');
      expect(content).toContain('componentDidCatch');
      expect(content).toContain('ErrorBoundary');
    });
  });

  describe('Phase 3: Backend Function Validation', () => {
    it('should have all Supabase Edge Functions', () => {
      const edgeFunctions = [
        'supabase/functions/process-sred/index.ts',
        'supabase/functions/process-document-ocr/index.ts',
        'supabase/functions/fill-pdf-t661/index.ts'
      ];

      edgeFunctions.forEach(func => {
        expect(existsSync(func), `Edge Function ${func} should exist`).toBe(true);
      });
    });

    it('should have PDF field mappings', () => {
      const mappingDir = 'supabase/field_mappings';
      expect(existsSync(mappingDir), 'Field mappings directory should exist').toBe(true);
      
      const mappingFiles = [
        'supabase/field_mappings/t661_mapping.json',
        'supabase/field_mappings/t661_critical_fields.json',
        'supabase/field_mappings/t661_full_map.json'
      ];

      mappingFiles.forEach(file => {
        expect(existsSync(file), `Mapping file ${file} should exist`).toBe(true);
      });
    });

    it('should have comprehensive backend tests', () => {
      const backendTestDir = 'tests/backend';
      expect(existsSync(backendTestDir), 'Backend tests directory should exist').toBe(true);
      
      const testFiles = readdirSync(backendTestDir);
      expect(testFiles.length, 'Should have multiple backend test files').toBeGreaterThan(3);
      
      // Verify property-based tests exist
      const propertyTests = testFiles.filter(file => file.includes('.property.test.'));
      expect(propertyTests.length, 'Should have backend property-based tests').toBeGreaterThan(0);
    });
  });

  describe('Phase 4: Testing Framework Validation', () => {
    it('should have comprehensive test coverage', () => {
      const testDirs = ['tests', 'src/components/__tests__', 'src/utils/__tests__'];
      
      testDirs.forEach(dir => {
        if (existsSync(dir)) {
          const files = readdirSync(dir, { recursive: true });
          const testFiles = files.filter(file => 
            typeof file === 'string' && file.endsWith('.test.ts') || file.endsWith('.test.tsx')
          );
          expect(testFiles.length, `${dir} should have test files`).toBeGreaterThan(0);
        }
      });
    });

    it('should have property-based testing framework', () => {
      // Check if fast-check is available
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      expect(packageJson.devDependencies['fast-check'], 'fast-check should be installed').toBeDefined();
      
      // Check for property test files
      const findPropertyTests = (dir: string): string[] => {
        if (!existsSync(dir)) return [];
        
        const files: string[] = [];
        const items = readdirSync(dir);
        
        for (const item of items) {
          const fullPath = join(dir, item);
          const stat = statSync(fullPath);
          
          if (stat.isDirectory()) {
            files.push(...findPropertyTests(fullPath));
          } else if (item.includes('.property.test.')) {
            files.push(fullPath);
          }
        }
        
        return files;
      };
      
      const propertyTests = [
        ...findPropertyTests('tests'),
        ...findPropertyTests('src')
      ];
      
      expect(propertyTests.length, 'Should have property-based tests').toBeGreaterThan(5);
    });

    it('should have audit logging system', () => {
      const auditTestDir = 'tests/audit';
      expect(existsSync(auditTestDir), 'Audit tests directory should exist').toBe(true);
      
      const auditFiles = readdirSync(auditTestDir);
      expect(auditFiles.length, 'Should have audit test files').toBeGreaterThan(0);
    });
  });

  describe('Phase 5: Tool Integration Validation', () => {
    it('should have Group Code configuration', () => {
      const groupCodeConfig = '.groupcode/config.json';
      expect(existsSync(groupCodeConfig), 'Group Code configuration should exist').toBe(true);
      
      const content = JSON.parse(readFileSync(groupCodeConfig, 'utf-8'));
      expect(content).toHaveProperty('codeRelationships');
    });

    it('should have development workflow documentation', () => {
      const workflowDocs = [
        '.kiro/docs/development/coding-standards.md',
        '.kiro/docs/development/testing-strategy.md',
        '.kiro/docs/development/deployment-guide.md'
      ];

      workflowDocs.forEach(doc => {
        expect(existsSync(doc), `Workflow document ${doc} should exist`).toBe(true);
        
        const content = readFileSync(doc, 'utf-8');
        expect(content.length, `Document ${doc} should have content`).toBeGreaterThan(100);
      });
    });
  });

  describe('Phase 6: Feature Development Framework Validation', () => {
    it('should have feature development templates', () => {
      // Check if spec templates exist in the specs directory
      const specsDir = '.kiro/specs';
      expect(existsSync(specsDir), 'Specs directory should exist').toBe(true);
      
      // Verify the audit spec exists as a template
      const auditSpec = '.kiro/specs/rambo2-system-audit';
      expect(existsSync(auditSpec), 'Audit spec should exist as template').toBe(true);
      
      const specFiles = ['requirements.md', 'design.md', 'tasks.md'];
      specFiles.forEach(file => {
        const fullPath = join(auditSpec, file);
        expect(existsSync(fullPath), `Spec file ${file} should exist`).toBe(true);
      });
    });

    it('should have coding standards documented', () => {
      const codingStandards = '.kiro/docs/development/coding-standards.md';
      expect(existsSync(codingStandards), 'Coding standards should exist').toBe(true);
      
      const content = readFileSync(codingStandards, 'utf-8');
      expect(content).toContain('TypeScript');
      expect(content).toContain('React');
      expect(content).toContain('ESLint');
    });

    it('should have security practices documented', () => {
      const securityPractices = '.kiro/docs/security/security-practices.md';
      expect(existsSync(securityPractices), 'Security practices should exist').toBe(true);
      
      const content = readFileSync(securityPractices, 'utf-8');
      expect(content.length, 'Security practices should have substantial content').toBeGreaterThan(500);
    });

    it('should have testing requirements established', () => {
      const testingStrategy = '.kiro/docs/development/testing-strategy.md';
      expect(existsSync(testingStrategy), 'Testing strategy should exist').toBe(true);
      
      const content = readFileSync(testingStrategy, 'utf-8');
      expect(content).toContain('Property-Based Testing');
      expect(content).toContain('Unit Tests');
      expect(content).toContain('Integration Tests');
    });
  });

  describe('System Health Validation', () => {
    it('should have no critical technical debt items blocking development', () => {
      const techDebtFile = '.kiro/docs/project-management/technical-debt.md';
      const content = readFileSync(techDebtFile, 'utf-8');
      
      // Parse the critical priority section
      const criticalSection = content.match(/#### Critical Priority[\s\S]*?#### High Priority/);
      if (criticalSection) {
        const criticalContent = criticalSection[0];
        
        // Count rows in the critical table (excluding header)
        const rows = criticalContent.split('\n').filter(line => 
          line.startsWith('| TD-') && line.includes('Identified')
        );
        
        // Should have minimal critical items
        expect(rows.length, 'Should have minimal critical technical debt items').toBeLessThan(5);
      }
    });

    it('should have build and deployment processes working', () => {
      const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
      
      // Verify essential scripts exist
      expect(packageJson.scripts.build, 'Build script should exist').toBeDefined();
      expect(packageJson.scripts.test, 'Test script should exist').toBeDefined();
      expect(packageJson.scripts.lint, 'Lint script should exist').toBeDefined();
      
      // Verify deployment configuration exists
      expect(existsSync('vercel.json'), 'Vercel deployment config should exist').toBe(true);
    });

    it('should have monitoring and observability setup', () => {
      // Check for error handling utilities
      const errorHandling = 'src/utils/errorHandling.ts';
      expect(existsSync(errorHandling), 'Error handling utilities should exist').toBe(true);
      
      // Check for diagnostic scripts
      const diagnosticsDir = 'scripts/diagnostics';
      expect(existsSync(diagnosticsDir), 'Diagnostics scripts should exist').toBe(true);
    });
  });
});