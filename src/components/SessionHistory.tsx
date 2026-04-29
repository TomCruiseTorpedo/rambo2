import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Download, FileText, Trash2, Clock } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export interface HistoryItem {
  id: string;
  timestamp: string;
  output: string;
  inputCount: number;
}

interface SessionHistoryProps {
  history: HistoryItem[];
  onClear: () => void;
}

export const SessionHistory = ({ history, onClear }: SessionHistoryProps) => {
  const handleDownload = (item: HistoryItem, index: number) => {
    const blob = new Blob([item.output], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `sred_narrative_${index + 1}_${item.timestamp.replace(/[:\s]/g, '-')}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (history.length === 0) {
    return (
      <Card className="border-2 border-dashed bg-muted/30" role="region" aria-labelledby="empty-history-heading">
        <div className="p-6 sm:p-8 lg:p-12 text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-muted p-3 sm:p-4">
              <FileText className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-muted-foreground" aria-hidden="true" />
            </div>
          </div>
          <h3 id="empty-history-heading" className="text-base sm:text-lg font-semibold mb-2">No Generated Narratives Yet</h3>
          <p className="text-xs sm:text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
            Upload files or paste text and click "Generate Narrative" to create your SR&ED documentation. All generated results will appear here.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold text-base sm:text-lg flex items-center gap-2">
            <FileText className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
            Session History
          </h2>
          <p className="text-xs sm:text-sm text-muted-foreground" aria-live="polite">
            {history.length} narrative{history.length !== 1 ? 's' : ''} generated
          </p>
        </div>
        <Button
          onClick={onClear}
          variant="ghost"
          size="sm"
          className="text-destructive hover:text-destructive hover:bg-destructive/10"
          aria-label={`Clear all ${history.length} generated narratives`}
        >
          <Trash2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden="true" />
          <span className="text-xs sm:text-sm">Clear All</span>
        </Button>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {history.map((item, index) => (
          <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
            <div className="bg-muted/50 px-3 sm:px-6 py-3 sm:py-4 border-b flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
                <Badge variant="secondary" className="font-mono text-xs" aria-label={`Narrative number ${index + 1}`}>
                  #{index + 1}
                </Badge>
                <div className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm text-muted-foreground">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" aria-hidden="true" />
                  <time className="text-xs" dateTime={item.timestamp}>{item.timestamp}</time>
                  <span className="text-xs" aria-label={`${item.inputCount} input files processed`}>
                    • {item.inputCount} input{item.inputCount !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>
              <Button
                onClick={() => handleDownload(item, index)}
                variant="outline"
                size="sm"
                className="w-full sm:w-auto hover:bg-accent"
                aria-label={`Download narrative ${index + 1} as text file`}
              >
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" aria-hidden="true" />
                <span className="text-xs sm:text-sm">Download</span>
              </Button>
            </div>
            
            <ScrollArea className="max-h-[200px] sm:max-h-[300px]" aria-label={`Preview of narrative ${index + 1}`}>
              <div className="p-3 sm:p-6">
                <div className="prose prose-sm max-w-none">
                  <p className="text-xs sm:text-sm text-foreground/90 whitespace-pre-wrap leading-relaxed">
                    {item.output.substring(0, 500)}
                    {item.output.length > 500 && (
                      <span className="text-muted-foreground" aria-label="Content truncated">...</span>
                    )}
                  </p>
                </div>
              </div>
            </ScrollArea>
          </Card>
        ))}
      </div>
    </div>
  );
};
