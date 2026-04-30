import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { WizardFlow } from '../wizard/WizardFlow';

// Mock the toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn()
  })
}));

// Mock child components
vi.mock('@/components/TextInput', () => ({
  TextInput: ({ value, onChange }: { value: string; onChange: (value: string) => void }) => (
    <textarea 
      data-testid="text-input"
      value={value} 
      onChange={(e) => onChange(e.target.value)}
      placeholder="Text input"
    />
  )
}));

vi.mock('@/components/upload/EnhancedMultiImageUpload', () => ({
  EnhancedMultiImageUpload: ({ onFilesSelect, selectedFiles, onRemoveFile }: any) => (
    <div data-testid="file-upload">
      <button onClick={() => onFilesSelect([new File(['test'], 'test.png', { type: 'image/png' })])}>
        Upload File
      </button>
      <div>Files: {selectedFiles.length}</div>
      {selectedFiles.map((_: any, index: number) => (
        <button key={index} onClick={() => onRemoveFile(index)}>
          Remove {index}
        </button>
      ))}
    </div>
  )
}));

vi.mock('@/components/processing/ProcessingModeSelector', () => ({
  ProcessingModeSelector: ({ value, onChange }: { value: string; onChange: (mode: any) => void }) => (
    <div data-testid="processing-mode-selector">
      <button onClick={() => onChange('combined')}>Combined</button>
      <button onClick={() => onChange('separate')}>Separate</button>
      <div>Current: {value}</div>
    </div>
  )
}));

// Mock UI components that might cause issues
vi.mock('@/components/ui/progress', () => ({
  Progress: ({ value, className, ...props }: any) => (
    <div role="progressbar" aria-valuenow={value} className={className} {...props} />
  )
}));

describe('WizardFlow', () => {
  const defaultProps = {
    textInput: '',
    onTextInputChange: vi.fn(),
    selectedFiles: [],
    onFilesSelect: vi.fn(),
    onRemoveFile: vi.fn(),
    processMode: 'combined' as const,
    onProcessModeChange: vi.fn(),
    onGenerate: vi.fn(),
    isProcessing: false
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render step 1 initially', () => {
    render(<WizardFlow {...defaultProps} />);
    
    expect(screen.getByText('Step 1: Gather Evidence')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 2')).toBeInTheDocument();
  });

  it('should show correct progress for step 1', () => {
    render(<WizardFlow {...defaultProps} />);
    
    const progressBar = screen.getByRole('progressbar');
    expect(progressBar).toHaveAttribute('aria-valuenow', '50'); // 1/2 * 100 = 50%
  });

  it('should disable continue button when no input is provided', () => {
    render(<WizardFlow {...defaultProps} />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).toBeDisabled();
  });

  it('should enable continue button when text input is provided', () => {
    render(<WizardFlow {...defaultProps} textInput="Some text" />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('should enable continue button when files are selected', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} selectedFiles={files} />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    expect(continueButton).not.toBeDisabled();
  });

  it('should show 3 steps when multiple inputs are provided', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} textInput="Some text" selectedFiles={files} />);
    
    expect(screen.getByText('Step 1 of 3')).toBeInTheDocument();
  });

  it('should navigate to step 2 when continue is clicked with multiple inputs', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} textInput="Some text" selectedFiles={files} />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Step 2: Configure Processing')).toBeInTheDocument();
  });

  it('should skip to step 3 when continue is clicked with single input', () => {
    render(<WizardFlow {...defaultProps} textInput="Some text" />);
    
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    expect(screen.getByText('Step 2: Review & Generate')).toBeInTheDocument();
  });

  it('should show processing mode selector in step 2', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} textInput="Some text" selectedFiles={files} />);
    
    // Navigate to step 2
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    expect(screen.getByTestId('processing-mode-selector')).toBeInTheDocument();
  });

  it('should allow navigation back from step 2', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} textInput="Some text" selectedFiles={files} />);
    
    // Navigate to step 2
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Navigate back
    const backButton = screen.getByRole('button', { name: /back/i });
    fireEvent.click(backButton);
    
    expect(screen.getByText('Step 1: Gather Evidence')).toBeInTheDocument();
  });

  it('should show generate button in final step', () => {
    render(<WizardFlow {...defaultProps} textInput="Some text" />);
    
    // Navigate to final step
    const continueButton = screen.getByRole('button', { name: /continue/i });
    fireEvent.click(continueButton);
    
    expect(screen.getByRole('button', { name: /generate narrative/i })).toBeInTheDocument();
  });

  it('should call onGenerate when generate button is clicked', () => {
    const mockOnGenerate = vi.fn();
    render(<WizardFlow {...defaultProps} textInput="Some text" onGenerate={mockOnGenerate} />);
    
    // Navigate to final step
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    // Click generate
    const generateButton = screen.getByRole('button', { name: /generate narrative/i });
    fireEvent.click(generateButton);
    
    expect(mockOnGenerate).toHaveBeenCalled();
  });

  it('should show processing state when isProcessing is true', () => {
    render(<WizardFlow {...defaultProps} textInput="Some text" isProcessing={true} />);
    
    // Navigate to final step
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    expect(screen.getByRole('button', { name: /processing/i })).toBeDisabled();
  });

  it('should handle demo files generation', async () => {
    const mockOnFilesSelect = vi.fn();
    render(<WizardFlow {...defaultProps} onFilesSelect={mockOnFilesSelect} />);
    
    // Mock canvas and blob creation
    const mockCanvas = {
      width: 0,
      height: 0,
      getContext: vi.fn(() => ({
        fillStyle: '',
        fillRect: vi.fn(),
        font: '',
        fillText: vi.fn()
      })),
      toBlob: vi.fn((callback) => callback(new Blob(['test'], { type: 'image/png' })))
    };
    
    const origCreate = document.createElement.bind(document);
    const createSpy = vi
      .spyOn(document, 'createElement')
      .mockImplementation((tagName: string, options?: any) =>
        tagName === 'canvas' ? (mockCanvas as any) : origCreate(tagName, options)
      );

    try {
      const demoButton = screen.getByRole('button', { name: /generate demo files/i });
      fireEvent.click(demoButton);

      await waitFor(() => {
        expect(mockOnFilesSelect).toHaveBeenCalledWith(
          expect.arrayContaining([
            expect.objectContaining({ name: 'experimental-log-table.png' }),
            expect.objectContaining({ name: 'prototype-iterations-table.png' })
          ])
        );
      });
    } finally {
      createSpy.mockRestore();
    }
  });

  it('should show correct input summary in final step', () => {
    const files = [new File(['test'], 'test.png', { type: 'image/png' })];
    render(<WizardFlow {...defaultProps} textInput="Some text" selectedFiles={files} />);
    
    // Navigate to final step
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    fireEvent.click(screen.getByRole('button', { name: /continue/i }));
    
    expect(screen.getByText(/1 file\(s\) \+ text data/)).toBeInTheDocument();
  });

  it('should have proper accessibility attributes', () => {
    render(<WizardFlow {...defaultProps} />);

    expect(
      screen.getByRole('region', { name: /Generate SR&ED Narrative/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-label');
    expect(screen.getByRole('tablist')).toHaveAttribute('aria-label');
  });

  it('should handle tab navigation between input methods', async () => {
    const user = userEvent.setup();
    render(<WizardFlow {...defaultProps} />);

    await user.click(screen.getByRole('tab', { name: /text input/i }));
    await waitFor(() => {
      expect(screen.getByTestId('text-input')).toBeInTheDocument();
    });

    await user.click(screen.getByRole('tab', { name: /file upload/i }));
    await waitFor(() => {
      expect(screen.getByTestId('file-upload')).toBeInTheDocument();
    });
  });
});