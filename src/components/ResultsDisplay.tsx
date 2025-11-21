import { Card } from "@/components/ui/card";
import { CheckCircle, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsDisplayProps {
  results: string;
  onReset: () => void;
}

export const ResultsDisplay = ({ results, onReset }: ResultsDisplayProps) => {
  const handleCopy = () => {
    navigator.clipboard.writeText(results);
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <div className="flex items-center gap-2 text-accent">
        <CheckCircle className="h-5 w-5" />
        <span className="font-semibold">Analysis Complete</span>
      </div>

      <Card className="p-6 shadow-medium">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h3 className="font-semibold text-lg">SR&ED Form Content</h3>
            </div>
            <Button onClick={handleCopy} variant="outline" size="sm">
              Copy Text
            </Button>
          </div>

          <div className="prose prose-sm max-w-none">
            <div className="whitespace-pre-wrap text-foreground bg-muted/30 rounded-lg p-4 border border-border">
              {results}
            </div>
          </div>
        </div>
      </Card>

      <Button onClick={onReset} variant="outline" className="w-full">
        Process Another Document
      </Button>
    </div>
  );
};
