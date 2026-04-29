import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ErrorHandler, ErrorType, ErrorSeverity, NetworkMonitor, RetryHandler } from '../errorHandling';

describe('ErrorHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('classify', () => {
    it('should classify network errors correctly', () => {
      const error = new Error('Failed to fetch');
      const result = ErrorHandler.classify(error);
      
      expect(result.type).toBe(ErrorType.NETWORK);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.userMessage).toContain('Connection issue detected');
      expect(result.recoveryOptions).toHaveLength(2);
      expect(result.recoveryOptions[0].label).toBe('Retry');
    });

    it('should classify file upload errors correctly', () => {
      const error = new Error('File too large (5.2MB). Please compress images or upload fewer files.');
      const result = ErrorHandler.classify(error);
      
      expect(result.type).toBe(ErrorType.FILE_UPLOAD);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.userMessage).toContain('File is too large');
      expect(result.recoveryOptions.some(option => option.label === 'Compress File')).toBe(true);
    });

    it('should classify API limit errors correctly', () => {
      const error = new Error('Rate limit exceeded. Please try again in a few moments.');
      const result = ErrorHandler.classify(error);
      
      expect(result.type).toBe(ErrorType.API_LIMIT);
      expect(result.severity).toBe(ErrorSeverity.HIGH);
      expect(result.userMessage).toContain('API usage limit reached');
      expect(result.recoveryOptions[0].label).toBe('Try Again Later');
    });

    it('should classify validation errors correctly', () => {
      const error = new Error('Input is required');
      const result = ErrorHandler.classify(error);
      
      expect(result.type).toBe(ErrorType.VALIDATION);
      expect(result.severity).toBe(ErrorSeverity.LOW);
      expect(result.userMessage).toContain('Please fill in all required fields');
    });

    it('should classify unknown errors with fallback', () => {
      const error = new Error('Something unexpected happened');
      const result = ErrorHandler.classify(error);
      
      expect(result.type).toBe(ErrorType.UNKNOWN);
      expect(result.severity).toBe(ErrorSeverity.MEDIUM);
      expect(result.userMessage).toContain('An unexpected error occurred');
      expect(result.recoveryOptions[0].label).toBe('Retry');
    });

    it('should include context in error details', () => {
      const error = new Error('Test error');
      const context = { component: 'TestComponent', action: 'testAction' };
      const result = ErrorHandler.classify(error, context);
      
      expect(result.context).toEqual(context);
      expect(result.timestamp).toBeInstanceOf(Date);
    });
  });
});

describe('NetworkMonitor', () => {
  it('should initialize and track online status', () => {
    NetworkMonitor.init();
    expect(NetworkMonitor.getStatus()).toBe(navigator.onLine);
  });

  it('should add and remove listeners', () => {
    const mockCallback = vi.fn();
    const unsubscribe = NetworkMonitor.addListener(mockCallback);
    
    expect(typeof unsubscribe).toBe('function');
    unsubscribe();
  });
});

describe('RetryHandler', () => {
  it('should retry failed operations', async () => {
    let attempts = 0;
    const operation = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts < 3) {
        throw new Error('Temporary failure');
      }
      return 'success';
    });

    const result = await RetryHandler.withRetry(operation, 3, 10);
    
    expect(result).toBe('success');
    expect(operation).toHaveBeenCalledTimes(3);
  });

  it('should not retry validation errors', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Validation failed'));

    await expect(RetryHandler.withRetry(operation, 3, 10)).rejects.toThrow('Validation failed');
    expect(operation).toHaveBeenCalledTimes(1);
  });

  it('should respect max attempts', async () => {
    const operation = vi.fn().mockRejectedValue(new Error('Always fails'));

    await expect(RetryHandler.withRetry(operation, 2, 10)).rejects.toThrow('Always fails');
    expect(operation).toHaveBeenCalledTimes(2);
  });
});