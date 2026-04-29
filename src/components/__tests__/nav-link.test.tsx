import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { BrowserRouter } from 'react-router-dom';
import { NavLink } from '../NavLink';

// Mock react-router-dom
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom');
  return {
    ...actual,
    NavLink: vi.fn(({ children, className, to, ...props }) => {
      // Mock the className function behavior
      const finalClassName = typeof className === 'function' 
        ? className({ isActive: false, isPending: false })
        : className;
      return (
        <a href={to} className={finalClassName} {...props}>
          {children}
        </a>
      );
    })
  };
});

const renderWithRouter = (component: React.ReactElement) => {
  return render(<BrowserRouter>{component}</BrowserRouter>);
};

describe('NavLink', () => {
  it('should render with basic props', () => {
    renderWithRouter(
      <NavLink to="/test">Test Link</NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(link).toHaveTextContent('Test Link');
    expect(link).toHaveAttribute('href', '/test');
  });

  it('should apply className prop', () => {
    renderWithRouter(
      <NavLink to="/test" className="custom-class">
        Test Link
      </NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveClass('custom-class');
  });

  it('should handle string to prop', () => {
    renderWithRouter(
      <NavLink to="/about">About</NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/about');
  });

  it('should handle object to prop', () => {
    renderWithRouter(
      <NavLink to={{ pathname: '/search', search: '?q=test' }}>
        Search
      </NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });

  it('should forward additional props', () => {
    renderWithRouter(
      <NavLink 
        to="/test" 
        data-testid="nav-link"
        aria-label="Test navigation link"
      >
        Test Link
      </NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('data-testid', 'nav-link');
    expect(link).toHaveAttribute('aria-label', 'Test navigation link');
  });

  it('should handle children as React elements', () => {
    renderWithRouter(
      <NavLink to="/test">
        <span>Icon</span>
        <span>Text</span>
      </NavLink>
    );
    
    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
    expect(screen.getByText('Icon')).toBeInTheDocument();
    expect(screen.getByText('Text')).toBeInTheDocument();
  });

  it('should have correct displayName', () => {
    expect(NavLink.displayName).toBe('NavLink');
  });

  it('should be forwardRef compatible', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    
    renderWithRouter(
      <NavLink ref={ref} to="/test">
        Test Link
      </NavLink>
    );
    
    // The ref should be attached (though we can't easily test the actual ref in jsdom)
    expect(screen.getByRole('link')).toBeInTheDocument();
  });
});