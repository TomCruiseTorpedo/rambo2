import { useState, useRef } from "react";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface MultiImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
  processMode: "combined" | "separate";
  onProcessModeChange: (mode: "combined" | "separate") => void;
}

export const MultiImageUpload = ({
  onFilesSelect,
  selectedFiles,
  onRemoveFile,
  disabled,
  processMode,
  onProcessModeChange,
}: MultiImageUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (disabled) return;

    const droppedFiles = Array.from(e.dataTransfer.files);
    const validFiles: File[] = [];
    const errors: string[] = [];

    droppedFiles.forEach(file => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        errors.push(`${file.name} is not an image file`);
        return;
      }

      // Check file size
      if (file.size === 0) {
        errors.push(`${file.name} is empty`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 20MB limit`);
        return;
      }

      // Check for duplicates
      const isDuplicate = selectedFiles.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );

      if (isDuplicate) {
        errors.push(`${file.name} is already uploaded`);
        return;
      }

      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      const errorMessage = errors.length === 1 
        ? errors[0]
        : `${errors.length} files rejected: ${errors.slice(0, 2).join(', ')}${errors.length > 2 ? '...' : ''}`;
      
      // You'll need to add toast to this component or use a different notification method
      console.error('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFilesList = e.target.files ? Array.from(e.target.files) : [];
    const validFiles: File[] = [];
    const errors: string[] = [];

    selectedFilesList.forEach(file => {
      // Validate file size
      if (file.size === 0) {
        errors.push(`${file.name} is empty`);
        return;
      }

      if (file.size > 20 * 1024 * 1024) {
        errors.push(`${file.name} exceeds 20MB limit`);
        return;
      }

      // Check for duplicates
      const isDuplicate = selectedFiles.some(existingFile => 
        existingFile.name === file.name && existingFile.size === file.size
      );

      if (isDuplicate) {
        errors.push(`${file.name} is already uploaded`);
        return;
      }

      validFiles.push(file);
    });

    // Show errors if any
    if (errors.length > 0) {
      console.error('File validation errors:', errors);
    }

    if (validFiles.length > 0) {
      onFilesSelect(validFiles);
    }

    // Reset the input value to allow selecting the same file again
    e.target.value = '';
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-4 sm:p-6 lg:p-8 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragging ? "border-primary bg-primary/5 scale-[1.02]" : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="button"
        aria-label="Upload image files - drag and drop or click to browse"
        aria-describedby="upload-instructions"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            fileInputRef.current?.click();
          }
        }}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
          aria-label="Select image files for upload"
          aria-describedby="upload-instructions"
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn(
            "rounded-full p-3 transition-all",
            isDragging ? "bg-primary/20 scale-110" : "bg-primary/10"
          )}>
            <Upload className={cn(
              "h-5 w-5 sm:h-6 sm:w-6 text-primary transition-all",
              isDragging && "animate-bounce"
            )} aria-hidden="true" />
          </div>

          <div className="space-y-1">
            <p className="text-sm sm:text-base font-medium text-foreground">
              {isDragging ? "Drop files here" : "Upload Document Image(s)"}
            </p>
            <p id="upload-instructions" className="text-xs sm:text-sm text-muted-foreground max-w-xs">
              Drag and drop or click to browse • Multiple files supported • Max 20MB per file
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            variant="outline"
            size="sm"
            className="mt-2"
            aria-describedby="upload-instructions"
          >
            <ImageIcon className="mr-2 h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
            Choose Files
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3" role="region" aria-labelledby="selected-files-heading">
          <div className="flex items-center justify-between">
            <h3 id="selected-files-heading" className="text-sm font-medium" aria-live="polite">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
            </h3>
          </div>

          <div className="grid gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-lg hover:bg-accent/15 transition-colors"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ImageIcon className="h-4 w-4 text-accent flex-shrink-0" aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-accent truncate block" title={file.name}>
                      {file.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {(file.size / 1024 / 1024).toFixed(1)} MB
                    </span>
                  </div>
                </div>
                <Button
                  onClick={() => onRemoveFile(index)}
                  disabled={disabled}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 ml-2 hover:bg-destructive/10 hover:text-destructive"
                  aria-label={`Remove ${file.name} from upload list`}
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </Button>
              </div>
            ))}
          </div>

          {selectedFiles.length > 1 && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3" role="region" aria-labelledby="processing-mode-heading">
              <Label id="processing-mode-heading" className="text-sm font-semibold">Processing Mode</Label>
              <RadioGroup
                value={processMode}
                onValueChange={(value) =>
                  onProcessModeChange(value as "combined" | "separate")
                }
                disabled={disabled}
                aria-labelledby="processing-mode-heading"
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="combined" id="combined" />
                  <div className="grid gap-1">
                    <Label htmlFor="combined" className="font-medium cursor-pointer text-sm">
                      Combined Context (one narrative)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      All images will be analyzed together to create a single comprehensive narrative
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="separate" id="separate" />
                  <div className="grid gap-1">
                    <Label htmlFor="separate" className="font-medium cursor-pointer text-sm">
                      Separate Narratives (one per image)
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Each image will be analyzed independently with its own narrative
                    </p>
                  </div>
                </div>
              </RadioGroup>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
