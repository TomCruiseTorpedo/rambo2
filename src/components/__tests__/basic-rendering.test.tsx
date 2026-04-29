import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { MultiImageUpload } from '../MultiImageUpload';

describe('Basic Component Rendering', () => {
  it('should render MultiImageUpload without crashing', () => {
    const mockOnFilesSelect = vi.fn();
    const mockOnRemoveFile = vi.fn();
    const mockOnProcessModeChange = vi.fn();

    render(
      <MultiImageUpload
        onFilesSelect={mockOnFilesSelect}
        selectedFiles={[]}
        onRemoveFile={mockOnRemoveFile}
        processMode="combined"
        onProcessModeChange={mockOnProcessModeChange}
      />
    );

    expect(screen.getByText('Upload Document Image(s)')).toBeInTheDocument();
  });
});