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

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith("image/")
    );
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length > 0) {
      onFilesSelect(files);
    }
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          "relative border-2 border-dashed rounded-lg p-8 transition-all",
          isDragging ? "border-primary bg-primary/5" : "border-border hover:border-primary/50",
          disabled && "opacity-50 cursor-not-allowed"
        )}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileInput}
          className="hidden"
          disabled={disabled}
        />

        <div className="flex flex-col items-center gap-3 text-center">
          <div className="rounded-full bg-primary/10 p-3">
            <Upload className="h-6 w-6 text-primary" />
          </div>

          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              Upload Document Image(s)
            </p>
            <p className="text-xs text-muted-foreground">
              Drag and drop or click to browse (multiple files supported)
            </p>
          </div>

          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            variant="outline"
            size="sm"
          >
            <ImageIcon className="mr-2 h-4 w-4" />
            Choose Files
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium">
              {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} selected
            </p>
          </div>

          <div className="grid gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-3 bg-accent/10 border border-accent/20 rounded-lg"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <ImageIcon className="h-4 w-4 text-accent flex-shrink-0" />
                  <span className="text-sm font-medium text-accent truncate">
                    {file.name}
                  </span>
                </div>
                <Button
                  onClick={() => onRemoveFile(index)}
                  disabled={disabled}
                  variant="ghost"
                  size="sm"
                  className="flex-shrink-0 ml-2"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {selectedFiles.length > 1 && (
            <div className="p-4 bg-muted/50 rounded-lg space-y-3">
              <Label className="text-sm font-semibold">Processing Mode</Label>
              <RadioGroup
                value={processMode}
                onValueChange={(value) =>
                  onProcessModeChange(value as "combined" | "separate")
                }
                disabled={disabled}
              >
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="combined" id="combined" />
                  <div className="grid gap-1">
                    <Label htmlFor="combined" className="font-medium cursor-pointer">
                      Combined Context (one narrative)
                    </Label>
                    <p className="text-xs text-muted-foreground">
                      All images will be analyzed together to create a single comprehensive narrative
                    </p>
                  </div>
                </div>
                <div className="flex items-start space-x-2">
                  <RadioGroupItem value="separate" id="separate" />
                  <div className="grid gap-1">
                    <Label htmlFor="separate" className="font-medium cursor-pointer">
                      Separate Narratives (one per image)
                    </Label>
                    <p className="text-xs text-muted-foreground">
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
