import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ChevronLeft, ChevronRight, Sparkles, FileText } from "lucide-react";
import { TextInput } from "@/components/TextInput";
import { EnhancedMultiImageUpload } from "@/components/upload/EnhancedMultiImageUpload";
import { ProcessingModeSelector } from "@/components/processing/ProcessingModeSelector";
import { useToast } from "@/hooks/use-toast";

interface WizardFlowProps {
  textInput: string;
  onTextInputChange: (value: string) => void;
  selectedFiles: File[];
  onFilesSelect: (files: File[]) => void;
  onRemoveFile: (index: number) => void;
  processMode: "combined" | "separate";
  onProcessModeChange: (mode: "combined" | "separate") => void;
  onGenerate: () => void;
  isProcessing: boolean;
}

export const WizardFlow = ({
  textInput,
  onTextInputChange,
  selectedFiles,
  onFilesSelect,
  onRemoveFile,
  processMode,
  onProcessModeChange,
  onGenerate,
  isProcessing
}: WizardFlowProps) => {
  const [currentStep, setCurrentStep] = useState(1);
  const { toast } = useToast();

  const hasInput = textInput.trim().length > 0 || selectedFiles.length > 0;
  const hasMultipleInputs = (textInput.trim().length > 0 && selectedFiles.length > 0) || selectedFiles.length > 1;
  const totalSteps = hasMultipleInputs ? 3 : 2;
  const progress = (currentStep / totalSteps) * 100;

  const handleGenerateDemoFiles = async () => {
    try {
      // Create sample demo table data as images
      const canvas1 = document.createElement('canvas');
      canvas1.width = 1400;
      canvas1.height = 400;
      const ctx1 = canvas1.getContext('2d')!;
      ctx1.fillStyle = '#ffffff';
      ctx1.fillRect(0, 0, canvas1.width, canvas1.height);
      ctx1.fillStyle = '#000000';
      ctx1.font = '16px Arial';
      ctx1.fillText('Demo Table 1: Experimental Log - SR&ED Documentation', 20, 40);
      
      const canvas2 = document.createElement('canvas');
      canvas2.width = 1400;
      canvas2.height = 400;
      const ctx2 = canvas2.getContext('2d')!;
      ctx2.fillStyle = '#ffffff';
      ctx2.fillRect(0, 0, canvas2.width, canvas2.height);
      ctx2.fillStyle = '#000000';
      ctx2.font = '16px Arial';
      ctx2.fillText('Demo Table 2: Prototype Iterations - SR&ED Documentation', 20, 40);

      const blob1 = await new Promise<Blob>((resolve) => canvas1.toBlob((b) => resolve(b!), 'image/png'));
      const blob2 = await new Promise<Blob>((resolve) => canvas2.toBlob((b) => resolve(b!), 'image/png'));

      const files = [
        new File([blob1], 'experimental-log-table.png', { type: 'image/png' }),
        new File([blob2], 'prototype-iterations-table.png', { type: 'image/png' })
      ];

      onFilesSelect(files);
      toast({
        title: "Demo files loaded",
        description: "Two sample SR&ED documentation tables have been added.",
      });
    } catch (error) {
      toast({
        title: "Error loading demo files",
        description: "Please upload your own files instead.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="space-y-3 sm:space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-base sm:text-lg">Generate SR&ED Narrative</h3>
            <span className="text-xs sm:text-sm text-muted-foreground">Step {hasMultipleInputs ? currentStep : currentStep === 1 ? 1 : 2} of {totalSteps}</span>
          </div>
          <Progress value={progress} className="h-2" />
        </div>
      </Card>

      {currentStep === 1 && (
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-2">Step 1: Gather Evidence</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Provide your technical data - paste text or upload files of documentation.
            </p>
          </div>

          <Tabs defaultValue="images" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="images">File Upload</TabsTrigger>
              <TabsTrigger value="text">Text Input</TabsTrigger>
            </TabsList>
            <TabsContent value="images" className="mt-4">
              <EnhancedMultiImageUpload
                onFilesSelect={onFilesSelect}
                selectedFiles={selectedFiles}
                onRemoveFile={onRemoveFile}
              />
            </TabsContent>
            <TabsContent value="text" className="mt-4">
              <TextInput value={textInput} onChange={onTextInputChange} />
            </TabsContent>
          </Tabs>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={handleGenerateDemoFiles} variant="outline" className="flex-1 text-sm">
              <FileText className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              Generate Demo Files
            </Button>
            <Button onClick={() => setCurrentStep(hasMultipleInputs ? 2 : 3)} disabled={!hasInput} className="flex-1 text-sm">
              Continue <ChevronRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 2 && hasMultipleInputs && (
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in" data-tour="processing-mode">
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-2">Step 2: Configure Processing</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Choose how to process your inputs and customize the output.
            </p>
          </div>

          <ProcessingModeSelector
            value={processMode}
            onChange={onProcessModeChange}
            inputCount={selectedFiles.length + (textInput.trim() ? 1 : 0)}
          />

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setCurrentStep(1)} variant="outline" className="flex-1 text-sm">
              <ChevronLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Back
            </Button>
            <Button onClick={() => setCurrentStep(3)} className="flex-1 text-sm">
              Continue <ChevronRight className="ml-2 h-3 w-3 sm:h-4 sm:w-4" />
            </Button>
          </div>
        </Card>
      )}

      {currentStep === 3 && (
        <Card className="p-4 sm:p-6 space-y-4 sm:space-y-6 animate-fade-in">
          <div>
            <h4 className="font-semibold text-sm sm:text-base mb-2">{hasMultipleInputs ? "Step 3: Review & Generate" : "Step 2: Review & Generate"}</h4>
            <p className="text-xs sm:text-sm text-muted-foreground">
              Ready to generate your SR&ED narrative based on your inputs.
            </p>
          </div>

          <div className="bg-muted/30 rounded-lg p-3 sm:p-4 space-y-2">
            <p className="text-xs sm:text-sm"><strong>Input:</strong> {selectedFiles.length} file(s) + {textInput.trim() ? "text data" : "no text"}</p>
            {hasMultipleInputs && <p className="text-xs sm:text-sm"><strong>Mode:</strong> {processMode === "combined" ? "Combined Context" : "Separate Narratives"}</p>}
            <p className="text-xs sm:text-sm text-muted-foreground">Estimated time: ~30-60 seconds</p>
          </div>

          <div className="flex flex-col sm:flex-row gap-2">
            <Button onClick={() => setCurrentStep(hasMultipleInputs ? 2 : 1)} variant="outline" className="flex-1 text-sm">
              <ChevronLeft className="mr-2 h-3 w-3 sm:h-4 sm:w-4" /> Back
            </Button>
            <Button onClick={onGenerate} disabled={isProcessing} className="flex-1 text-sm" data-tour="generate-button">
              <Sparkles className="mr-2 h-3 w-3 sm:h-4 sm:w-4" />
              {isProcessing ? "Processing..." : "Generate Narrative"}
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
};
