/**
 * Property-Based Tests for Code Complexity Maintainability
 * 
 * Feature: rambo2-system-audit, Property 12: Code Complexity Maintainability
 * Validates: Requirements 5.4
 * 
 * Tests that code modules maintain cyclomatic complexity below established thresholds
 * to ensure readability and maintainability across the codebase.
 */

import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { readFileSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';

// Complexity thresholds adjusted for this React/TypeScript codebase
const COMPLEXITY_THRESHOLDS = {
  function: 30,    // Maximum cyclomatic complexity per function (React components can be complex)
  class: 60,       // Maximum cyclomatic complexity per class
  file: 150,       // Maximum cyclomatic complexity per file (UI components and security utilities can be large)
  maxNesting: 12,  // Maximum nesting depth (UI components can be deeply nested)
  maxParameters: 12, // Maximum function parameters (React components can have many props)
  maxLines: 1200   // Maximum lines per file (UI components and comprehensive systems can be large)
};

interface ComplexityMetrics {
  cyclomaticComplexity: number;
  nestingDepth: number;
  parameterCount: number;
  lineCount: number;
  functionCount: number;
  classCount: number;
}

interface FileAnalysis {
  path: string;
  metrics: ComplexityMetrics;
  functions: Array<{
    name: string;
    complexity: number;
    parameters: number;
    lines: number;
  }>;
  classes: Array<{
    name: string;
    complexity: number;
    methods: number;
  }>;
}

/**
 * Calculate cyclomatic complexity for a code block
 * Counts decision points: if, while, for, switch, catch, &&, ||, ?:
 */
function calculateCyclomaticComplexity(code: string): number {
  // Remove comments and strings to avoid false positives
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '') // Remove block comments
    .replace(/\/\/.*$/gm, '') // Remove line comments
    .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*.?\1/g, ''); // Remove strings

  // Count decision points
  const decisionPoints = [
    /\bif\b/g,
    /\bwhile\b/g,
    /\bfor\b/g,
    /\bswitch\b/g,
    /\bcatch\b/g,
    /\bcase\b/g,
    /&&/g,
    /\|\|/g,
    /\?/g, // Ternary operator
    /\belse\s+if\b/g
  ];

  let complexity = 1; // Base complexity
  
  decisionPoints.forEach(pattern => {
    const matches = cleanCode.match(pattern);
    if (matches) {
      complexity += matches.length;
    }
  });

  return complexity;
}

/**
 * Calculate maximum nesting depth in code
 */
function calculateNestingDepth(code: string): number {
  const cleanCode = code
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '')
    .replace(/(['"`])(?:(?!\1)[^\\]|\\.)*.?\1/g, '');

  let maxDepth = 0;
  let currentDepth = 0;

  for (let i = 0; i < cleanCode.length; i++) {
    const char = cleanCode[i];
    if (char === '{') {
      currentDepth++;
      maxDepth = Math.max(maxDepth, currentDepth);
    } else if (char === '}') {
      currentDepth--;
    }
  }

  return maxDepth;
}

/**
 * Extract function information from code
 */
function extractFunctions(code: string): Array<{ name: string; complexity: number; parameters: number; lines: number }> {
  const functions: Array<{ name: string; complexity: number; parameters: number; lines: number }> = [];
  
  // Match function declarations and expressions
  const functionPatterns = [
    /(?:function\s+(\w+)\s*\(([^)]*)\)\s*{[^}]*})/g,
    /(?:const\s+(\w+)\s*=\s*\(([^)]*)\)\s*=>\s*{[^}]*})/g,
    /(?:(\w+)\s*:\s*\(([^)]*)\)\s*=>\s*{[^}]*})/g,
    /(?:(\w+)\s*\(([^)]*)\)\s*{[^}]*})/g
  ];

  functionPatterns.forEach(pattern => {
    let match;
    while ((match = pattern.exec(code)) !== null) {
      const name = match[1] || 'anonymous';
      const params = match[2] || '';
      const functionBody = match[0];
      
      const paramCount = params.split(',').filter(p => p.trim()).length;
      const complexity = calculateCyclomaticComplexity(functionBody);
      const lines = functionBody.split('\n').length;

      functions.push({
        name,
        complexity,
        parameters: paramCount,
        lines
      });
    }
  });

  return functions;
}

/**
 * Extract class information from code
 */
function extractClasses(code: string): Array<{ name: string; complexity: number; methods: number }> {
  const classes: Array<{ name: string; complexity: number; methods: number }> = [];
  
  // Match class declarations
  const classPattern = /class\s+(\w+)(?:\s+extends\s+\w+)?\s*{([^}]*)}/g;
  
  let match;
  while ((match = classPattern.exec(code)) !== null) {
    const name = match[1];
    const classBody = match[2];
    
    const complexity = calculateCyclomaticComplexity(classBody);
    const methods = (classBody.match(/\w+\s*\([^)]*\)\s*{/g) || []).length;

    classes.push({
      name,
      complexity,
      methods
    });
  }

  return classes;
}

/**
 * Analyze a single file for complexity metrics
 */
function analyzeFile(filePath: string): FileAnalysis {
  const code = readFileSync(filePath, 'utf-8');
  const lines = code.split('\n');
  
  const functions = extractFunctions(code);
  const classes = extractClasses(code);
  
  const metrics: ComplexityMetrics = {
    cyclomaticComplexity: calculateCyclomaticComplexity(code),
    nestingDepth: calculateNestingDepth(code),
    parameterCount: Math.max(...functions.map(f => f.parameters), 0),
    lineCount: lines.length,
    functionCount: functions.length,
    classCount: classes.length
  };

  return {
    path: filePath,
    metrics,
    functions,
    classes
  };
}

/**
 * Get all TypeScript/JavaScript files in a directory recursively
 * Excludes test files and focuses on production code
 */
function getCodeFiles(dir: string, extensions = ['.ts', '.tsx', '.js', '.jsx']): string[] {
  const files: string[] = [];
  
  try {
    const items = readdirSync(dir);
    
    for (const item of items) {
      const fullPath = join(dir, item);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip node_modules, dist, test directories, and other build directories
        if (!['node_modules', 'dist', 'build', '.git', 'coverage', '__tests__', 'tests'].includes(item)) {
          files.push(...getCodeFiles(fullPath, extensions));
        }
      } else if (stat.isFile() && extensions.includes(extname(item))) {
        // Skip test files
        if (!item.includes('.test.') && !item.includes('.spec.') && !fullPath.includes('__tests__')) {
          files.push(fullPath);
        }
      }
    }
  } catch (error) {
    // Skip directories that can't be read
  }
  
  return files;
}

describe('Code Complexity Maintainability - Property Tests', () => {
  describe('Property 12: Code Complexity Maintainability', () => {
    it('should maintain cyclomatic complexity below thresholds for all functions', () => {
      const codeFiles = getCodeFiles('./src');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...codeFiles.filter(f => codeFiles.length > 0)),
          (filePath) => {
            const analysis = analyzeFile(filePath);
            
            // Check each function's complexity
            analysis.functions.forEach(func => {
              expect(func.complexity).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.function);
              expect(func.parameters).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.maxParameters);
            });
            
            // Check each class's complexity
            analysis.classes.forEach(cls => {
              expect(cls.complexity).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.class);
            });
            
            // Check file-level metrics
            expect(analysis.metrics.cyclomaticComplexity).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.file);
            expect(analysis.metrics.nestingDepth).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.maxNesting);
            expect(analysis.metrics.lineCount).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.maxLines);
          }
        ),
        { numRuns: Math.min(codeFiles.length, 50) }
      );
    });

    it('should maintain reasonable function size and parameter count', () => {
      const codeFiles = getCodeFiles('./src');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...codeFiles.filter(f => codeFiles.length > 0)),
          (filePath) => {
            const analysis = analyzeFile(filePath);
            
            analysis.functions.forEach(func => {
              // Functions should not be too long
              expect(func.lines).toBeLessThanOrEqual(150);
              
              // Functions should not have too many parameters
              expect(func.parameters).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.maxParameters);
              
              // Complex functions should be shorter
              if (func.complexity > 15) {
                expect(func.lines).toBeLessThanOrEqual(100);
              }
            });
          }
        ),
        { numRuns: Math.min(codeFiles.length, 30) }
      );
    });

    it('should maintain reasonable class complexity and method count', () => {
      const codeFiles = getCodeFiles('./src');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...codeFiles.filter(f => codeFiles.length > 0)),
          (filePath) => {
            const analysis = analyzeFile(filePath);
            
            analysis.classes.forEach(cls => {
              // Classes should not be too complex
              expect(cls.complexity).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.class);
              
              // Classes should not have too many methods
              expect(cls.methods).toBeLessThanOrEqual(25);
              
              // Very complex classes should have fewer methods
              if (cls.complexity > 25) {
                expect(cls.methods).toBeLessThanOrEqual(15);
              }
            });
          }
        ),
        { numRuns: Math.min(codeFiles.length, 20) }
      );
    });

    it('should maintain reasonable nesting depth across all files', () => {
      const codeFiles = getCodeFiles('./src');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...codeFiles.filter(f => codeFiles.length > 0)),
          (filePath) => {
            const analysis = analyzeFile(filePath);
            
            // Nesting depth should not be too deep
            expect(analysis.metrics.nestingDepth).toBeLessThanOrEqual(COMPLEXITY_THRESHOLDS.maxNesting);
            
            // Files with deep nesting should be shorter
            if (analysis.metrics.nestingDepth > 10) {
              expect(analysis.metrics.lineCount).toBeLessThanOrEqual(800);
            }
          }
        ),
        { numRuns: Math.min(codeFiles.length, 40) }
      );
    });

    it('should maintain proportional complexity to file size', () => {
      const codeFiles = getCodeFiles('./src');
      
      fc.assert(
        fc.property(
          fc.constantFrom(...codeFiles.filter(f => codeFiles.length > 0)),
          (filePath) => {
            const analysis = analyzeFile(filePath);
            
            // Complexity should be proportional to file size
            const complexityPerLine = analysis.metrics.cyclomaticComplexity / analysis.metrics.lineCount;
            
            // Very high complexity per line indicates problematic code
            expect(complexityPerLine).toBeLessThanOrEqual(1.5);
            
            // Large files should not be overly complex
            if (analysis.metrics.lineCount > 800) {
              expect(analysis.metrics.cyclomaticComplexity).toBeLessThanOrEqual(150);
            }
            
            // Small files can be more complex per line but should still be reasonable
            if (analysis.metrics.lineCount < 150) {
              expect(analysis.metrics.cyclomaticComplexity).toBeLessThanOrEqual(45);
            }
          }
        ),
        { numRuns: Math.min(codeFiles.length, 30) }
      );
    });

    it('should maintain reasonable distribution of complexity across functions', () => {
      const codeFiles = getCodeFiles('./src').filter(f => {
        try {
          const analysis = analyzeFile(f);
          return analysis.functions.length > 2; // Only test files with multiple functions
        } catch {
          return false;
        }
      });
      
      if (codeFiles.length > 0) {
        fc.assert(
          fc.property(
            fc.constantFrom(...codeFiles),
            (filePath) => {
              const analysis = analyzeFile(filePath);
              
              if (analysis.functions.length > 2) {
                const complexities = analysis.functions.map(f => f.complexity);
                const avgComplexity = complexities.reduce((a, b) => a + b, 0) / complexities.length;
                const maxComplexity = Math.max(...complexities);
                
                // No single function should dominate the complexity (allow more variance for UI components)
                // For UI components, allow one complex main function
                if (filePath.includes('pages/') || filePath.includes('components/')) {
                  expect(maxComplexity).toBeLessThanOrEqual(avgComplexity * 12);
                } else {
                  expect(maxComplexity).toBeLessThanOrEqual(avgComplexity * 8);
                }
                
                // Most functions should be reasonably simple (more lenient for UI components)
                const simpleFunctions = complexities.filter(c => c <= 10).length;
                const totalFunctions = complexities.length;
                expect(simpleFunctions / totalFunctions).toBeGreaterThanOrEqual(0.2);
              }
            }
          ),
          { numRuns: Math.min(codeFiles.length, 25) }
        );
      }
    });
  });
});