/**
 * Property-Based Tests for Documentation Cross-References
 * 
 * **Feature: rambo2-system-audit, Property 1: Documentation Cross-Reference Validity**
 * **Validates: Requirements 1.2**
 * 
 * This test suite validates that all cross-references in documentation files
 * resolve to existing files with valid paths, ensuring documentation integrity.
 */

import { describe, it, expect, beforeAll } from 'vitest';
import { readdir, readFile, stat } from 'fs/promises';
import { join, resolve, relative, dirname } from 'path';
import { existsSync } from 'fs';

interface DocumentationFile {
  path: string;
  content: string;
  relativePath: string;
}

interface CrossReference {
  sourceFile: string;
  targetPath: string;
  linkText: string;
  lineNumber: number;
  isValid: boolean;
  resolvedPath?: string;
}

class DocumentationCrossReferenceValidator {
  private docsRoot: string;
  private projectRoot: string;
  private documentationFiles: DocumentationFile[] = [];

  constructor(docsRoot: string = '.kiro/docs', projectRoot: string = '.') {
    this.docsRoot = resolve(projectRoot, docsRoot);
    this.projectRoot = resolve(projectRoot);
  }

  /**
   * Recursively find all markdown files in the documentation directory
   */
  async findDocumentationFiles(): Promise<DocumentationFile[]> {
    const files: DocumentationFile[] = [];
    
    const scanDirectory = async (dir: string): Promise<void> => {
      try {
        const entries = await readdir(dir, { withFileTypes: true });
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name);
          
          if (entry.isDirectory()) {
            await scanDirectory(fullPath);
          } else if (entry.isFile() && entry.name.endsWith('.md')) {
            const content = await readFile(fullPath, 'utf-8');
            const relativePath = relative(this.docsRoot, fullPath);
            
            files.push({
              path: fullPath,
              content,
              relativePath
            });
          }
        }
      } catch (error) {
        // Directory might not exist yet, which is fine for testing
        if ((error as any).code !== 'ENOENT') {
          throw error;
        }
      }
    };

    await scanDirectory(this.docsRoot);
    this.documentationFiles = files;
    return files;
  }

  /**
   * Extract all markdown links from a file's content
   */
  extractCrossReferences(file: DocumentationFile): CrossReference[] {
    const references: CrossReference[] = [];
    const lines = file.content.split('\n');
    
    // Regex patterns for different types of links
    const patterns = [
      // Standard markdown links: [text](path) - must have both text and parentheses
      /\[([^\]]+)\]\(([^)]+)\)/g,
      // Reference-style links: [text]: path - must start at beginning of line, have space after colon, and not contain dots (to avoid TypeScript)
      /^\s*\[([^\].]+)\]:\s+([^\s].*)$/gm,
      // HTML links: <a href="path">text</a>
      /<a\s+href=["']([^"']+)["'][^>]*>([^<]*)<\/a>/g
    ];

    lines.forEach((line, index) => {
      patterns.forEach(pattern => {
        let match;
        const regex = new RegExp(pattern.source, pattern.flags);
        
        while ((match = regex.exec(line)) !== null) {
          let linkText: string;
          let targetPath: string;
          
          // Handle different match groups based on pattern
          if (pattern.source.includes('href=')) {
            // HTML link: href comes first, then text
            [, targetPath, linkText] = match;
          } else {
            // Markdown link: text comes first, then path
            [, linkText, targetPath] = match;
          }
          
          // Skip external links (http/https), anchors (#), and mailto links
          // Also skip if targetPath is empty or just whitespace
          if (targetPath && 
              targetPath.trim().length > 0 &&
              !targetPath.startsWith('http://') && 
              !targetPath.startsWith('https://') &&
              !targetPath.startsWith('mailto:') &&
              !targetPath.startsWith('#')) {
            
            references.push({
              sourceFile: file.relativePath,
              targetPath: targetPath.trim(),
              linkText: linkText?.trim() || '',
              lineNumber: index + 1,
              isValid: false // Will be validated later
            });
          }
        }
      });
    });

    return references;
  }

  /**
   * Validate a cross-reference by checking if the target file exists
   */
  validateCrossReference(reference: CrossReference, sourceFile: DocumentationFile): CrossReference {
    const sourceDir = dirname(sourceFile.path);
    let resolvedPath: string;

    // Handle different path types
    if (reference.targetPath.startsWith('./') || reference.targetPath.startsWith('../')) {
      // Relative path from source file
      resolvedPath = resolve(sourceDir, reference.targetPath);
    } else if (reference.targetPath.startsWith('/')) {
      // Absolute path from project root
      resolvedPath = resolve(this.projectRoot, reference.targetPath.substring(1));
    } else {
      // Relative path from source file (no ./ prefix)
      resolvedPath = resolve(sourceDir, reference.targetPath);
    }

    // Check if file exists
    const isValid = existsSync(resolvedPath);

    return {
      ...reference,
      isValid,
      resolvedPath
    };
  }

  /**
   * Validate all cross-references in all documentation files
   */
  async validateAllCrossReferences(): Promise<CrossReference[]> {
    await this.findDocumentationFiles();
    const allReferences: CrossReference[] = [];

    for (const file of this.documentationFiles) {
      const references = this.extractCrossReferences(file);
      
      for (const reference of references) {
        const validatedReference = this.validateCrossReference(reference, file);
        allReferences.push(validatedReference);
      }
    }

    return allReferences;
  }

  /**
   * Get summary statistics for cross-reference validation
   */
  getCrossReferenceSummary(references: CrossReference[]) {
    const total = references.length;
    const valid = references.filter(ref => ref.isValid).length;
    const invalid = total - valid;
    
    const invalidReferences = references.filter(ref => !ref.isValid);
    const filesCovered = new Set(references.map(ref => ref.sourceFile)).size;

    return {
      total,
      valid,
      invalid,
      validPercentage: total > 0 ? (valid / total) * 100 : 100,
      filesCovered,
      invalidReferences
    };
  }
}

describe('Documentation Cross-Reference Validation', () => {
  let validator: DocumentationCrossReferenceValidator;
  let allReferences: CrossReference[];

  beforeAll(async () => {
    validator = new DocumentationCrossReferenceValidator();
    allReferences = await validator.validateAllCrossReferences();
  });

  /**
   * **Property 1: Documentation Cross-Reference Validity**
   * For any documentation file in the Documentation_Framework, 
   * all cross-references to other documentation files should resolve 
   * to existing files with valid paths.
   */
  it('should have all cross-references resolve to existing files', () => {
    const summary = validator.getCrossReferenceSummary(allReferences);
    
    // Log summary for debugging
    console.log('Cross-Reference Validation Summary:', {
      totalReferences: summary.total,
      validReferences: summary.valid,
      invalidReferences: summary.invalid,
      validPercentage: summary.validPercentage.toFixed(2) + '%',
      filesCovered: summary.filesCovered
    });

    // Log invalid references for debugging
    if (summary.invalidReferences.length > 0) {
      console.log('Invalid References Found:');
      summary.invalidReferences.forEach(ref => {
        console.log(`  - ${ref.sourceFile}:${ref.lineNumber} -> "${ref.targetPath}" (${ref.linkText})`);
      });
    }

    // Property assertion: All cross-references must be valid
    expect(summary.invalid).toBe(0);
    expect(summary.validPercentage).toBe(100);
  });

  it('should have cross-references in multiple documentation files', () => {
    const summary = validator.getCrossReferenceSummary(allReferences);
    
    // Ensure we're actually testing cross-references across multiple files
    expect(summary.filesCovered).toBeGreaterThan(1);
    expect(summary.total).toBeGreaterThan(0);
  });

  it('should validate relative path resolution correctly', () => {
    const relativeReferences = allReferences.filter(ref => 
      ref.targetPath.startsWith('./') || ref.targetPath.startsWith('../')
    );

    // All relative references should resolve correctly
    relativeReferences.forEach(ref => {
      expect(ref.isValid).toBe(true);
      expect(ref.resolvedPath).toBeDefined();
    });
  });

  it('should validate absolute path resolution correctly', () => {
    const absoluteReferences = allReferences.filter(ref => 
      ref.targetPath.startsWith('/')
    );

    // All absolute references should resolve correctly
    absoluteReferences.forEach(ref => {
      expect(ref.isValid).toBe(true);
      expect(ref.resolvedPath).toBeDefined();
    });
  });

  it('should handle different link formats consistently', () => {
    const linkFormats = {
      markdown: allReferences.filter(ref => ref.linkText && ref.targetPath),
      html: allReferences.filter(ref => ref.targetPath.includes('.html')),
      reference: allReferences.filter(ref => ref.linkText.includes(':'))
    };

    // All link formats should be validated consistently
    Object.entries(linkFormats).forEach(([format, refs]) => {
      if (refs.length > 0) {
        const validCount = refs.filter(ref => ref.isValid).length;
        const validPercentage = (validCount / refs.length) * 100;
        
        console.log(`${format} links: ${validCount}/${refs.length} valid (${validPercentage.toFixed(1)}%)`);
        
        // Each format should have high validity
        expect(validPercentage).toBeGreaterThanOrEqual(90);
      }
    });
  });

  describe('Cross-Reference Quality Checks', () => {
    it('should not have broken internal links', () => {
      const internalReferences = allReferences.filter(ref => 
        !ref.targetPath.startsWith('http') && 
        !ref.targetPath.startsWith('mailto:') &&
        !ref.targetPath.startsWith('#')
      );

      const brokenLinks = internalReferences.filter(ref => !ref.isValid);
      
      if (brokenLinks.length > 0) {
        console.log('Broken internal links found:');
        brokenLinks.forEach(link => {
          console.log(`  ${link.sourceFile}:${link.lineNumber} -> ${link.targetPath}`);
        });
      }

      expect(brokenLinks).toHaveLength(0);
    });

    it('should have meaningful link text', () => {
      const referencesWithText = allReferences.filter(ref => ref.linkText);
      
      referencesWithText.forEach(ref => {
        // Link text should not be empty or just the path
        expect(ref.linkText.length).toBeGreaterThan(0);
        expect(ref.linkText).not.toBe(ref.targetPath);
        
        // Link text should not be generic
        const genericTexts = ['click here', 'here', 'link', 'read more'];
        expect(genericTexts).not.toContain(ref.linkText.toLowerCase());
      });
    });

    it('should have consistent path formats', () => {
      const pathFormats = {
        relative: allReferences.filter(ref => ref.targetPath.startsWith('./')),
        parentRelative: allReferences.filter(ref => ref.targetPath.startsWith('../')),
        absolute: allReferences.filter(ref => ref.targetPath.startsWith('/')),
        implicit: allReferences.filter(ref => 
          !ref.targetPath.startsWith('./') && 
          !ref.targetPath.startsWith('../') && 
          !ref.targetPath.startsWith('/') &&
          !ref.targetPath.startsWith('http')
        )
      };

      // Log path format distribution
      console.log('Path format distribution:');
      Object.entries(pathFormats).forEach(([format, refs]) => {
        console.log(`  ${format}: ${refs.length} references`);
      });

      // All path formats should be valid when used
      Object.entries(pathFormats).forEach(([format, refs]) => {
        if (refs.length > 0) {
          const validCount = refs.filter(ref => ref.isValid).length;
          expect(validCount).toBe(refs.length);
        }
      });
    });
  });

  describe('Documentation Structure Validation', () => {
    it('should have cross-references between architecture documents', () => {
      const architectureFiles = allReferences.filter(ref => 
        ref.sourceFile.includes('architecture/') || 
        ref.targetPath.includes('architecture/')
      );

      // Architecture documents should reference each other
      expect(architectureFiles.length).toBeGreaterThan(0);
    });

    it('should have cross-references between development documents', () => {
      const developmentFiles = allReferences.filter(ref => 
        ref.sourceFile.includes('development/') || 
        ref.targetPath.includes('development/')
      );

      // Development documents should reference each other
      expect(developmentFiles.length).toBeGreaterThan(0);
    });

    it('should have cross-references to related documents', () => {
      // Check for "Related:" sections at the end of documents
      const filesWithRelated = validator['documentationFiles'].filter(file => 
        file.content.includes('*Related:')
      );

      expect(filesWithRelated.length).toBeGreaterThan(0);

      // Validate that related document links are valid
      filesWithRelated.forEach(file => {
        const relatedSection = file.content.match(/\*Related:.*$/m);
        if (relatedSection) {
          const relatedLinks = validator.extractCrossReferences({
            ...file,
            content: relatedSection[0]
          });

          relatedLinks.forEach(link => {
            const validated = validator.validateCrossReference(link, file);
            expect(validated.isValid).toBe(true);
          });
        }
      });
    });
  });
});

// Export for use in other tests
export { DocumentationCrossReferenceValidator, type CrossReference, type DocumentationFile };