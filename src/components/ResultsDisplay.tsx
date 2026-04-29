import { useState } from "react";
import { Card } from "@/components/ui/card";
import { CheckCircle, FileText, Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ResultsDisplayProps {
  results: string;
  onReset: () => void;
}

export const ResultsDisplay = ({ results, onReset }: ResultsDisplayProps) => {
  const [isCopying, setIsCopying] = useState(false);
  const [justCopied, setJustCopied] = useState(false);

  const handleCopy = async () => {
    try {
      setIsCopying(true);
      await navigator.clipboard.writeText(results);
      setJustCopied(true);
      setTimeout(() => setJustCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy text:', error);
    } finally {
      setIsCopying(false);
    }
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
            <Button 
              onClick={handleCopy} 
              variant="outline" 
              size="sm"
              disabled={isCopying}
            >
              {justCopied ? (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Copied!
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4 mr-2" />
                  {isCopying ? 'Copying...' : 'Copy Text'}
                </>
              )}
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
