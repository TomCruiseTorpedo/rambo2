import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { ErrorBoundary } from '../ErrorBoundary';
import { TextInput } from '../TextInput';
import { HelpTooltip } from '../help/HelpTooltip';

// Mock external dependencies
vi.mock('@/utils/errorHandling', () => ({
  ErrorHandler: {
    logAndClassify: vi.fn(() => ({
      type: 'component',
      severity: 'medium',
      userMessage: 'Something went wrong. Please try again.',
      recoveryOptions: []
    }))
  },
  NetworkMonitor: {
    getStatus: vi.fn(() => true),
    addListener: vi.fn(() => vi.fn()),
    init: vi.fn()
  }
}));

vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-trigger">{children}</div>
  ),
  TooltipContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="tooltip-content">{children}</div>
  )
}));

// Component that throws an error for testing
const ThrowError = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Test error');
  }
  return <div>No error</div>;
};

describe('Component Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Suppress console.error for cleaner test output
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('ErrorBoundary Integration', () => {
    it('should render children when there is no error', () => {
      render(
        <ErrorBoundary>
          <div>Test content</div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Test content')).toBeInTheDocument();
    });

    it('should catch and display error when child component throws', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
      expect(screen.getByText('Test error')).toBeInTheDocument();
    });

    it('should render custom fallback when provided', () => {
      const customFallback = <div>Custom error message</div>;
      
      render(
        <ErrorBoundary fallback={customFallback}>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      expect(screen.getByText('Custom error message')).toBeInTheDocument();
    });
  });

  describe('TextInput Integration', () => {
    it('should handle user interactions correctly', () => {
      const mockOnChange = vi.fn();
      
      render(<TextInput value="" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: 'New text' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('New text');
    });

    it('should be accessible with proper labeling', () => {
      const mockOnChange = vi.fn();
      
      render(<TextInput value="" onChange={mockOnChange} />);
      
      const textarea = screen.getByLabelText('Paste Technical Data');
      expect(textarea).toBeInTheDocument();
    });

    it('should handle disabled state correctly', () => {
      const mockOnChange = vi.fn();
      
      render(<TextInput value="" onChange={mockOnChange} disabled={true} />);
      
      const textarea = screen.getByRole('textbox');
      expect(textarea).toBeDisabled();
    });
  });

  describe('HelpTooltip Integration', () => {
    it('should render tooltip with content', () => {
      render(<HelpTooltip content="Help text" />);
      
      expect(screen.getByTestId('tooltip')).toBeInTheDocument();
      expect(screen.getByText('Help text')).toBeInTheDocument();
    });

    it('should render custom children as trigger', () => {
      render(
        <HelpTooltip content="Help text">
          <button>Custom Trigger</button>
        </HelpTooltip>
      );
      
      expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
    });

    it('should handle complex content', () => {
      const content = (
        <div>
          <strong>Bold text</strong>
          <p>Paragraph text</p>
        </div>
      );
      
      render(<HelpTooltip content={content} />);
      
      expect(screen.getByText('Bold text')).toBeInTheDocument();
      expect(screen.getByText('Paragraph text')).toBeInTheDocument();
    });
  });

  describe('Component Composition', () => {
    it('should work together in a complex layout', () => {
      const mockOnChange = vi.fn();
      
      render(
        <ErrorBoundary>
          <div>
            <TextInput value="test" onChange={mockOnChange} />
            <HelpTooltip content="This is help text">
              <button>Help</button>
            </HelpTooltip>
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByDisplayValue('test')).toBeInTheDocument();
      expect(screen.getByText('Help')).toBeInTheDocument();
      expect(screen.getByText('This is help text')).toBeInTheDocument();
    });

    it('should handle errors in composed components', () => {
      render(
        <ErrorBoundary>
          <div>
            <TextInput value="test" onChange={() => {}} />
            <ThrowError shouldThrow={true} />
          </div>
        </ErrorBoundary>
      );

      expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    });
  });

  describe('Accessibility Features', () => {
    it('should maintain accessibility in error states', () => {
      render(
        <ErrorBoundary>
          <ThrowError shouldThrow={true} />
        </ErrorBoundary>
      );

      // Error boundary should have proper ARIA attributes
      const errorAlert = screen.getByRole('alert');
      expect(errorAlert).toBeInTheDocument();
    });

    it('should provide proper form accessibility', () => {
      const mockOnChange = vi.fn();
      
      render(
        <div>
          <TextInput value="" onChange={mockOnChange} />
          <HelpTooltip content="Form help">
            <button aria-label="Get help with this form">?</button>
          </HelpTooltip>
        </div>
      );

      const textarea = screen.getByLabelText('Paste Technical Data');
      const helpButton = screen.getByLabelText('Get help with this form');
      
      expect(textarea).toBeInTheDocument();
      expect(helpButton).toBeInTheDocument();
    });
  });

  describe('Performance and Edge Cases', () => {
    it('should handle empty or null values gracefully', () => {
      const mockOnChange = vi.fn();
      
      render(<TextInput value="initial" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      fireEvent.change(textarea, { target: { value: '' } });
      
      expect(mockOnChange).toHaveBeenCalledWith('');
    });

    it('should handle special characters in content', () => {
      const specialContent = 'Special chars: <>&"\'';
      
      render(<HelpTooltip content={specialContent} />);
      
      expect(screen.getByText(specialContent)).toBeInTheDocument();
    });

    it('should handle rapid state changes', () => {
      const mockOnChange = vi.fn();
      
      render(<TextInput value="" onChange={mockOnChange} />);
      
      const textarea = screen.getByRole('textbox');
      
      // Simulate rapid typing
      fireEvent.change(textarea, { target: { value: 'a' } });
      fireEvent.change(textarea, { target: { value: 'ab' } });
      fireEvent.change(textarea, { target: { value: 'abc' } });
      
      expect(mockOnChange).toHaveBeenCalledTimes(3);
      expect(mockOnChange).toHaveBeenLastCalledWith('abc');
    });
  });
});