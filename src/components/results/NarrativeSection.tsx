import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Copy, Edit2, Check } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";

interface NarrativeSectionProps {
  title: string;
  lineNumber: string;
  content: string;
  onContentChange: (content: string) => void;
  confidenceScore?: number;
  highlights?: Array<{ text: string; type: "strong" | "weak" | "missing" }>;
}

export const NarrativeSection = ({
  title,
  lineNumber,
  content,
  onContentChange,
  confidenceScore,
  highlights = []
}: NarrativeSectionProps) => {
  const [isOpen, setIsOpen] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(content);

  const wordCount = content.split(/\s+/).filter(w => w.length > 0).length;

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    toast.success(`Line ${lineNumber} copied to clipboard`);
  };

  const handleSave = () => {
    onContentChange(editedContent);
    setIsEditing(false);
    toast.success("Changes saved");
  };

  const handleCancel = () => {
    setEditedContent(content);
    setIsEditing(false);
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return "bg-muted";
    if (score >= 80) return "bg-green-500/10 text-green-700 dark:text-green-400";
    if (score >= 60) return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400";
    return "bg-red-500/10 text-red-700 dark:text-red-400";
  };

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <Card>
        <CollapsibleTrigger className="w-full p-4 hover:bg-accent/50 transition-colors">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <ChevronDown
                className={`h-4 w-4 transition-transform ${isOpen ? "" : "-rotate-90"}`}
              />
              <div className="text-left">
                <h4 className="font-semibold">{title}</h4>
                <p className="text-xs text-muted-foreground">Line {lineNumber}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {confidenceScore !== undefined && (
                <Badge className={getConfidenceColor(confidenceScore)} variant="secondary">
                  {confidenceScore}% confidence
                </Badge>
              )}
              <Badge variant="outline">{wordCount} words</Badge>
            </div>
          </div>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="p-4 pt-0 space-y-3">
            {highlights.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {highlights.map((h, idx) => (
                  <Badge
                    key={idx}
                    variant="outline"
                    className={
                      h.type === "strong"
                        ? "bg-green-500/10 text-green-700 border-green-200"
                        : h.type === "weak"
                        ? "bg-yellow-500/10 text-yellow-700 border-yellow-200"
                        : "bg-red-500/10 text-red-700 border-red-200"
                    }
                  >
                    {h.type === "strong" ? "💡" : h.type === "weak" ? "⚠️" : "❌"} {h.text}
                  </Badge>
                ))}
              </div>
            )}

            {isEditing ? (
              <div className="space-y-3">
                <Textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="min-h-[200px] font-mono text-sm"
                />
                <div className="flex gap-2">
                  <Button onClick={handleSave} size="sm">
                    <Check className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                  <Button onClick={handleCancel} variant="outline" size="sm">
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="bg-muted/30 rounded-lg p-4 border border-border">
                  <p className="whitespace-pre-wrap text-sm">{content}</p>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                    <Edit2 className="h-4 w-4 mr-2" />
                    Edit
                  </Button>
                  <Button onClick={handleCopy} variant="outline" size="sm">
                    <Copy className="h-4 w-4 mr-2" />
                    Copy
                  </Button>
                </div>
              </>
            )}
          </div>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};
