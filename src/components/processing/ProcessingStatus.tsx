import { Loader2, X } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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
import { useState } from "react";

export type ProcessingStage = 'uploading' | 'ocr' | 'analyzing' | 'generating' | 'complete';

interface ProcessingStatusProps {
  stage: ProcessingStage;
  progress: number;
  currentItem?: number;
  totalItems?: number;
  estimatedTime?: number;
  onCancel: () => void;
}

const stageMessages: Record<ProcessingStage, string> = {
  uploading: 'Uploading files...',
  ocr: 'Extracting text from images...',
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
  onCancel
}: ProcessingStatusProps) => {
  const [showCancelDialog, setShowCancelDialog] = useState(false);

  return (
    <>
      <Card className="p-4 sm:p-6 animate-fade-in">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-primary flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm sm:text-base truncate">{stageMessages[stage]}</p>
                {currentItem && totalItems && (
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Processing item {currentItem} of {totalItems}
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

          <Progress value={progress} className="h-2" />

          <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground">
            <span>{Math.round(progress)}% complete</span>
            {estimatedTime && (
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
    </>
  );
};
