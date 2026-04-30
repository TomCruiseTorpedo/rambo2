import { useState, useEffect } from "react";
import { EnhancedMultiImageUpload } from "@/components/upload/EnhancedMultiImageUpload";
import { EnhancedResultsDisplay } from "@/components/results/EnhancedResultsDisplay";
import { SessionHistory, HistoryItem } from "@/components/SessionHistory";
import { ProcessingStatus, ProcessingStage } from "@/components/processing/ProcessingStatus";
import { WizardFlow } from "@/components/wizard/WizardFlow";
import { HelpDrawer } from "@/components/help/HelpDrawer";
import { HelpBot } from "@/components/help/HelpBot";
import { InteractiveTutorial } from "@/components/help/InteractiveTutorial";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { NetworkStatusIndicator } from "@/components/NetworkStatusIndicator";
import { Card } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { FileBarChart, Info } from "lucide-react";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { RetryHandler } from "@/utils/errorHandling";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { extractWithClientOcrFallback } from "@/utils/clientOcrPipeline";

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
  const [ocrSourceNote, setOcrSourceNote] = useState<string | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const { showError, showSuccess, showWarning, showNetworkError, showProcessingError, showApiLimitError } = useEnhancedToast();
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
      showError("Please upload image(s) or enter text to process.", {
        context: 'input_validation'
      });
      return;
    }

    setIsProcessing(true);
    setProcessingStage('uploading');
    setProcessingProgress(10);
    setCurrentFileIndex(0);

    try {
      // Use retry handler for the entire process
      await RetryHandler.withRetry(async () => {
        // Convert all files to base64 with metadata
        setProcessingStage('ocr');
        setOcrSourceNote(null);
        let usedAnyLocalOcr = false;
        let localOcrReason: "rate_limit" | "cloud_failed" | null = null;
        let ocrNoteForHistory: string | undefined;
        let ocrFallbackToastShown = false;
        const files: Array<{ data: string, type: string, name: string }> = [];
        for (let i = 0; i < selectedFiles.length; i++) {
          setCurrentFileIndex(i + 1);
          try {
            const rawFile = selectedFiles[i];
            const fileData = await fileToBase64(rawFile);
            const isRasterOcr =
              fileData.type.startsWith("image/") || fileData.type === "application/pdf";
            if (isRasterOcr) {
              const extracted = await extractWithClientOcrFallback(supabase, rawFile, fileData, {
                onCloudOcr: () => setProcessingStage("ocr"),
                onLocalOcr: (detail) => {
                  setProcessingStage("ocr_fallback");
                  setProcessingProgress(10 + ((i + 0.5) / selectedFiles.length) * 30);
                  console.info("[OCR]", detail);
                },
                onFallbackNotice: (reason) => {
                  usedAnyLocalOcr = true;
                  localOcrReason = reason;
                  if (ocrFallbackToastShown) return;
                  ocrFallbackToastShown = true;
                  if (reason === "rate_limit") {
                    showWarning(
                      "OCR quota reached",
                      "Cloud OCR hit a rate or daily limit. Using free on-device OCR — slower; tables and layout may be less accurate.",
                    );
                  } else {
                    showWarning(
                      "Cloud OCR unavailable",
                      "Using free on-device OCR (Tesseract). Results may miss complex tables compared with cloud OCR.",
                    );
                  }
                },
              });
              if (!extracted.textBody.trim()) {
                throw new Error(`No text extracted from "${rawFile.name}". Try a clearer scan or paste text manually.`);
              }
              files.push({
                name: `${rawFile.name.replace(/\.[^.]+$/, "")}-extracted.txt`,
                type: "text",
                data: `## ${rawFile.name}\n\n${extracted.textBody}`,
              });
            } else {
              files.push(fileData);
            }
            setProcessingProgress(10 + ((i + 1) / selectedFiles.length) * 30);
          } catch (fileError) {
            throw new Error(`Failed to process file "${selectedFiles[i].name}": ${fileError instanceof Error ? fileError.message : 'Unknown error'}`);
          }
        }
        if (usedAnyLocalOcr) {
          ocrNoteForHistory =
            localOcrReason === "rate_limit"
              ? "This run used on-device OCR after a cloud OCR quota or rate limit. Review output carefully for table accuracy."
              : "This run used on-device OCR after cloud OCR failed. Review output carefully for table accuracy.";
          setOcrSourceNote(ocrNoteForHistory);
        }

        // Guard: ensure payload isn't too large for the function
        const totalBytes = files.reduce((sum, f) => sum + Math.ceil((f.data.length * 3) / 4), 0) + (textInput ? new Blob([textInput]).size : 0);
        if (totalBytes > 6 * 1024 * 1024) {
          throw new Error(`Your upload is too large (~${(totalBytes / 1024 / 1024).toFixed(1)} MB). Please compress images or upload fewer files.`);
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
          // Check for specific error types and throw appropriate errors
          const errorMessage = error.message || 'An error occurred during processing.';
          if (errorMessage.includes('429') || errorMessage.includes('rate limit')) {
            showApiLimitError();
            throw new Error('Rate limit exceeded. Please try again in a few moments.');
          } else if (errorMessage.includes('402') || errorMessage.includes('credits')) {
            showApiLimitError();
            throw new Error('API credits exhausted. Please add credits to your workspace in Settings → Usage.');
          } else if (errorMessage.includes('Failed to fetch') || errorMessage.includes('NetworkError')) {
            showNetworkError(() => handleProcess());
            throw new Error('Network error occurred. Please check your connection.');
          } else {
            throw error;
          }
        }

        const splitResult = splitNarrative(data.result);
        // Inject reasoning from API response if available
        if (data.reasoning) {
          splitResult.thinkingProcess = data.reasoning;
        }
        setResults(splitResult);
        setProcessingProgress(100);
        setProcessingStage('complete');

        // Add to session history
        const newHistoryItem: HistoryItem = {
          id: Date.now().toString(),
          timestamp: new Date().toLocaleString(),
          output: data.result,
          inputCount: inputCount,
          ocrNote: ocrNoteForHistory,
        };
        setSessionHistory([newHistoryItem, ...sessionHistory]);

        showSuccess("Success", "Your SR&ED content has been processed successfully.");
      }, 2, 2000); // Retry up to 2 times with 2 second delay

    } catch (error) {
      console.error("Processing error:", error);
      
      // Use enhanced error handling
      if (error instanceof Error) {
        if (error.message.includes('rate limit') || error.message.includes('credits')) {
          // Already handled above
          return;
        } else if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
          // Already handled above
          return;
        } else {
          showProcessingError(processingStage, () => handleProcess());
        }
      } else {
        showError(error as string, {
          context: 'processing',
          stage: processingStage,
          fileCount: selectedFiles.length,
          hasText: !!textInput
        });
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const compressImage = (file: File, maxDim = 1600, quality = 0.8): Promise<string> => {
    return new Promise((resolve, reject) => {
      // Validate input
      if (!file.type.startsWith('image/')) {
        reject(new Error('File is not an image'));
        return;
      }

      if (file.size > 50 * 1024 * 1024) {
        reject(new Error('Image file too large for compression (>50MB)'));
        return;
      }

      const img = new Image();
      const reader = new FileReader();
      
      reader.onload = () => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            let { width, height } = img;
            
            // Calculate optimal dimensions
            const scale = Math.min(1, maxDim / Math.max(width, height));
            width = Math.round(width * scale);
            height = Math.round(height * scale);
            
            // Ensure minimum dimensions
            if (width < 1 || height < 1) {
              reject(new Error('Image dimensions too small after scaling'));
              return;
            }
            
            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Canvas context not available'));
              return;
            }
            
            // Set high-quality rendering
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            
            // Draw and compress
            ctx.drawImage(img, 0, 0, width, height);
            
            // Try different quality levels if file is still too large
            let currentQuality = quality;
            let dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            
            // Reduce quality if compressed size is still too large (>2MB base64)
            while (dataUrl.length > 2.7 * 1024 * 1024 && currentQuality > 0.3) {
              currentQuality -= 0.1;
              dataUrl = canvas.toDataURL('image/jpeg', currentQuality);
            }
            
            const base64 = dataUrl.split(',')[1];
            
            if (!base64) {
              reject(new Error('Failed to generate base64 data'));
              return;
            }
            
            resolve(base64);
          } catch (error) {
            reject(new Error(`Compression failed: ${error instanceof Error ? error.message : 'Unknown error'}`));
          }
        };
        
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.src = reader.result as string;
      };
      
      reader.onerror = () => reject(new Error(`Failed to read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  const fileToBase64 = (file: File): Promise<{ data: string, type: string, name: string }> => {
    return new Promise(async (resolve, reject) => {
      try {
        // Validate file before processing
        if (file.size === 0) {
          reject(new Error(`File "${file.name}" is empty`));
          return;
        }

        if (file.size > 20 * 1024 * 1024) {
          reject(new Error(`File "${file.name}" exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`));
          return;
        }

        // For text files, read as text directly
        if (file.type.startsWith('text/') ||
          file.name.endsWith('.txt') ||
          file.name.endsWith('.md') ||
          file.name.endsWith('.log') ||
          file.name.endsWith('.csv')) {
          
          const reader = new FileReader();
          reader.readAsText(file, 'UTF-8');
          
          reader.onload = () => {
            const text = reader.result as string;
            if (text.length > 100000) { // ~100KB text limit
              reject(new Error(`Text file "${file.name}" is too large (${text.length} characters). Please use a smaller file.`));
              return;
            }
            resolve({
              data: text,
              type: 'text',
              name: file.name
            });
          };
          
          reader.onerror = () => reject(new Error(`Failed to read text file "${file.name}". Please ensure it's a valid text file.`));
          return;
        }

        // For images: compress client-side to reduce payload
        if (file.type.startsWith('image/')) {
          try {
            const compressed = await compressImage(file, 1600, 0.8);
            resolve({
              data: compressed,
              type: 'image/jpeg',
              name: file.name.replace(/\.[^.]+$/, '.jpg')
            });
          } catch (compressionError) {
            reject(new Error(`Failed to compress image "${file.name}": ${compressionError instanceof Error ? compressionError.message : 'Unknown compression error'}`));
          }
          return;
        }

        // For other binary files (PDF, Excel, Word), read as data URL
        const reader = new FileReader();
        reader.readAsDataURL(file);
        
        reader.onload = () => {
          try {
            const base64String = reader.result as string;
            const base64Data = base64String.split(",")[1];
            
            if (!base64Data) {
              reject(new Error(`Failed to process file "${file.name}". Invalid file format.`));
              return;
            }
            
            // Check final size after base64 encoding
            const finalSize = base64Data.length * 0.75; // Approximate original size
            if (finalSize > 15 * 1024 * 1024) { // 15MB limit for binary files
              reject(new Error(`File "${file.name}" is too large after processing (${(finalSize / 1024 / 1024).toFixed(1)}MB). Please use a smaller file.`));
              return;
            }
            
            resolve({
              data: base64Data,
              type: file.type,
              name: file.name
            });
          } catch (error) {
            reject(new Error(`Failed to process file "${file.name}": ${error instanceof Error ? error.message : 'Unknown processing error'}`));
          }
        };
        
        reader.onerror = () => reject(new Error(`Failed to read file "${file.name}". The file may be corrupted or in an unsupported format.`));
        
      } catch (e) {
        reject(new Error(`Unexpected error processing file "${file.name}": ${e instanceof Error ? e.message : 'Unknown error'}`));
      }
    });
  };

  const handleReset = () => {
    setSelectedFiles([]);
    setTextInput("");
    setResults(null);
    setProcessingProgress(0);
    setOcrSourceNote(null);
  };

  const handleCancelProcessing = () => {
    setIsProcessing(false);
    setProcessingProgress(0);
    showWarning("Processing cancelled", "You can start a new processing request anytime.");
  };

  const handleClearHistory = () => {
    setSessionHistory([]);
    showSuccess("History Cleared", "Session history has been cleared.");
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
    <ErrorBoundary 
      level="page"
      context={{
        page: 'index',
        hasFiles: selectedFiles.length > 0,
        hasText: !!textInput,
        isProcessing
      }}
      onError={(error, errorInfo) => {
        console.error('Application error:', error, errorInfo);
        showError("An unexpected application error occurred.", {
          context: 'application_error',
          componentStack: errorInfo.componentStack
        });
      }}
    >
      <a href="#main-content" className="skip-link">
        Skip to main content
      </a>
      <div className="min-h-screen bg-gradient-to-b from-background to-muted/20">
        {showTutorial && (
          <InteractiveTutorial onComplete={() => {
            setShowTutorial(false);
            localStorage.setItem('sred-tutorial-completed', 'true');
          }} />
        )}

        <HelpBot />
        <NetworkStatusIndicator />

      <div className="container mx-auto px-3 sm:px-4 lg:px-6 py-4 sm:py-6 lg:py-8 max-w-7xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 lg:gap-8">
          {/* Main content area */}
          <main id="main-content" className="lg:col-span-2 space-y-4 sm:space-y-6" role="main" aria-label="SR&ED narrative generation">
            <Card className="p-4 sm:p-6 lg:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4 mb-4 sm:mb-6">
                <div className="flex items-center gap-2 sm:gap-3">
                  <FileBarChart className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-primary" aria-hidden="true" />
                  <div>
                    <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold tracking-tight">SR&ED GPT</h1>
                    <p className="text-sm sm:text-base text-muted-foreground mt-1">
                      Turn technical work into SR&ED narratives
                    </p>
                  </div>
                </div>
                <HelpDrawer />
              </div>

              <Alert className="mb-4 sm:mb-6 bg-primary/5 border-primary/20" role="region" aria-labelledby="knowledge-base-info">
                <Info className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                <AlertDescription className="text-xs sm:text-sm" id="knowledge-base-info">
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
                  currentItem={
                    (processingStage === "ocr" || processingStage === "ocr_fallback") && selectedFiles.length > 0
                      ? currentFileIndex
                      : undefined
                  }
                  totalItems={
                    (processingStage === "ocr" || processingStage === "ocr_fallback") && selectedFiles.length > 0
                      ? selectedFiles.length
                      : undefined
                  }
                  estimatedTime={Math.round((100 - processingProgress) / 100 * 60)}
                  onCancel={handleCancelProcessing}
                />
              )}

              {results && !isProcessing && (
                <EnhancedResultsDisplay
                  results={results}
                  onReset={handleReset}
                  onResultsChange={setResults}
                  ocrSourceNote={ocrSourceNote}
                />
              )}
            </Card>

            <Alert className="mt-4 sm:mt-0" role="region" aria-labelledby="quick-check-info">
              <Info className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
              <AlertDescription className="text-xs sm:text-sm" id="quick-check-info">
                <strong>Quick Check:</strong> Does your work involve solving a technical problem that
                couldn't be resolved through standard methods? If yes, you likely have an SR&ED claim!
              </AlertDescription>
            </Alert>
          </main>

          {/* Sidebar: Session History */}
          <aside className="lg:col-span-1 order-first lg:order-none" data-tour="history" aria-label="Session History">
            <SessionHistory
              history={sessionHistory}
              onClear={handleClearHistory}
            />
          </aside>
        </div>
      </div>
      </div>
    </ErrorBoundary>
  );
};

export default Index;
