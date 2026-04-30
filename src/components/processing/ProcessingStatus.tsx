import { Loader2, X, AlertTriangle, Wifi } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useState, useEffect } from "react";
import { NetworkMonitor } from "@/utils/errorHandling";
import { ErrorBoundary } from "@/components/ErrorBoundary";

export type ProcessingStage = 'uploading' | 'ocr' | 'ocr_fallback' | 'analyzing' | 'generating' | 'complete';

interface ProcessingStatusProps {
  stage: ProcessingStage;
  progress: number;
  currentItem?: number;
  totalItems?: number;
  estimatedTime?: number;
  onCancel: () => void;
  error?: string;
  onRetry?: () => void;
}

const stageMessages: Record<ProcessingStage, string> = {
  uploading: 'Uploading files...',
  ocr: 'Cloud OCR (OpenRouter)...',
  ocr_fallback: 'Free on-device OCR (Tesseract) — may be slower',
  analyzing: 'Analyzing with AI...',
  generating: 'Generating SR&ED narrative...',
  complete: 'Complete!'
};

export const ProcessingStatus = ({
  stage,
  progress,
  currentItem,
  totalItems,
  estimatedTime,
  onCancel,
  error,
  onRetry
}: ProcessingStatusProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [isOnline, setIsOnline] = useState(NetworkMonitor.getStatus());

  useEffect(() => {
    const unsubscribe = NetworkMonitor.addListener(setIsOnline);
    return unsubscribe;
  }, []);

  return (
    <ErrorBoundary 
      level="component"
      context={{
        component: 'ProcessingStatus',
        stage,
        progress,
        hasError: !!error
      }}
    >
      <Card className="p-4 sm:p-6 animate-fade-in">
        <div className="space-y-3 sm:space-y-4">
          {/* Network status warning */}
          {!isOnline && (
            <Alert variant="destructive">
              <Wifi className="h-4 w-4" />
              <AlertDescription>
                <strong>No Internet Connection:</strong> Processing may fail. Please check your connection.
              </AlertDescription>
            </Alert>
          )}

          {/* Error display */}
          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Processing Error:</strong> {error}
                {onRetry && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRetry}
                    className="ml-2 mt-2"
                  >
                    Try Again
                  </Button>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              {error ? (
                <AlertTriangle className="h-4 w-4 sm:h-5 sm:w-5 text-destructive flex-shrink-0" />
              ) : (
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary flex-shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base truncate">
                  {error ? 'Processing Failed' : stageMessages[stage]}
                </p>
                {currentItem && totalItems && !error && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Processing item {currentItem} of {totalItems}
                  </p>
                )}
                {error && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    An error occurred during {stage}
                  </p>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              className="text-muted-foreground hover:text-foreground flex-shrink-0"
            >
              <X className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
              <span className="hidden sm:inline">Cancel</span>
            </Button>
          </div>

          {!error && <Progress value={progress} className="h-2" />}

          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>{error ? 'Failed' : `${Math.round(progress)}% complete`}</span>
            {estimatedTime && !error && (
              <span>~{estimatedTime}s remaining</span>
            )}
          </div>
        </div>
      </Card>

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel processing?</AlertDialogTitle>
            <AlertDialogDescription>
              This will stop the current SR&ED narrative generation. Your progress will not be saved.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continue Processing</AlertDialogCancel>
            <AlertDialogAction onClick={onCancel} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Yes, Cancel
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </ErrorBoundary>
  );
};
