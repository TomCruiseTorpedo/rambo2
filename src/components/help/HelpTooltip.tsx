import { HelpCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ReactNode } from "react";

interface HelpTooltipProps {
  content: ReactNode;
  children?: ReactNode;
}

export const HelpTooltip = ({ content, children }: HelpTooltipProps) => {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        {children || (
          <button className="inline-flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <HelpCircle className="h-4 w-4" />
          </button>
        )}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm">
        {content}
      </TooltipContent>
    </Tooltip>
  );
};
