import { useState, useEffect } from "react";
import { EnhancedMultiImageUpload } from "@/components/upload/EnhancedMultiImageUpload";
import { EnhancedResultsDisplay } from "@/components/results/EnhancedResultsDisplay";
import { SessionHistory, HistoryItem } from "@/components/SessionHistory";
import { ProcessingStatus, ProcessingStage } from "@/components/processing/ProcessingStatus";
import { WizardFlow } from "@/components/wizard/WizardFlow";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import { HelpBot } from "@/components/help/HelpBot";
import { InteractiveTutorial } from "@/components/help/InteractiveTutorial";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileBarChart, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";

const Index = () => {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [textInput, setTextInput] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingStage, setProcessingStage] = useState<ProcessingStage>('uploading');
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentFileIndex, setCurrentFileIndex] = useState(0);
  const [results, setResults] = useState<any>(null);
  const [processMode, setProcessMode] = useState<"combined" | "separate">("combined");
  const [sessionHistory, setSessionHistory] = useState<HistoryItem[]>([]);
  const [showTutorial, setShowTutorial] = useState(false);
  const { toast } = useToast();
  const isMobile = useIsMobile();

  useEffect(() => {
    const hasSeenTutorial = localStorage.getItem('sred-tutorial-completed');
    if (!hasSeenTutorial) {
      setShowTutorial(true);
    }
  }, []);

  const handleFilesSelect = (files: File[]) => {
    setSelectedFiles([...selectedFiles, ...files]);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(selectedFiles.filter((_, i) => i !== index));
  };

  const handleProcess = async () => {
    if (selectedFiles.length === 0 && !textInput.trim()) {
      toast({
        title: "Input Required",
        description: "Please upload image(s) or enter text to process.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStage('uploading');
    setProcessingProgress(10);
    setCurrentFileIndex(0);

    try {
      // Convert all files to base64 with metadata
      setProcessingStage('ocr');
      const files: Array<{data: string, type: string, name: string}> = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        setCurrentFileIndex(i + 1);
        const fileData = await fileToBase64(selectedFiles[i]);
        files.push(fileData);
        setProcessingProgress(10 + ((i + 1) / selectedFiles.length) * 30);
      }

      // Guard: ensure payload isn't too large for the function
      const totalBytes = files.reduce((sum, f) => sum + Math.ceil((f.data.length * 3) / 4), 0) + (textInput ? new Blob([textInput]).size : 0);
      if (totalBytes > 6 * 1024 * 1024) {
        throw new Error(`Your upload is too large (~${(totalBytes/1024/1024).toFixed(1)} MB). Please compress images or upload fewer files.`);
      }

      setProcessingStage('analyzing');
      setProcessingProgress(50);

      const inputCount = (files.length > 0 ? files.length : 0) + (textInput ? 1 : 0);

      setProcessingStage('generating');
      setProcessingProgress(70);

      const { data, error } = await supabase.functions.invoke("process-sred", {
        body: {
          files: files.length > 0 ? files : undefined,
          text: textInput || undefined,
          processMode: processMode,
          deviceType: isMobile ? "mobile" : "desktop",
        },
      });

      setProcessingProgress(90);

      if (error) {
        // Check for specific error types
        const errorMessage = error.message || 'An error occurred during processing.';
        if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
          throw new Error('Rate limit exceeded. Please try again in a few moments.');
        } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
          throw new Error('API credits exhausted. Please add credits to your workspace in Settings → Usage.');
        } else {
          throw error;
        }
      }
      
      const splitResult = splitNarrative(data.result);
      setResults(splitResult);
      setProcessingProgress(100);
      setProcessingStage('complete');

      // Add to session history
      const newHistoryItem: HistoryItem = {
        id: Date.now().toString(),
        timestamp: new Date().toLocaleString(),
        output: data.result,
        inputCount: inputCount,
      };
      setSessionHistory([newHistoryItem, ...sessionHistory]);

      toast({
        title: "Success",
        description: "Your SR&ED content has been processed successfully.",
      });
    } catch (error) {
      console.error("Processing error:", error);
      let description = "An error occurred during processing.";
      if (error instanceof Error) {
        if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          description = "Request failed to reach the server. Likely due to large files or network. Try smaller images or retry shortly.";
        } else {
          description = error.message;
        }
      }
      toast({
        title: "Processing Failed",
        description,
        variant: "destructive",
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const compressImage = (file: File, maxDim = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = () => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let { width, height } = img;
          const scale = Math.min(1, maxDim / Math.max(width, height));
          width = Math.round(width * scale);
          height = Math.round(height * scale);
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) return reject(new Error('Canvas not supported'));
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', quality);
          const base64 = dataUrl.split(',')[1];
          resolve(base64);
        };
        img.onerror = () => reject(new Error('Failed to load image for compression'));
        img.src = reader.result as string;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<{data: string, type: string, name: string}> => {
    return new Promise(async (resolve, reject) => {
      try {
        // For text files, read as text directly
        if (file.type.startsWith('text/') || 
            file.name.endsWith('.txt') || 
            file.name.endsWith('.md') || 
            file.name.endsWith('.log') ||
            file.name.endsWith('.csv')) {
          const reader = new FileReader();
          reader.readAsText(file);
          reader.onload = () => resolve({
            data: reader.result as string,
            type: 'text',
            name: file.name
          });
          reader.onerror = reject;
          return;
        }

        // For images: compress client-side to reduce payload
        if (file.type.startsWith('image/')) {
          const compressed = await compressImage(file, 1600, 0.8);
          resolve({
            data: compressed,
            type: 'image/jpeg',
            name: file.name.replace(/\.[^.]+$/, '.jpg')
          });
          return;
        }

        // For other binary files (PDF, Excel, Word), read as data URL
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
          const base64String = reader.result as string;
          resolve({
            data: base64String.split(",")[1],
            type: file.type,
            name: file.name
          });
        };
        reader.onerror = reject;
      } catch (e) {
        reject(e);
      }
    });
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setTextInput("");
    setResults(null);
    setProcessingProgress(0);
  };

  const handleCancelProcessing = () => {
    setIsProcessing(false);
    setProcessingProgress(0);
    toast({ title: "Processing cancelled" });
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    toast({
      title: "History Cleared",
      description: "Session history has been cleared.",
    });
  };

  // Split narrative into sections for enhanced display
  const splitNarrative = (rawResult: string) => {
    const thinkingMatch = rawResult.match(/\[THINKING_PROCESS_START\]([\s\S]*?)\[THINKING_PROCESS_END\]/);
    const thinkingProcess = thinkingMatch ? thinkingMatch[1].trim() : "";

    // Match both ## Line XXX: and **Line XXX** formats
    const line242Match = rawResult.match(/(?:##\s*Line 242:?\s*Technological Uncertainty|##\s*Line 242:?|\*\*Line 242[\s\S]*?\*\*)([\s\S]*?)(?=##\s*Line 244|##\s*Line 246|\*\*Line 244|\*\*Line 246|$)/);
    const line244Match = rawResult.match(/(?:##\s*Line 244:?\s*Systematic Investigation|##\s*Line 244:?|\*\*Line 244[\s\S]*?\*\*)([\s\S]*?)(?=##\s*Line 242|##\s*Line 246|\*\*Line 242|\*\*Line 246|$)/);
    const line246Match = rawResult.match(/(?:##\s*Line 246:?\s*Technological Advancement|##\s*Line 246:?|\*\*Line 246[\s\S]*?\*\*)([\s\S]*?)(?=##\s*Line 242|##\s*Line 244|\*\*Line 242|\*\*Line 244|$)/);

    return {
      line242: line242Match ? line242Match[1].trim() : rawResult.split('\n\n')[0] || rawResult,
      line244: line244Match ? line244Match[1].trim() : rawResult.split('\n\n')[1] || "",
      line246: line246Match ? line246Match[1].trim() : rawResult.split('\n\n')[2] || "",
      thinkingProcess
    };
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
      {showTutorial && (
        <InteractiveTutorial onComplete={() => {
          setShowTutorial(false);
          localStorage.setItem('sred-tutorial-completed', 'true');
        }} />
      )}

      <HelpBot />

      <div className="container mx-auto px-2 sm:px-4 py-4 sm:py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Main content area */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            <Card className="p-4 sm:p-6 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <FileBarChart className="h-6 w-6 sm:h-8 sm:w-8 text-primary" />
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">SR&ED GPT</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Turn technical work into SR&ED narratives
                    </p>
                  </div>
                </div>
                <HelpDrawer />
              </div>

              <Alert className="mb-4 sm:mb-6 bg-primary/5 border-primary/20">
                <Info className="h-4 w-4 text-primary flex-shrink-0" />
                <AlertDescription className="text-xs sm:text-sm">
                  <strong>Knowledge Base Powered:</strong> Our AI uses the comprehensive SR&ED Q&A corpus 
                  and process-entity model to generate narratives that strictly follow CRA T661/T4088 guidelines.
                </AlertDescription>
              </Alert>

              {!results && !isProcessing && (
                <div data-tour="wizard-flow">
                  <WizardFlow
                    textInput={textInput}
                    onTextInputChange={setTextInput}
                    selectedFiles={selectedFiles}
                    onFilesSelect={handleFilesSelect}
                    onRemoveFile={handleRemoveFile}
                    processMode={processMode}
                    onProcessModeChange={setProcessMode}
                    onGenerate={handleProcess}
                    isProcessing={isProcessing}
                  />
                </div>
              )}

              {isProcessing && (
                <ProcessingStatus
                  stage={processingStage}
                  progress={processingProgress}
                  currentItem={processingStage === 'ocr' && selectedFiles.length > 0 ? currentFileIndex : undefined}
                  totalItems={processingStage === 'ocr' && selectedFiles.length > 0 ? selectedFiles.length : undefined}
                  estimatedTime={Math.round((100 - processingProgress) / 100 * 60)}
                  onCancel={handleCancelProcessing}
                />
              )}

              {results && !isProcessing && (
                <EnhancedResultsDisplay
                  results={results}
                  onReset={handleReset}
                  onResultsChange={setResults}
                />
              )}
            </Card>

            <Alert className="mt-4 sm:mt-0">
              <Info className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-xs sm:text-sm">
                <strong>Quick Check:</strong> Does your work involve solving a technical problem that 
                couldn't be resolved through standard methods? If yes, you likely have an SR&ED claim!
              </AlertDescription>
            </Alert>
          </div>

          {/* Sidebar: Session History */}
          <div className="lg:col-span-1 order-first lg:order-none" data-tour="history">
            <SessionHistory
              history={sessionHistory}
              onClear={handleClearHistory}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
