import React, { Component, ErrorInfo, ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertTriangle, RefreshCw, Home, MessageSquare, Wifi, Clock, Settings, Upload, FileDown, Info, Edit } from 'lucide-react';
import { ErrorHandler, ErrorDetails, NetworkMonitor } from '@/utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  level?: 'page' | 'component' | 'feature';
  context?: Record<string, any>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorDetails: ErrorDetails | null;
  isRetrying: boolean;
  retryCount: number;
  isOnline: boolean;
}

const iconMap = {
  RefreshCw,
  Home,
  MessageSquare,
  Wifi,
  Clock,
  Settings,
  Upload,
  FileDown,
  Info,
  Edit
};

export class ErrorBoundary extends Component<Props, State> {
  private networkUnsubscribe?: () => void;

  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    errorDetails: null,
    isRetrying: false,
    retryCount: 0,
    isOnline: NetworkMonitor.getStatus(),
  };

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorInfo: null,
    };
  }

  public componentDidMount() {
    // Monitor network status
    this.networkUnsubscribe = NetworkMonitor.addListener((isOnline) => {
      this.setState({ isOnline });
      
      // Auto-retry if we come back online and had a network error
      if (isOnline && this.state.hasError && this.state.errorDetails?.type === 'network') {
        this.handleAutoRetry();
      }
    });
  }

  public componentWillUnmount() {
    this.networkUnsubscribe?.();
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    
    // Classify the error and get user-friendly details
    const errorDetails = ErrorHandler.logAndClassify(error, {
      ...this.props.context,
      componentStack: errorInfo.componentStack,
      level: this.props.level || 'component'
    });
    
    this.setState({
      error,
      errorInfo,
      errorDetails,
    });

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      isRetrying: false,
      retryCount: 0,
    });
  };

  private handleReload = () => {
    window.location.reload();
  };

  private handleAutoRetry = async () => {
    if (this.state.retryCount >= 3) return;
    
    this.setState({ isRetrying: true });
    
    // Wait a bit before retrying
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    this.setState(prevState => ({
      hasError: false,
      error: null,
      errorInfo: null,
      errorDetails: null,
      isRetrying: false,
      retryCount: prevState.retryCount + 1,
    }));
  };

  private handleRecoveryAction = async (action: () => void | Promise<void>) => {
    try {
      this.setState({ isRetrying: true });
      await action();
      this.handleReset();
    } catch (error) {
      console.error('Recovery action failed:', error);
      // Don't reset the error state if recovery fails
      this.setState({ isRetrying: false });
    }
  };

  private renderNetworkStatus() {
    if (!this.state.isOnline) {
      return (
        <Alert variant="destructive" className="mb-4">
          <Wifi className="h-4 w-4" />
          <AlertDescription>
            <strong>No Internet Connection:</strong> Please check your network connection and try again.
          </AlertDescription>
        </Alert>
      );
    }
    return null;
  }

  private renderRecoveryOptions() {
    if (!this.state.errorDetails?.recoveryOptions) return null;

    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          {this.state.errorDetails.userMessage}
        </p>
        
        <div className="flex flex-col sm:flex-row gap-3">
          {this.state.errorDetails.recoveryOptions.map((option, index) => {
            const IconComponent = option.icon ? iconMap[option.icon as keyof typeof iconMap] : RefreshCw;
            
            return (
              <Button
                key={index}
                onClick={() => this.handleRecoveryAction(option.action)}
                variant={option.isPrimary ? "default" : "outline"}
                className="flex-1"
                disabled={this.state.isRetrying}
              >
                {IconComponent && <IconComponent className="h-4 w-4 mr-2" />}
                {option.label}
              </Button>
            );
          })}
        </div>
        
        {/* Always provide fallback options */}
        <div className="flex flex-col sm:flex-row gap-2 mt-4">
          <Button onClick={this.handleReset} variant="ghost" size="sm" className="flex-1">
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          
          <Button onClick={this.handleReload} variant="ghost" size="sm" className="flex-1">
            <Home className="h-4 w-4 mr-2" />
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Show loading state during retry
      if (this.state.isRetrying) {
        return (
          <div className="min-h-[200px] flex items-center justify-center">
            <div className="text-center space-y-2">
              <RefreshCw className="h-8 w-8 animate-spin text-primary mx-auto" />
              <p className="text-sm text-muted-foreground">Retrying...</p>
            </div>
          </div>
        );
      }

      const isPageLevel = this.props.level === 'page';
      const containerClass = isPageLevel 
        ? "min-h-screen bg-gradient-to-b from-background to-muted/20 flex items-center justify-center p-4"
        : "min-h-[200px] flex items-center justify-center p-4";

      return (
        <div className={containerClass}>
          <Card className={`w-full p-6 space-y-6 ${isPageLevel ? 'max-w-2xl' : 'max-w-lg'}`}>
            <div className="flex items-center gap-3">
              <AlertTriangle className={`text-destructive ${isPageLevel ? 'h-8 w-8' : 'h-6 w-6'}`} />
              <div>
                <h1 className={`font-bold ${isPageLevel ? 'text-2xl' : 'text-lg'}`}>
                  {this.state.errorDetails?.type === 'network' ? 'Connection Problem' : 'Something went wrong'}
                </h1>
                <p className="text-muted-foreground text-sm">
                  {this.state.errorDetails?.userMessage || 'An unexpected error occurred'}
                </p>
              </div>
            </div>

            {this.renderNetworkStatus()}

            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {this.state.error?.message || 'Unknown error'}
                {this.state.errorDetails?.severity === 'critical' && (
                  <span className="block mt-1 text-xs">
                    This is a critical error that requires immediate attention.
                  </span>
                )}
              </AlertDescription>
            </Alert>

            {this.renderRecoveryOptions()}

            {/* Show retry count if applicable */}
            {this.state.retryCount > 0 && (
              <p className="text-xs text-muted-foreground text-center">
                Retry attempts: {this.state.retryCount}/3
              </p>
            )}

            {/* Development details */}
            {process.env.NODE_ENV === 'development' && this.state.errorInfo && (
              <details className="mt-4">
                <summary className="cursor-pointer text-sm font-medium mb-2">
                  Error Details (Development)
                </summary>
                <div className="space-y-2">
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    {this.state.error?.stack}
                  </pre>
                  <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                    Component Stack: {this.state.errorInfo.componentStack}
                  </pre>
                  {this.state.errorDetails && (
                    <pre className="text-xs bg-muted p-3 rounded overflow-auto max-h-40">
                      Error Classification: {JSON.stringify(this.state.errorDetails, null, 2)}
                    </pre>
                  )}
                </div>
              </details>
            )}
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

// Higher-order component for easier usage
export const withErrorBoundary = <P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) => {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;
  
  return WrappedComponent;
};