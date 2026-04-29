import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { MultiImageUpload } from '@/components/MultiImageUpload';
import { EnhancedMultiImageUpload } from '@/components/upload/EnhancedMultiImageUpload';
import { SessionHistory } from '@/components/SessionHistory';
import { HelpDrawer } from '@/components/help/HelpDrawer';

describe('Accessibility Improvements', () => {
  it('should have proper ARIA labels and roles in MultiImageUpload', () => {
    const mockProps = {
      onFilesSelect: () => {},
      selectedFiles: [],
      onRemoveFile: () => {},
      processMode: 'combined' as const,
      onProcessModeChange: () => {},
    };

    render(<MultiImageUpload {...mockProps} />);
    
    // Check for proper ARIA labels on upload area
    const uploadArea = screen.getByRole('button', { name: /upload image files/i });
    expect(uploadArea).toHaveAttribute('aria-label');
    expect(uploadArea).toHaveAttribute('aria-describedby');
    
    // Check for proper input labeling
    const fileInput = screen.getByLabelText(/select image files/i);
    expect(fileInput).toBeInTheDocument();
  });

  it('should have proper ARIA labels in EnhancedMultiImageUpload', () => {
    const mockProps = {
      onFilesSelect: () => {},
      selectedFiles: [],
      onRemoveFile: () => {},
    };

    render(<EnhancedMultiImageUpload {...mockProps} />);
    
    // Check for proper ARIA labels
    const uploadButton = screen.getByRole('button');
    expect(uploadButton).toHaveAttribute('aria-label');
    expect(uploadButton).toHaveAttribute('aria-describedby');
  });

  it('should have proper semantic structure in SessionHistory', () => {
    const mockHistory = [
      {
        id: '1',
        timestamp: '2024-01-01 10:00:00',
        output: 'Test narrative content',
        inputCount: 1,
      },
    ];

    render(<SessionHistory history={mockHistory} onClear={() => {}} />);
    
    // Check for proper heading structure
    expect(screen.getByRole('heading', { level: 2 })).toBeInTheDocument();
    
    // Check for proper button labeling
    const clearButton = screen.getByRole('button', { name: /clear all/i });
    expect(clearButton).toHaveAttribute('aria-label');
    
    // Check for proper time element
    expect(screen.getByRole('time')).toBeInTheDocument();
  });

  it('should have proper ARIA attributes in HelpDrawer', () => {
    render(<HelpDrawer />);
    
    // Check for proper button labeling
    const helpButton = screen.getByRole('button');
    expect(helpButton).toHaveAttribute('aria-describedby');
  });

  it('should have proper focus management attributes', () => {
    const mockProps = {
      onFilesSelect: () => {},
      selectedFiles: [],
      onRemoveFile: () => {},
      processMode: 'combined' as const,
      onProcessModeChange: () => {},
    };

    render(<MultiImageUpload {...mockProps} />);
    
    // Check for proper tabIndex on upload area
    const uploadArea = screen.getByRole('button', { name: /upload image files/i });
    expect(uploadArea).toHaveAttribute('tabIndex', '0');
  });

  it('should provide screen reader friendly content', () => {
    const mockHistory = [
      {
        id: '1',
        timestamp: '2024-01-01 10:00:00',
        output: 'Test narrative content that is longer than 500 characters to test truncation behavior and ensure that screen readers get proper indication of truncated content with appropriate aria labels and semantic markup for better accessibility',
        inputCount: 2,
      },
    ];

    render(<SessionHistory history={mockHistory} onClear={() => {}} />);
    
    // Check for aria-live regions
    expect(screen.getByText(/1 narrative generated/)).toHaveAttribute('aria-live', 'polite');
    
    // Check for proper labeling of interactive elements
    const downloadButton = screen.getByRole('button', { name: /download narrative 1/i });
    expect(downloadButton).toBeInTheDocument();
  });
});