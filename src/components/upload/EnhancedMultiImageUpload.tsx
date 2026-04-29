import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Eye, FileWarning, Loader2, FileText, FileSpreadsheet, File } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { useEnhancedToast } from "@/hooks/useEnhancedToast";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { cn } from "@/lib/utils";

interface EnhancedMultiImageUploadProps {
  onFilesSelect: (files: File[]) => void;
  selectedFiles: File[];
  onRemoveFile: (index: number) => void;
  disabled?: boolean;
}

export const EnhancedMultiImageUpload = ({
  onFilesSelect,
  selectedFiles,
  onRemoveFile,
  disabled
}: EnhancedMultiImageUploadProps) => {
  const [thumbnails, setThumbnails] = useState<{ [key: string]: string }>({});
  const [ocrPreviews, setOcrPreviews] = useState<{ [key: string]: string }>({});
  const [processingOcr, setProcessingOcr] = useState<{ [key: string]: boolean }>({});
  const [processingThumbnails, setProcessingThumbnails] = useState<{ [key: string]: boolean }>({});
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const { showError, showWarning, showFileUploadError } = useEnhancedToast();

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Enhanced file validation
      const validFiles: File[] = [];
      const errors: string[] = [];
      
      // Check total file count limit
      const totalFiles = selectedFiles.length + acceptedFiles.length;
      if (totalFiles > 10) {
        showFileUploadError(
          `${acceptedFiles.length} files`,
          `Cannot upload more than 10 files. You're trying to add ${acceptedFiles.length} files to ${selectedFiles.length} existing files.`
        );
        return;
      }

      acceptedFiles.forEach(file => {
        // Check if file already exists
        const isDuplicate = selectedFiles.some(existingFile => 
          existingFile.name === file.name && existingFile.size === file.size
        );
        
        if (isDuplicate) {
          errors.push(`${file.name} is already uploaded`);
          return;
        }

        // Validate file size
        if (file.size === 0) {
          errors.push(`${file.name} is empty`);
          return;
        }
        
        if (file.size > 20 * 1024 * 1024) {
          errors.push(`${file.name} exceeds 20MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
          return;
        }

        // Validate file type more strictly
        const allowedTypes = {
          'image/jpeg': ['.jpg', '.jpeg'],
          'image/png': ['.png'],
          'image/gif': ['.gif'],
          'image/webp': ['.webp'],
          'image/bmp': ['.bmp'],
          'text/plain': ['.txt'],
          'text/markdown': ['.md'],
          'text/csv': ['.csv'],
          'application/pdf': ['.pdf'],
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
          'application/vnd.ms-excel': ['.xls'],
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx']
        };

        const fileExtension = '.' + file.name.toLowerCase().split('.').pop();
        const isValidType = Object.entries(allowedTypes).some(([mimeType, extensions]) => 
          (file.type === mimeType || file.type === '') && extensions.includes(fileExtension)
        );

        if (!isValidType) {
          errors.push(`${file.name} has unsupported format. Supported: Images, PDF, Excel, Word, Text files`);
          return;
        }

        // Warn about large files
        if (file.size > 5 * 1024 * 1024) {
          showWarning(
            "Large File Detected",
            `${file.name} is large (${(file.size / 1024 / 1024).toFixed(1)}MB). Processing may be slower.`
          );
        }

        validFiles.push(file);
      });

      // Show validation errors
      if (errors.length > 0) {
        const errorMessage = errors.length === 1 
          ? errors[0]
          : `${errors.length} files rejected. First few: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`;
        
        showFileUploadError(
          errors.length === 1 ? "File" : `${errors.length} files`,
          errorMessage,
          () => {} // Could add action to show file format help
        );
      }

      // Generate thumbnails for images with progress tracking
      validFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          setProcessingThumbnails(prev => ({ ...prev, [file.name]: true }));
          
          const reader = new FileReader();
          
          reader.onprogress = (e) => {
            if (e.lengthComputable) {
              const progress = Math.round((e.loaded / e.total) * 100);
              setUploadProgress(prev => ({ ...prev, [file.name]: progress }));
            }
          };
          
          reader.onload = (e) => {
            setThumbnails(prev => ({
              ...prev,
              [file.name]: e.target?.result as string
            }));
            setProcessingThumbnails(prev => {
              const newState = { ...prev };
              delete newState[file.name];
              return newState;
            });
            setUploadProgress(prev => {
              const newState = { ...prev };
              delete newState[file.name];
              return newState;
            });
          };
          
          reader.onerror = () => {
            showError(`Failed to generate thumbnail for ${file.name}`, {
              context: 'thumbnail_generation',
              fileName: file.name,
              fileSize: file.size,
              fileType: file.type
            });
            setProcessingThumbnails(prev => {
              const newState = { ...prev };
              delete newState[file.name];
              return newState;
            });
            setUploadProgress(prev => {
              const newState = { ...prev };
              delete newState[file.name];
              return newState;
            });
          };
          
          reader.readAsDataURL(file);
        }
      });

      onFilesSelect([...selectedFiles, ...validFiles]);
    },
    [onFilesSelect, selectedFiles]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      'text/*': ['.txt', '.md', '.log'],
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'text/csv': ['.csv']
    },
    disabled,
    multiple: true
  });

  const handleRemove = (index: number) => {
    const file = selectedFiles[index];
    
    // Clean up all state related to this file
    setThumbnails(prev => {
      const newThumbnails = { ...prev };
      delete newThumbnails[file.name];
      return newThumbnails;
    });
    
    setOcrPreviews(prev => {
      const newPreviews = { ...prev };
      delete newPreviews[file.name];
      return newPreviews;
    });
    
    setProcessingThumbnails(prev => {
      const newState = { ...prev };
      delete newState[file.name];
      return newState;
    });
    
    setUploadProgress(prev => {
      const newState = { ...prev };
      delete newState[file.name];
      return newState;
    });
    
    onRemoveFile(index);
  };

  const getFileSizeColor = (size: number) => {
    if (size > 5 * 1024 * 1024) return "text-yellow-600 dark:text-yellow-400";
    return "text-muted-foreground";
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / 1024 / 1024).toFixed(1) + " MB";
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.toLowerCase().split('.').pop();
    switch (ext) {
      case 'pdf':
        return <File className="h-12 w-12 text-red-500" />;
      case 'xlsx':
      case 'xls':
      case 'csv':
        return <FileSpreadsheet className="h-12 w-12 text-green-600" />;
      case 'docx':
      case 'txt':
      case 'md':
      case 'log':
        return <FileText className="h-12 w-12 text-blue-500" />;
      default:
        return <File className="h-12 w-12 text-muted-foreground" />;
    }
  };

  return (
    <ErrorBoundary 
      level="component"
      context={{
        component: 'EnhancedMultiImageUpload',
        fileCount: selectedFiles.length,
        disabled
      }}
    >
      <div className="space-y-4" data-tour="input-section">
      <Card
        {...getRootProps()}
        className={cn(
          "p-4 sm:p-6 lg:p-8 border-2 border-dashed transition-all cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-accent/5",
          disabled && "opacity-50 cursor-not-allowed"
        )}
        role="button"
        aria-label="Upload files - drag and drop or click to browse. Supports images, PDF, Excel, Word, and text files"
        aria-describedby="enhanced-upload-instructions"
        tabIndex={disabled ? -1 : 0}
      >
        <input {...getInputProps()} aria-describedby="enhanced-upload-instructions" />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={cn(
            "rounded-full p-3 sm:p-4 transition-all",
            isDragActive ? "bg-primary/10 scale-110" : "bg-muted"
          )}>
            <Upload className={cn(
              "h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 transition-all",
              isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"
            )} aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold mb-1 text-sm sm:text-base">
              {isDragActive ? "Drop files here" : "Upload Files"}
            </p>
            <p id="enhanced-upload-instructions" className="text-xs sm:text-sm text-muted-foreground max-w-sm">
              Drag & drop or click to browse • Images, PDF, Excel, Word, Text files
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 20MB per file • Up to 10 files
            </p>
          </div>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="space-y-3" role="region" aria-labelledby="uploaded-files-heading">
          <h3 id="uploaded-files-heading" className="text-sm font-medium" aria-live="polite">
            {selectedFiles.length} file{selectedFiles.length !== 1 ? "s" : ""} uploaded
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {selectedFiles.map((file, index) => (
              <Card key={index} className="relative overflow-hidden group hover:shadow-md transition-shadow">
                <div className="aspect-square relative bg-muted">
                  {processingThumbnails[file.name] ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4">
                      <Loader2 className="h-6 w-6 sm:h-8 sm:w-8 animate-spin text-primary" aria-hidden="true" />
                      <div className="w-3/4">
                        <Progress 
                          value={uploadProgress[file.name] || 0} 
                          className="h-1"
                          aria-label={`Processing ${file.name}: ${uploadProgress[file.name] || 0}% complete`}
                        />
                      </div>
                      <p className="text-xs text-muted-foreground">Processing...</p>
                    </div>
                  ) : thumbnails[file.name] ? (
                    <img
                      src={thumbnails[file.name]}
                      alt={`Preview of ${file.name}`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center" aria-label={`File icon for ${file.name}`}>
                      {getFileIcon(file.name)}
                    </div>
                  )}

                  {thumbnails[file.name] && (
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        size="icon"
                        variant="secondary"
                        onClick={() => window.open(thumbnails[file.name], '_blank')}
                        aria-label={`View full size image of ${file.name}`}
                      >
                        <Eye className="h-4 w-4" aria-hidden="true" />
                      </Button>
                    </div>
                  )}

                  <Button
                    size="icon"
                    variant="destructive"
                    className="absolute top-2 right-2 h-6 w-6 hover:scale-110 transition-transform"
                    onClick={() => handleRemove(index)}
                    aria-label={`Remove ${file.name} from upload list`}
                  >
                    <X className="h-3 w-3" aria-hidden="true" />
                  </Button>

                  {file.size > 5 * 1024 * 1024 && (
                    <Badge
                      variant="secondary"
                      className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-900 text-xs"
                      aria-label={`Large file warning for ${file.name}`}
                    >
                      <FileWarning className="h-3 w-3 mr-1" aria-hidden="true" />
                      Large
                    </Badge>
                  )}
                </div>

                <div className="p-3 space-y-1">
                  <p className="text-xs font-medium truncate" title={file.name}>
                    {file.name}
                  </p>
                  <p className={`text-xs ${getFileSizeColor(file.size)}`}>
                    {formatFileSize(file.size)}
                  </p>
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
      </div>
    </ErrorBoundary>
  );
};
