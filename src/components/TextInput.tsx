import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";

interface TextInputProps {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
}

export const TextInput = ({ value, onChange, disabled }: TextInputProps) => {
  return (
    <div className="space-y-3">
      <Label htmlFor="text-input" className="text-base font-semibold">
        Paste Technical Data
      </Label>
      <Textarea
        id="text-input"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="Example:
feat(parser): Implement recursive descent parser
fix(lexer): Handle escaped characters
test(compiler): Add edge case coverage for error handling

Paste git logs, Jira tickets, architecture notes, or any technical documentation here..."
        className="min-h-[300px] resize-none text-sm font-mono"
      />
    </div>
  );
};
