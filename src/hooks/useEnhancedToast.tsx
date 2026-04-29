import { useToast } from '@/hooks/use-toast';
import { ErrorHandler, ErrorDetails, RecoveryOption } from '@/utils/errorHandling';
import { Button } from '@/components/ui/button';
import { RefreshCw, MessageSquare, Wifi, Clock, Settings, Upload, FileDown, Info, Edit } from 'lucide-react';

const iconMap = {
  RefreshCw,
  MessageSquare,
  Wifi,
  Clock,
  Settings,
  Upload,
  FileDown,
  Info,
  Edit
};

export const useEnhancedToast = () => {
  const { toast } = useToast();

  const showError = (error: Error | string, context?: Record<string, any>) => {
    const errorDetails = ErrorHandler.createUserFriendlyError(error, context);
    
    // Create action buttons for recovery options
    const primaryAction = errorDetails.recoveryOptions.find(option => option.isPrimary);
    
    return toast({
      title: getErrorTitle(errorDetails),
      description: errorDetails.userMessage,
      variant: "destructive",
      action: primaryAction ? (
        <Button
          variant="outline"
          size="sm"
          onClick={primaryAction.action}
          className="ml-2"
        >
          {primaryAction.icon && iconMap[primaryAction.icon as keyof typeof iconMap] && (() => {
            const IconComponent = iconMap[primaryAction.icon as keyof typeof iconMap];
            return <IconComponent className="h-4 w-4 mr-1" />;
          })()}
          {primaryAction.label}
        </Button>
      ) : undefined,
    });
  };

  const showSuccess = (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "default",
    });
  };

  const showWarning = (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "default",
      className: "border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950",
    });
  };

  const showInfo = (message: string, description?: string) => {
    return toast({
      title: message,
      description,
      variant: "default",
      className: "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950",
    });
  };

  const showNetworkError = (retryAction?: () => void) => {
    return toast({
      title: "Connection Problem",
      description: "Please check your internet connection and try again.",
      variant: "destructive",
      action: retryAction ? (
        <Button
          variant="outline"
          size="sm"
          onClick={retryAction}
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      ) : undefined,
    });
  };

  const showFileUploadError = (fileName: string, reason: string, fixAction?: () => void) => {
    return toast({
      title: "File Upload Failed",
      description: `${fileName}: ${reason}`,
      variant: "destructive",
      action: fixAction ? (
        <Button
          variant="outline"
          size="sm"
          onClick={fixAction}
          className="ml-2"
        >
          <Upload className="h-4 w-4 mr-1" />
          Try Again
        </Button>
      ) : undefined,
    });
  };

  const showProcessingError = (stage: string, retryAction?: () => void) => {
    return toast({
      title: "Processing Failed",
      description: `Error during ${stage}. Please try again or use smaller files.`,
      variant: "destructive",
      action: retryAction ? (
        <Button
          variant="outline"
          size="sm"
          onClick={retryAction}
          className="ml-2"
        >
          <RefreshCw className="h-4 w-4 mr-1" />
          Retry
        </Button>
      ) : undefined,
    });
  };

  const showApiLimitError = (checkUsageAction?: () => void) => {
    return toast({
      title: "Usage Limit Reached",
      description: "API usage limit exceeded. Please wait or upgrade your plan.",
      variant: "destructive",
      action: checkUsageAction ? (
        <Button
          variant="outline"
          size="sm"
          onClick={checkUsageAction}
          className="ml-2"
        >
          <Settings className="h-4 w-4 mr-1" />
          Check Usage
        </Button>
      ) : undefined,
    });
  };

  return {
    toast,
    showError,
    showSuccess,
    showWarning,
    showInfo,
    showNetworkError,
    showFileUploadError,
    showProcessingError,
    showApiLimitError,
  };
};

function getErrorTitle(errorDetails: ErrorDetails): string {
  switch (errorDetails.type) {
    case 'network':
      return 'Connection Problem';
    case 'file_upload':
      return 'File Upload Error';
    case 'processing':
      return 'Processing Failed';
    case 'api_limit':
      return 'Usage Limit Reached';
    case 'validation':
      return 'Input Error';
    case 'authentication':
      return 'Authentication Error';
    default:
      return 'Error';
  }
}