import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { HelpTooltip } from '../help/HelpTooltip';

// Mock the Tooltip components
vi.mock('@/components/ui/tooltip', () => ({
  Tooltip: ({ children }: { children: React.ReactNode }) => <div data-testid="tooltip">{children}</div>,
  TooltipTrigger: ({ children, asChild }: { children: React.ReactNode; asChild?: boolean }) => (
    <div data-testid="tooltip-trigger" data-as-child={asChild}>{children}</div>
  ),
  TooltipContent: ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div data-testid="tooltip-content" className={className}>{children}</div>
  )
}));

describe('HelpTooltip', () => {
  it('should render with default help icon when no children provided', () => {
    render(<HelpTooltip content="Help text" />);
    
    expect(screen.getByTestId('tooltip')).toBeInTheDocument();
    expect(screen.getByTestId('tooltip-trigger')).toBeInTheDocument();
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('should render tooltip content', () => {
    render(<HelpTooltip content="This is help text" />);
    
    expect(screen.getByText('This is help text')).toBeInTheDocument();
  });

  it('should render custom children as trigger', () => {
    render(
      <HelpTooltip content="Help text">
        <button>Custom Trigger</button>
      </HelpTooltip>
    );
    
    expect(screen.getByText('Custom Trigger')).toBeInTheDocument();
  });

  it('should render ReactNode content', () => {
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

  it('should have correct CSS classes on tooltip content', () => {
    render(<HelpTooltip content="Help text" />);
    
    const tooltipContent = screen.getByTestId('tooltip-content');
    expect(tooltipContent).toHaveClass('max-w-sm');
  });

  it('should have correct button styling for default trigger', () => {
    render(<HelpTooltip content="Help text" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass(
      'inline-flex',
      'items-center',
      'text-muted-foreground',
      'hover:text-foreground',
      'transition-colors'
    );
  });

  it('should use asChild prop on TooltipTrigger when children provided', () => {
    render(
      <HelpTooltip content="Help text">
        <button>Custom</button>
      </HelpTooltip>
    );
    
    const trigger = screen.getByTestId('tooltip-trigger');
    expect(trigger).toHaveAttribute('data-as-child', 'true');
  });

  it('should handle complex content with multiple elements', () => {
    const complexContent = (
      <div>
        <h3>Title</h3>
        <ul>
          <li>Item 1</li>
          <li>Item 2</li>
        </ul>
        <p>Description</p>
      </div>
    );
    
    render(<HelpTooltip content={complexContent} />);
    
    expect(screen.getByText('Title')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
    expect(screen.getByText('Item 2')).toBeInTheDocument();
    expect(screen.getByText('Description')).toBeInTheDocument();
  });

  it('should handle string content', () => {
    render(<HelpTooltip content="Simple string content" />);
    
    expect(screen.getByText('Simple string content')).toBeInTheDocument();
  });

  it('should render help icon in default trigger', () => {
    render(<HelpTooltip content="Help text" />);
    
    // The HelpCircle icon should be rendered (though we can't easily test Lucide icons directly)
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
  });
});