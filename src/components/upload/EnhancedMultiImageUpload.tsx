import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Upload, X, Eye, FileWarning, Loader2, FileText, FileSpreadsheet, File } from "lucide-react";
import { toast } from "sonner";

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

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      // Validate file sizes
      const validFiles: File[] = [];
      acceptedFiles.forEach(file => {
        if (file.size > 20 * 1024 * 1024) {
          toast.error(`${file.name} exceeds 20MB limit`);
        } else if (file.size > 5 * 1024 * 1024) {
          toast.warning(`${file.name} is large (${(file.size / 1024 / 1024).toFixed(1)}MB). May slow processing.`);
          validFiles.push(file);
        } else {
          validFiles.push(file);
        }
      });

      // Generate thumbnails for images only
      validFiles.forEach(file => {
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = (e) => {
            setThumbnails(prev => ({
              ...prev,
              [file.name]: e.target?.result as string
            }));
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
    <div className="space-y-4" data-tour="input-section">
      <Card
        {...getRootProps()}
        className={`p-8 border-2 border-dashed transition-all cursor-pointer ${
          isDragActive
            ? "border-primary bg-primary/5 scale-[1.02]"
            : "border-border hover:border-primary/50 hover:bg-accent/5"
        } ${disabled ? "opacity-50 cursor-not-allowed" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-3 text-center">
          <div className={`rounded-full p-4 ${isDragActive ? "bg-primary/10" : "bg-muted"}`}>
            <Upload className={`h-8 w-8 ${isDragActive ? "text-primary animate-bounce" : "text-muted-foreground"}`} />
          </div>
          <div>
            <p className="font-semibold mb-1">
              {isDragActive ? "Drop files here" : "Upload Files"}
            </p>
            <p className="text-sm text-muted-foreground">
              Drag & drop or click to browse • Images, PDF, Excel, Word, Text files
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Max 20MB per file • Up to 10 files
            </p>
          </div>
        </div>
      </Card>

      {selectedFiles.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {selectedFiles.map((file, index) => (
            <Card key={index} className="relative overflow-hidden group">
              <div className="aspect-square relative bg-muted">
                {thumbnails[file.name] ? (
                  <img
                    src={thumbnails[file.name]}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    {getFileIcon(file.name)}
                  </div>
                )}

                {thumbnails[file.name] && (
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="icon"
                      variant="secondary"
                      onClick={() => window.open(thumbnails[file.name], '_blank')}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                )}

                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-2 right-2 h-6 w-6"
                  onClick={() => handleRemove(index)}
                >
                  <X className="h-3 w-3" />
                </Button>

                {file.size > 5 * 1024 * 1024 && (
                  <Badge
                    variant="secondary"
                    className="absolute top-2 left-2 bg-yellow-500/90 text-yellow-900"
                  >
                    <FileWarning className="h-3 w-3 mr-1" />
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
      )}
    </div>
  );
};
