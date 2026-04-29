/**
 * Enhanced error handling utilities for the Rambo2 application
 * Provides centralized error classification, recovery options, and user-friendly messaging
 */

export enum ErrorType {
  NETWORK = 'network',
  VALIDATION = 'validation',
  PROCESSING = 'processing',
  FILE_UPLOAD = 'file_upload',
  API_LIMIT = 'api_limit',
  AUTHENTICATION = 'authentication',
  UNKNOWN = 'unknown'
}

export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface ErrorDetails {
  type: ErrorType;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  recoveryOptions: RecoveryOption[];
  technicalDetails?: string;
  timestamp: Date;
  context?: Record<string, any>;
}

export interface RecoveryOption {
  label: string;
  action: () => void | Promise<void>;
  isPrimary?: boolean;
  icon?: string;
}

/**
 * Classifies errors and provides appropriate user messaging and recovery options
 */
export class ErrorHandler {
  static classify(error: Error | string, context?: Record<string, any>): ErrorDetails {
    const errorMessage = typeof error === 'string' ? error : error.message;
    const timestamp = new Date();

    // Network errors
    if (this.isNetworkError(errorMessage)) {
      return {
        type: ErrorType.NETWORK,
        severity: ErrorSeverity.MEDIUM,
        message: errorMessage,
        userMessage: 'Connection issue detected. Please check your internet connection.',
        recoveryOptions: [
          {
            label: 'Retry',
            action: () => window.location.reload(),
            isPrimary: true,
            icon: 'RefreshCw'
          },
          {
            label: 'Check Connection',
            action: () => this.checkNetworkStatus(),
            icon: 'Wifi'
          }
        ],
        technicalDetails: typeof error === 'object' ? error.stack : undefined,
        timestamp,
        context
      };
    }

    // File upload errors
    if (this.isFileUploadError(errorMessage)) {
      return {
        type: ErrorType.FILE_UPLOAD,
        severity: ErrorSeverity.MEDIUM,
        message: errorMessage,
        userMessage: this.getFileUploadUserMessage(errorMessage),
        recoveryOptions: this.getFileUploadRecoveryOptions(errorMessage),
        timestamp,
        context
      };
    }

    // API limit errors
    if (this.isApiLimitError(errorMessage)) {
      return {
        type: ErrorType.API_LIMIT,
        severity: ErrorSeverity.HIGH,
        message: errorMessage,
        userMessage: 'API usage limit reached. Please wait or upgrade your plan.',
        recoveryOptions: [
          {
            label: 'Try Again Later',
            action: () => {},
            isPrimary: true,
            icon: 'Clock'
          },
          {
            label: 'Check Usage',
            action: () => this.openUsageSettings(),
            icon: 'Settings'
          }
        ],
        timestamp,
        context
      };
    }

    // Processing errors
    if (this.isProcessingError(errorMessage)) {
      return {
        type: ErrorType.PROCESSING,
        severity: ErrorSeverity.MEDIUM,
        message: errorMessage,
        userMessage: 'Processing failed. This might be due to file complexity or temporary issues.',
        recoveryOptions: [
          {
            label: 'Try Again',
            action: () => {},
            isPrimary: true,
            icon: 'RefreshCw'
          },
          {
            label: 'Use Smaller Files',
            action: () => {},
            icon: 'FileDown'
          }
        ],
        timestamp,
        context
      };
    }

    // Validation errors
    if (this.isValidationError(errorMessage)) {
      return {
        type: ErrorType.VALIDATION,
        severity: ErrorSeverity.LOW,
        message: errorMessage,
        userMessage: this.getValidationUserMessage(errorMessage),
        recoveryOptions: [
          {
            label: 'Fix Input',
            action: () => {},
            isPrimary: true,
            icon: 'Edit'
          }
        ],
        timestamp,
        context
      };
    }

    // Unknown errors
    return {
      type: ErrorType.UNKNOWN,
      severity: ErrorSeverity.MEDIUM,
      message: errorMessage,
      userMessage: 'An unexpected error occurred. Please try again or contact support if the issue persists.',
      recoveryOptions: [
        {
          label: 'Retry',
          action: () => window.location.reload(),
          isPrimary: true,
          icon: 'RefreshCw'
        },
        {
          label: 'Report Issue',
          action: () => this.reportIssue(error, context),
          icon: 'MessageSquare'
        }
      ],
      technicalDetails: typeof error === 'object' ? error.stack : undefined,
      timestamp,
      context
    };
  }

  private static isNetworkError(message: string): boolean {
    const networkKeywords = [
      'Failed to fetch',
      'NetworkError',
      'network error',
      'connection',
      'timeout',
      'offline',
      'ERR_NETWORK',
      'ERR_INTERNET_DISCONNECTED'
    ];
    return networkKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isFileUploadError(message: string): boolean {
    const fileKeywords = [
      'file size',
      'file type',
      'upload',
      'too large',
      'exceeds',
      'unsupported format',
      'empty file',
      'compression failed'
    ];
    return fileKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isApiLimitError(message: string): boolean {
    const limitKeywords = [
      'rate limit',
      'quota exceeded',
      'credits',
      '429',
      '402',
      'usage limit',
      'billing'
    ];
    return limitKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isProcessingError(message: string): boolean {
    const processingKeywords = [
      'processing failed',
      'analysis error',
      'generation failed',
      'OCR error',
      'AI error',
      'model error'
    ];
    return processingKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static isValidationError(message: string): boolean {
    const validationKeywords = [
      'required',
      'invalid',
      'must be',
      'should be',
      'validation',
      'format'
    ];
    return validationKeywords.some(keyword => 
      message.toLowerCase().includes(keyword.toLowerCase())
    );
  }

  private static getFileUploadUserMessage(message: string): string {
    if (message.includes('too large') || message.includes('exceeds')) {
      return 'File is too large. Please compress the file or use a smaller one.';
    }
    if (message.includes('unsupported format')) {
      return 'File format not supported. Please use images, PDF, Excel, Word, or text files.';
    }
    if (message.includes('empty')) {
      return 'File appears to be empty. Please select a valid file.';
    }
    if (message.includes('compression failed')) {
      return 'Failed to process the image. Please try a different image or format.';
    }
    return 'File upload failed. Please check the file and try again.';
  }

  private static getFileUploadRecoveryOptions(message: string): RecoveryOption[] {
    const options: RecoveryOption[] = [
      {
        label: 'Try Different File',
        action: () => {},
        isPrimary: true,
        icon: 'Upload'
      }
    ];

    if (message.includes('too large')) {
      options.push({
        label: 'Compress File',
        action: () => this.showCompressionTips(),
        icon: 'FileDown'
      });
    }

    if (message.includes('unsupported format')) {
      options.push({
        label: 'View Supported Formats',
        action: () => this.showSupportedFormats(),
        icon: 'Info'
      });
    }

    return options;
  }

  private static getValidationUserMessage(message: string): string {
    if (message.includes('required')) {
      return 'Please fill in all required fields.';
    }
    if (message.includes('invalid')) {
      return 'Please check your input and correct any errors.';
    }
    return 'Please review your input and make necessary corrections.';
  }

  private static async checkNetworkStatus(): Promise<void> {
    try {
      await fetch('/api/health', { method: 'HEAD' });
      alert('Network connection appears to be working. Please try again.');
    } catch {
      alert('Network connection issue detected. Please check your internet connection.');
    }
  }

  private static openUsageSettings(): void {
    // In a real app, this would navigate to usage settings
    console.log('Opening usage settings...');
  }

  private static showCompressionTips(): void {
    const tips = `
File Compression Tips:
• Use online tools like TinyPNG or Squoosh
• Reduce image resolution to 1920x1080 or lower
• Convert to JPEG format for photos
• Use PNG only for images with transparency
    `.trim();
    alert(tips);
  }

  private static showSupportedFormats(): void {
    const formats = `
Supported File Formats:
• Images: JPG, PNG, GIF, WebP, BMP
• Documents: PDF, Word (.docx)
• Spreadsheets: Excel (.xlsx, .xls), CSV
• Text: TXT, Markdown (.md), Log files
    `.trim();
    alert(formats);
  }

  private static reportIssue(error: Error | string, context?: Record<string, any>): void {
    const errorReport = {
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
      url: window.location.href
    };
    
    console.error('Error Report:', errorReport);
    // In a real app, this would send to error reporting service
    alert('Error report generated. Please contact support with the details from the browser console.');
  }

  /**
   * Creates a user-friendly error message with recovery options
   */
  static createUserFriendlyError(error: Error | string, context?: Record<string, any>) {
    return this.classify(error, context);
  }

  /**
   * Logs error for debugging while showing user-friendly message
   */
  static logAndClassify(error: Error | string, context?: Record<string, any>) {
    console.error('Error occurred:', error, context);
    return this.classify(error, context);
  }
}

/**
 * Network status monitoring utility
 */
export class NetworkMonitor {
  private static listeners: Array<(isOnline: boolean) => void> = [];
  private static isOnline = navigator.onLine;

  static init() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.notifyListeners(true);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
      this.notifyListeners(false);
    });
  }

  static addListener(callback: (isOnline: boolean) => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  static getStatus() {
    return this.isOnline;
  }

  private static notifyListeners(isOnline: boolean) {
    this.listeners.forEach(listener => listener(isOnline));
  }
}

/**
 * Retry utility for failed operations
 */
export class RetryHandler {
  static async withRetry<T>(
    operation: () => Promise<T>,
    maxAttempts: number = 3,
    delay: number = 1000,
    backoffMultiplier: number = 2
  ): Promise<T> {
    let lastError: Error;
    
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;
        
        if (attempt === maxAttempts) {
          throw lastError;
        }
        
        // Don't retry certain types of errors
        if (this.shouldNotRetry(lastError)) {
          throw lastError;
        }
        
        // Wait before retrying
        await new Promise(resolve => 
          setTimeout(resolve, delay * Math.pow(backoffMultiplier, attempt - 1))
        );
      }
    }
    
    throw lastError!;
  }

  private static shouldNotRetry(error: Error): boolean {
    const message = error.message.toLowerCase();
    
    // Don't retry validation errors, auth errors, or client errors
    return (
      message.includes('validation') ||
      message.includes('unauthorized') ||
      message.includes('forbidden') ||
      message.includes('bad request') ||
      message.includes('404') ||
      message.includes('unsupported format')
    );
  }
}