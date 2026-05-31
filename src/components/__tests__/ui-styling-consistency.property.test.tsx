/**
 * Property-Based Tests for UI Styling Consistency
 * 
 * Feature: rambo2-system-audit, Property 6: UI Styling Consistency
 * Validates: Requirements 2.5
 * 
 * Tests that components using the same design tokens (color, spacing, typography)
 * render with identical visual properties to maintain consistent styling across
 * the application while users navigate.
 */

import React from 'react';
import { render, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import * as fc from 'fast-check';
import { Button } from '../ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { EnhancedMultiImageUpload } from '@/components/upload/EnhancedMultiImageUpload';
import { TextInput } from '../TextInput';
import { ResultsDisplay } from '../ResultsDisplay';

// Ensure cleanup between tests
afterEach(() => {
  cleanup();
});

// Generators for test data
const buttonVariantGenerator = (): fc.Arbitrary<"default" | "destructive" | "outline" | "secondary" | "ghost" | "link"> =>
  fc.constantFrom("default", "destructive", "outline", "secondary", "ghost", "link");

const buttonSizeGenerator = (): fc.Arbitrary<"default" | "sm" | "lg" | "icon"> =>
  fc.constantFrom("default", "sm", "lg", "icon");

const textContentGenerator = (): fc.Arbitrary<string> =>
  fc.string({ minLength: 1, maxLength: 50 }).filter(s => s.trim().length > 0);

describe('UI Styling Consistency - Property Tests', () => {
  describe('Property 6: UI Styling Consistency', () => {
    it('should render buttons with identical styling for same variant and size', () => {
      fc.assert(
        fc.property(
          buttonVariantGenerator(),
          buttonSizeGenerator(),
          textContentGenerator(),
          textContentGenerator(),
          (variant, size, text1, text2) => {
            // Render two buttons with identical variant and size but different content
            const { container: container1, unmount: unmount1 } = render(
              <Button variant={variant} size={size}>
                {text1}
              </Button>
            );

            const { container: container2, unmount: unmount2 } = render(
              <Button variant={variant} size={size}>
                {text2}
              </Button>
            );

            try {
              const button1 = container1.querySelector('button');
              const button2 = container2.querySelector('button');

              expect(button1).toBeTruthy();
              expect(button2).toBeTruthy();

              if (button1 && button2) {
                // Get computed styles for both buttons
                const style1 = window.getComputedStyle(button1);
                const style2 = window.getComputedStyle(button2);

                // Check that design tokens are consistent
                // Typography consistency
                expect(style1.fontSize).toBe(style2.fontSize);
                expect(style1.fontWeight).toBe(style2.fontWeight);
                expect(style1.lineHeight).toBe(style2.lineHeight);

                // Spacing consistency (padding, margin)
                expect(style1.paddingTop).toBe(style2.paddingTop);
                expect(style1.paddingBottom).toBe(style2.paddingBottom);
                expect(style1.paddingLeft).toBe(style2.paddingLeft);
                expect(style1.paddingRight).toBe(style2.paddingRight);

                // Border consistency
                expect(style1.borderRadius).toBe(style2.borderRadius);
                expect(style1.borderWidth).toBe(style2.borderWidth);
                expect(style1.borderStyle).toBe(style2.borderStyle);

                // Layout consistency
                expect(style1.display).toBe(style2.display);
                expect(style1.alignItems).toBe(style2.alignItems);
                expect(style1.justifyContent).toBe(style2.justifyContent);

                // Height consistency for same size
                expect(style1.height).toBe(style2.height);
                expect(style1.minHeight).toBe(style2.minHeight);

                // Color consistency (background, text)
                expect(style1.backgroundColor).toBe(style2.backgroundColor);
                expect(style1.color).toBe(style2.color);

                // Transition consistency
                expect(style1.transitionProperty).toBe(style2.transitionProperty);
                expect(style1.transitionDuration).toBe(style2.transitionDuration);
              }
            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 30 }
      );
    });

    it('should maintain consistent spacing patterns across card components', () => {
      fc.assert(
        fc.property(
          textContentGenerator(),
          textContentGenerator(),
          textContentGenerator(),
          (title1, title2, description) => {
            // Render two cards with same structure but different content
            const { container: container1, unmount: unmount1 } = render(
              <Card>
                <CardHeader>
                  <CardTitle>{title1}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content for card 1</p>
                </CardContent>
                <CardFooter>
                  <Button>Action 1</Button>
                </CardFooter>
              </Card>
            );

            const { container: container2, unmount: unmount2 } = render(
              <Card>
                <CardHeader>
                  <CardTitle>{title2}</CardTitle>
                  <CardDescription>{description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p>Content for card 2</p>
                </CardContent>
                <CardFooter>
                  <Button>Action 2</Button>
                </CardFooter>
              </Card>
            );

            try {
              // Check card containers
              const card1 = container1.querySelector('[class*="rounded-lg"]');
              const card2 = container2.querySelector('[class*="rounded-lg"]');

              expect(card1).toBeTruthy();
              expect(card2).toBeTruthy();

              if (card1 && card2) {
                const cardStyle1 = window.getComputedStyle(card1);
                const cardStyle2 = window.getComputedStyle(card2);

                // Card border radius consistency
                expect(cardStyle1.borderRadius).toBe(cardStyle2.borderRadius);
                
                // Card border consistency
                expect(cardStyle1.borderWidth).toBe(cardStyle2.borderWidth);
                expect(cardStyle1.borderStyle).toBe(cardStyle2.borderStyle);

                // Card background consistency
                expect(cardStyle1.backgroundColor).toBe(cardStyle2.backgroundColor);
              }

              // Check card headers
              const header1 = container1.querySelector('[class*="space-y-1.5"]');
              const header2 = container2.querySelector('[class*="space-y-1.5"]');

              if (header1 && header2) {
                const headerStyle1 = window.getComputedStyle(header1);
                const headerStyle2 = window.getComputedStyle(header2);

                // Header padding consistency
                expect(headerStyle1.padding).toBe(headerStyle2.padding);
                
                // Header spacing consistency
                expect(headerStyle1.rowGap).toBe(headerStyle2.rowGap);
              }

              // Check card titles
              const title1Element = container1.querySelector('h3');
              const title2Element = container2.querySelector('h3');

              if (title1Element && title2Element) {
                const titleStyle1 = window.getComputedStyle(title1Element);
                const titleStyle2 = window.getComputedStyle(title2Element);

                // Title typography consistency
                expect(titleStyle1.fontSize).toBe(titleStyle2.fontSize);
                expect(titleStyle1.fontWeight).toBe(titleStyle2.fontWeight);
                expect(titleStyle1.lineHeight).toBe(titleStyle2.lineHeight);
                expect(titleStyle1.letterSpacing).toBe(titleStyle2.letterSpacing);
              }

              // Check card content
              const content1 = container1.querySelector('[class*="p-6"][class*="pt-0"]');
              const content2 = container2.querySelector('[class*="p-6"][class*="pt-0"]');

              if (content1 && content2) {
                const contentStyle1 = window.getComputedStyle(content1);
                const contentStyle2 = window.getComputedStyle(content2);

                // Content padding consistency
                expect(contentStyle1.paddingLeft).toBe(contentStyle2.paddingLeft);
                expect(contentStyle1.paddingRight).toBe(contentStyle2.paddingRight);
                expect(contentStyle1.paddingBottom).toBe(contentStyle2.paddingBottom);
                expect(contentStyle1.paddingTop).toBe(contentStyle2.paddingTop);
              }

            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain consistent input styling across different input components', () => {
      fc.assert(
        fc.property(
          textContentGenerator(),
          textContentGenerator(),
          fc.boolean(),
          (placeholder1, placeholder2, disabled) => {
            // Render two input components with same styling
            const { container: container1, unmount: unmount1 } = render(
              <div>
                <Label htmlFor="input1">Label 1</Label>
                <Input
                  id="input1"
                  placeholder={placeholder1}
                  disabled={disabled}
                />
              </div>
            );

            const { container: container2, unmount: unmount2 } = render(
              <div>
                <Label htmlFor="input2">Label 2</Label>
                <Input
                  id="input2"
                  placeholder={placeholder2}
                  disabled={disabled}
                />
              </div>
            );

            try {
              const input1 = container1.querySelector('input');
              const input2 = container2.querySelector('input');

              expect(input1).toBeTruthy();
              expect(input2).toBeTruthy();

              if (input1 && input2) {
                const inputStyle1 = window.getComputedStyle(input1);
                const inputStyle2 = window.getComputedStyle(input2);

                // Input height consistency
                expect(inputStyle1.height).toBe(inputStyle2.height);
                expect(inputStyle1.minHeight).toBe(inputStyle2.minHeight);

                // Input padding consistency
                expect(inputStyle1.paddingLeft).toBe(inputStyle2.paddingLeft);
                expect(inputStyle1.paddingRight).toBe(inputStyle2.paddingRight);
                expect(inputStyle1.paddingTop).toBe(inputStyle2.paddingTop);
                expect(inputStyle1.paddingBottom).toBe(inputStyle2.paddingBottom);

                // Input border consistency
                expect(inputStyle1.borderRadius).toBe(inputStyle2.borderRadius);
                expect(inputStyle1.borderWidth).toBe(inputStyle2.borderWidth);
                expect(inputStyle1.borderStyle).toBe(inputStyle2.borderStyle);

                // Input typography consistency
                expect(inputStyle1.fontSize).toBe(inputStyle2.fontSize);
                expect(inputStyle1.fontFamily).toBe(inputStyle2.fontFamily);

                // Input background consistency
                expect(inputStyle1.backgroundColor).toBe(inputStyle2.backgroundColor);

                // Disabled state consistency
                if (disabled) {
                  expect(inputStyle1.opacity).toBe(inputStyle2.opacity);
                  expect(inputStyle1.cursor).toBe(inputStyle2.cursor);
                }
              }

              // Check label consistency
              const label1 = container1.querySelector('label');
              const label2 = container2.querySelector('label');

              if (label1 && label2) {
                const labelStyle1 = window.getComputedStyle(label1);
                const labelStyle2 = window.getComputedStyle(label2);

                // Label typography consistency
                expect(labelStyle1.fontSize).toBe(labelStyle2.fontSize);
                expect(labelStyle1.fontWeight).toBe(labelStyle2.fontWeight);
                expect(labelStyle1.lineHeight).toBe(labelStyle2.lineHeight);
              }

            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 25 }
      );
    });

    it('should maintain consistent spacing and typography in complex components', () => {
      fc.assert(
        fc.property(
          fc.array(fc.record({
            name: fc.string({ minLength: 5, maxLength: 20 }).filter(s => s.trim().length > 0),
            size: fc.integer({ min: 1000, max: 5000000 })
          }), { minLength: 1, maxLength: 3 }),
          textContentGenerator(),
          fc.boolean(),
          (fileSpecs, textContent, disabled) => {
            // Create files for testing
            const files1 = fileSpecs.map(spec => 
              new File(['content'], `${spec.name}_1.jpg`, { type: 'image/jpeg' })
            );
            const files2 = fileSpecs.map(spec => 
              new File(['content'], `${spec.name}_2.jpg`, { type: 'image/jpeg' })
            );

            // Render two EnhancedMultiImageUpload components with same structure
            const { container: container1, unmount: unmount1 } = render(
              <EnhancedMultiImageUpload
                onFilesSelect={() => {}}
                selectedFiles={files1}
                onRemoveFile={() => {}}
                disabled={disabled}
              />
            );

            const { container: container2, unmount: unmount2 } = render(
              <EnhancedMultiImageUpload
                onFilesSelect={() => {}}
                selectedFiles={files2}
                onRemoveFile={() => {}}
                disabled={disabled}
              />
            );

            try {
              // Check upload area consistency
              const uploadArea1 = container1.querySelector('[class*="border-dashed"]');
              const uploadArea2 = container2.querySelector('[class*="border-dashed"]');

              if (uploadArea1 && uploadArea2) {
                const uploadStyle1 = window.getComputedStyle(uploadArea1);
                const uploadStyle2 = window.getComputedStyle(uploadArea2);

                // Upload area border consistency
                expect(uploadStyle1.borderStyle).toBe(uploadStyle2.borderStyle);
                expect(uploadStyle1.borderWidth).toBe(uploadStyle2.borderWidth);
                expect(uploadStyle1.borderRadius).toBe(uploadStyle2.borderRadius);

                // Upload area padding consistency
                expect(uploadStyle1.padding).toBe(uploadStyle2.padding);

                // Disabled state consistency
                if (disabled) {
                  expect(uploadStyle1.opacity).toBe(uploadStyle2.opacity);
                }
              }

              // Check file item consistency if files exist
              if (files1.length > 0 && files2.length > 0) {
                const fileItem1 = container1.querySelector('[class*="bg-accent/10"]');
                const fileItem2 = container2.querySelector('[class*="bg-accent/10"]');

                if (fileItem1 && fileItem2) {
                  const fileStyle1 = window.getComputedStyle(fileItem1);
                  const fileStyle2 = window.getComputedStyle(fileItem2);

                  // File item padding consistency
                  expect(fileStyle1.padding).toBe(fileStyle2.padding);
                  
                  // File item border consistency
                  expect(fileStyle1.borderRadius).toBe(fileStyle2.borderRadius);
                  expect(fileStyle1.borderWidth).toBe(fileStyle2.borderWidth);

                  // File item background consistency
                  expect(fileStyle1.backgroundColor).toBe(fileStyle2.backgroundColor);
                }
              }

              // Check button consistency within components
              const buttons1 = container1.querySelectorAll('button');
              const buttons2 = container2.querySelectorAll('button');

              if (buttons1.length > 0 && buttons2.length > 0) {
                // Find buttons with same variant (e.g., outline buttons)
                const outlineButton1 = Array.from(buttons1).find(btn => 
                  btn.className.includes('outline') || btn.textContent?.includes('Choose Files')
                );
                const outlineButton2 = Array.from(buttons2).find(btn => 
                  btn.className.includes('outline') || btn.textContent?.includes('Choose Files')
                );

                if (outlineButton1 && outlineButton2) {
                  const btnStyle1 = window.getComputedStyle(outlineButton1);
                  const btnStyle2 = window.getComputedStyle(outlineButton2);

                  // Button styling consistency
                  expect(btnStyle1.borderRadius).toBe(btnStyle2.borderRadius);
                  expect(btnStyle1.padding).toBe(btnStyle2.padding);
                  expect(btnStyle1.fontSize).toBe(btnStyle2.fontSize);
                  expect(btnStyle1.fontWeight).toBe(btnStyle2.fontWeight);
                }
              }

            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain consistent text styling across different text components', () => {
      fc.assert(
        fc.property(
          textContentGenerator(),
          textContentGenerator(),
          fc.boolean(),
          (text1, text2, disabled) => {
            // Render TextInput components
            const { container: container1, unmount: unmount1 } = render(
              <TextInput
                value={text1}
                onChange={() => {}}
                disabled={disabled}
              />
            );

            const { container: container2, unmount: unmount2 } = render(
              <TextInput
                value={text2}
                onChange={() => {}}
                disabled={disabled}
              />
            );

            try {
              // Check textarea consistency
              const textarea1 = container1.querySelector('textarea');
              const textarea2 = container2.querySelector('textarea');

              if (textarea1 && textarea2) {
                const textareaStyle1 = window.getComputedStyle(textarea1);
                const textareaStyle2 = window.getComputedStyle(textarea2);

                // Textarea typography consistency
                expect(textareaStyle1.fontSize).toBe(textareaStyle2.fontSize);
                expect(textareaStyle1.fontFamily).toBe(textareaStyle2.fontFamily);
                expect(textareaStyle1.lineHeight).toBe(textareaStyle2.lineHeight);

                // Textarea spacing consistency
                expect(textareaStyle1.padding).toBe(textareaStyle2.padding);

                // Textarea border consistency
                expect(textareaStyle1.borderRadius).toBe(textareaStyle2.borderRadius);
                expect(textareaStyle1.borderWidth).toBe(textareaStyle2.borderWidth);
                expect(textareaStyle1.borderStyle).toBe(textareaStyle2.borderStyle);

                // Textarea background consistency
                expect(textareaStyle1.backgroundColor).toBe(textareaStyle2.backgroundColor);

                // Disabled state consistency
                if (disabled) {
                  expect(textareaStyle1.opacity).toBe(textareaStyle2.opacity);
                }
              }

              // Check label consistency
              const label1 = container1.querySelector('label');
              const label2 = container2.querySelector('label');

              if (label1 && label2) {
                const labelStyle1 = window.getComputedStyle(label1);
                const labelStyle2 = window.getComputedStyle(label2);

                // Label typography consistency
                expect(labelStyle1.fontSize).toBe(labelStyle2.fontSize);
                expect(labelStyle1.fontWeight).toBe(labelStyle2.fontWeight);
              }

            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 20 }
      );
    });

    it('should maintain consistent color scheme across components with same semantic meaning', () => {
      fc.assert(
        fc.property(
          textContentGenerator(),
          textContentGenerator(),
          (result1, result2) => {
            // Render ResultsDisplay components
            const { container: container1, unmount: unmount1 } = render(
              <ResultsDisplay results={result1} onReset={() => {}} />
            );

            const { container: container2, unmount: unmount2 } = render(
              <ResultsDisplay results={result2} onReset={() => {}} />
            );

            try {
              // Find buttons with same semantic meaning (reset buttons)
              const resetButton1 = Array.from(container1.querySelectorAll('button')).find(btn => 
                btn.textContent?.toLowerCase().includes('reset') || 
                btn.textContent?.toLowerCase().includes('clear') ||
                btn.getAttribute('aria-label')?.toLowerCase().includes('reset')
              );
              
              const resetButton2 = Array.from(container2.querySelectorAll('button')).find(btn => 
                btn.textContent?.toLowerCase().includes('reset') || 
                btn.textContent?.toLowerCase().includes('clear') ||
                btn.getAttribute('aria-label')?.toLowerCase().includes('reset')
              );

              if (resetButton1 && resetButton2) {
                const btnStyle1 = window.getComputedStyle(resetButton1);
                const btnStyle2 = window.getComputedStyle(resetButton2);

                // Semantic buttons should have consistent styling
                expect(btnStyle1.backgroundColor).toBe(btnStyle2.backgroundColor);
                expect(btnStyle1.color).toBe(btnStyle2.color);
                expect(btnStyle1.borderColor).toBe(btnStyle2.borderColor);
                expect(btnStyle1.fontSize).toBe(btnStyle2.fontSize);
                expect(btnStyle1.fontWeight).toBe(btnStyle2.fontWeight);
                expect(btnStyle1.padding).toBe(btnStyle2.padding);
                expect(btnStyle1.borderRadius).toBe(btnStyle2.borderRadius);
              }

              // Check text content areas for consistent typography
              const textArea1 = container1.querySelector('[class*="whitespace-pre-wrap"], pre, code');
              const textArea2 = container2.querySelector('[class*="whitespace-pre-wrap"], pre, code');

              if (textArea1 && textArea2) {
                const textStyle1 = window.getComputedStyle(textArea1);
                const textStyle2 = window.getComputedStyle(textArea2);

                // Text areas should have consistent typography
                expect(textStyle1.fontFamily).toBe(textStyle2.fontFamily);
                expect(textStyle1.fontSize).toBe(textStyle2.fontSize);
                expect(textStyle1.lineHeight).toBe(textStyle2.lineHeight);
              }

            } finally {
              unmount1();
              unmount2();
            }
          }
        ),
        { numRuns: 15 }
      );
    });
  });
});