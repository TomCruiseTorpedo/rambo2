import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { EnhancedMultiImageUpload } from '@/components/upload/EnhancedMultiImageUpload';

describe('Basic Component Rendering', () => {
  it('should render EnhancedMultiImageUpload without crashing', () => {
    const mockOnFilesSelect = vi.fn();
    const mockOnRemoveFile = vi.fn();

    render(
      <EnhancedMultiImageUpload
        onFilesSelect={mockOnFilesSelect}
        selectedFiles={[]}
        onRemoveFile={mockOnRemoveFile}
      />
    );

    expect(screen.getByText('Upload Files')).toBeInTheDocument();
  });
});
