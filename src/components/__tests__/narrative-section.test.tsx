import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NarrativeSection } from '../results/NarrativeSection';

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn()
  }
}));

// Mock clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn()
  }
});

describe('NarrativeSection', () => {
  const defaultProps = {
    title: 'Test Section',
    lineNumber: '1.1',
    content: 'This is test content for the narrative section.',
    onContentChange: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.clearAllTimers();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should render with basic props', () => {
    render(<NarrativeSection {...defaultProps} />);
    
    expect(screen.getByText('Test Section')).toBeInTheDocument();
    expect(screen.getByText('Line 1.1')).toBeInTheDocument();
    expect(screen.getByText('This is test content for the narrative section.')).toBeInTheDocument();
  });

  it('should display word count correctly', () => {
    render(<NarrativeSection {...defaultProps} />);
    
    // "This is test content for the narrative section." = 8 words
    expect(screen.getByText('8 words')).toBeInTheDocument();
  });

  it('should display confidence score when provided', () => {
    render(<NarrativeSection {...defaultProps} confidenceScore={85} />);
    
    expect(screen.getByText('85% confidence')).toBeInTheDocument();
  });

  it('should apply correct confidence score colors', () => {
    const { rerender } = render(<NarrativeSection {...defaultProps} confidenceScore={85} />);
    
    let badge = screen.getByText('85% confidence');
    expect(badge).toHaveClass('bg-green-500/10');
    
    rerender(<NarrativeSection {...defaultProps} confidenceScore={65} />);
    badge = screen.getByText('65% confidence');
    expect(badge).toHaveClass('bg-yellow-500/10');
    
    rerender(<NarrativeSection {...defaultProps} confidenceScore={45} />);
    badge = screen.getByText('45% confidence');
    expect(badge).toHaveClass('bg-red-500/10');
  });

  it('should display highlights when provided', () => {
    const highlights = [
      { text: 'Strong point', type: 'strong' as const },
      { text: 'Weak point', type: 'weak' as const },
      { text: 'Missing info', type: 'missing' as const }
    ];
    
    render(<NarrativeSection {...defaultProps} highlights={highlights} />);
    
    expect(screen.getByText('💡 Strong point')).toBeInTheDocument();
    expect(screen.getByText('⚠️ Weak point')).toBeInTheDocument();
    expect(screen.getByText('❌ Missing info')).toBeInTheDocument();
  });

  it('should toggle collapse/expand when header is clicked', () => {
    render(<NarrativeSection {...defaultProps} />);
    
    const trigger = screen.getAllByRole('button')[0]; // Get the collapsible trigger
    
    // Should be open by default
    expect(screen.getByText('This is test content for the narrative section.')).toBeInTheDocument();
    
    // Click to collapse
    fireEvent.click(trigger);
    
    // Content should be hidden (though we can't easily test CSS display with jsdom)
    // We can test that the chevron rotates
    const chevron = screen.getByRole('button').querySelector('svg');
    expect(chevron).toHaveClass('-rotate-90');
  });

  it('should enter edit mode when edit button is clicked', () => {
    render(<NarrativeSection {...defaultProps} />);
    
    const editButton = screen.getByRole('button', { name: /edit/i });
    fireEvent.click(editButton);
    
    expect(screen.getByRole('textbox')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save changes/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('should save changes when save button is clicked', () => {
    const mockOnContentChange = vi.fn();
    render(<NarrativeSection {...defaultProps} onContentChange={mockOnContentChange} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    // Edit content
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    
    // Save changes
    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));
    
    expect(mockOnContentChange).toHaveBeenCalledWith('Updated content');
  });

  it('should cancel editing when cancel button is clicked', () => {
    render(<NarrativeSection {...defaultProps} />);
    
    // Enter edit mode
    fireEvent.click(screen.getByRole('button', { name: /edit/i }));
    
    // Edit content
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'Updated content' } });
    
    // Cancel changes
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    
    // Should return to view mode with original content
    expect(screen.getByText('This is test content for the narrative section.')).toBeInTheDocument();
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
  });

  it('should copy content to clipboard when copy button is clicked', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;
    
    render(<NarrativeSection {...defaultProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    expect(mockWriteText).toHaveBeenCalledWith('This is test content for the narrative section.');
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should show copied state temporarily after successful copy', async () => {
    const mockWriteText = vi.fn().mockResolvedValue(undefined);
    navigator.clipboard.writeText = mockWriteText;
    
    render(<NarrativeSection {...defaultProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    }, { timeout: 5000 });
    
    // Fast-forward 2 seconds
    vi.advanceTimersByTime(2000);
    
    await waitFor(() => {
      expect(screen.getByText('Copy')).toBeInTheDocument();
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    }, { timeout: 5000 });
  });

  it('should handle copy failure gracefully', async () => {
    const mockWriteText = vi.fn().mockRejectedValue(new Error('Copy failed'));
    navigator.clipboard.writeText = mockWriteText;
    
    render(<NarrativeSection {...defaultProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    await waitFor(() => {
      expect(mockWriteText).toHaveBeenCalled();
    }, { timeout: 5000 });
  });

  it('should disable copy button while copying', () => {
    const mockWriteText = vi.fn(() => new Promise(resolve => setTimeout(resolve, 1000)));
    navigator.clipboard.writeText = mockWriteText;
    
    render(<NarrativeSection {...defaultProps} />);
    
    const copyButton = screen.getByRole('button', { name: /copy/i });
    fireEvent.click(copyButton);
    
    expect(copyButton).toBeDisabled();
    expect(screen.getByText('Copying...')).toBeInTheDocument();
  });

  it('should handle empty content gracefully', () => {
    render(<NarrativeSection {...defaultProps} content="" />);
    
    expect(screen.getByText(/0 words/)).toBeInTheDocument();
  });

  it('should handle content with only whitespace', () => {
    render(<NarrativeSection {...defaultProps} content="   \n\t   " />);
    
    expect(screen.getByText(/1 words/)).toBeInTheDocument(); // Whitespace is counted as 1 word by split
  });

  it('should preserve whitespace in content display', () => {
    const contentWithWhitespace = 'Line 1\n\nLine 2\n  Indented line';
    render(<NarrativeSection {...defaultProps} content={contentWithWhitespace} />);
    
    const contentElement = screen.getByText(/Line 1/);
    expect(contentElement).toHaveClass('whitespace-pre-wrap');
  });
});