import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { TextInput } from '../TextInput';

describe('TextInput', () => {
  it('should render with correct label and placeholder', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    expect(screen.getByLabelText('Paste Technical Data')).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Example:/)).toBeInTheDocument();
  });

  it('should display the provided value', () => {
    const mockOnChange = vi.fn();
    const testValue = 'Test technical data';
    
    render(<TextInput value={testValue} onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue(testValue);
  });

  it('should call onChange when text is entered', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New text' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('New text');
  });

  it('should be disabled when disabled prop is true', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} disabled={true} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toBeDisabled();
  });

  it('should not be disabled when disabled prop is false or undefined', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} disabled={false} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toBeDisabled();
  });

  it('should have correct accessibility attributes', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    const label = screen.getByText('Paste Technical Data');
    
    expect(textarea).toHaveAttribute('id', 'text-input');
    expect(label).toHaveAttribute('for', 'text-input');
  });

  it('should have correct styling classes', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveClass('min-h-[300px]', 'resize-none', 'text-sm', 'font-mono');
  });

  it('should handle multiline text input', () => {
    const mockOnChange = vi.fn();
    const multilineText = 'Line 1\nLine 2\nLine 3';
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: multilineText } });
    
    expect(mockOnChange).toHaveBeenCalledWith(multilineText);
  });

  it('should handle empty string input', () => {
    const mockOnChange = vi.fn();
    
    render(<TextInput value="Some text" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });
    
    expect(mockOnChange).toHaveBeenCalledWith('');
  });

  it('should handle special characters and formatting', () => {
    const mockOnChange = vi.fn();
    const specialText = 'feat(parser): Fix "quotes" & <tags> [brackets] {braces}';
    
    render(<TextInput value="" onChange={mockOnChange} />);
    
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: specialText } });
    
    expect(mockOnChange).toHaveBeenCalledWith(specialText);
  });
});