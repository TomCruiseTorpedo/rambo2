import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Layers, FileText, HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface ProcessingModeSelectorProps {
  value: "combined" | "separate";
  onChange: (value: "combined" | "separate") => void;
  inputCount: number;
}

export const ProcessingModeSelector = ({
  value,
  onChange,
  inputCount
}: ProcessingModeSelectorProps) => {
  const recommended = inputCount > 1 ? "combined" : "separate";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Label className="text-base font-semibold">Processing Mode</Label>
        <Tooltip>
          <TooltipTrigger>
            <HelpCircle className="h-4 w-4 text-muted-foreground" />
          </TooltipTrigger>
          <TooltipContent className="max-w-xs">
            <p>Choose how to process multiple inputs: combine them into one narrative or generate separate narratives for each.</p>
          </TooltipContent>
        </Tooltip>
      </div>

      <RadioGroup value={value} onValueChange={onChange} className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          className={`relative cursor-pointer transition-all ${
            value === "combined"
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("combined")}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="combined" id="combined" />
                <Label htmlFor="combined" className="cursor-pointer font-semibold">
                  <Layers className="h-4 w-4 inline mr-1" />
                  Combined Context
                </Label>
              </div>
              {recommended === "combined" && (
                <Badge variant="secondary" className="text-xs">Recommended</Badge>
              )}
            </div>

            <p className="text-sm text-muted-foreground ml-6">
              Merges all inputs into a single comprehensive narrative. Best for related work on the same project.
            </p>

            <div className="ml-6 space-y-1 text-xs text-muted-foreground">
              <p>✓ Output: 1 unified narrative</p>
              <p>✓ Context across all inputs</p>
              <p>✓ Stronger connections between work</p>
            </div>
          </div>
        </Card>

        <Card
          className={`relative cursor-pointer transition-all ${
            value === "separate"
              ? "border-primary ring-2 ring-primary/20"
              : "border-border hover:border-primary/50"
          }`}
          onClick={() => onChange("separate")}
        >
          <div className="p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-2">
                <RadioGroupItem value="separate" id="separate" />
                <Label htmlFor="separate" className="cursor-pointer font-semibold">
                  <FileText className="h-4 w-4 inline mr-1" />
                  Separate Narratives
                </Label>
              </div>
            </div>

            <p className="text-sm text-muted-foreground ml-6">
              Creates individual narratives for each input. Best for distinct projects or unrelated work.
            </p>

            <div className="ml-6 space-y-1 text-xs text-muted-foreground">
              <p>✓ Output: Multiple reports</p>
              <p>✓ Each input treated independently</p>
              <p>✓ Clear separation of projects</p>
            </div>
          </div>
        </Card>
      </RadioGroup>
    </div>
  );
};
