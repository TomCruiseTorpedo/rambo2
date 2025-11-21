import { useState } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";

interface Message {
  type: "user" | "bot";
  content: string;
}

const faqAnswers: Record<string, string> = {
  "what is sred": "SR&ED (Scientific Research and Experimental Development) is Canada's largest federal support program for R&D. It provides cash refunds or tax credits for eligible research and development expenditures.",
  "technological uncertainty": "Technological Uncertainty is a technical problem that cannot be resolved using standard, publicly available methods or routine engineering. It's the foundation of SR&ED eligibility.",
  "documentation": "The most important evidence is 'contemporaneous documentation' - proof generated at the time work was done, like dated timesheets, code commits, Jira tickets, and meeting minutes.",
  "failed projects": "Yes! SR&ED is about the process of investigation, not commercial success. A failed experiment that proves a hypothesis wrong is still a technological advancement and is 100% eligible.",
  "line 242": "Line 242 asks you to describe the Scientific or Technological Uncertainty - the specific technical problem that couldn't be solved with existing methods.",
  "line 244": "Line 244 asks you to describe the Systematic Investigation - how you tested hypotheses, what experiments you conducted, and your iterative process.",
  "line 246": "Line 246 asks you to describe the Scientific or Technological Advancement - what knowledge you gained and how it advanced the technology base.",
};

const faqButtons = [
  { label: "What is SR&ED?", key: "what is sred" },
  { label: "Technological Uncertainty?", key: "technological uncertainty" },
  { label: "What documentation?", key: "documentation" },
  { label: "Can I claim failed projects?", key: "failed projects" },
  { label: "What's Line 242?", key: "line 242" },
];

export const HelpBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { type: "bot", content: "Hi! I'm here to help you understand SR&ED. Click a question below or type your own." }
  ]);
  const [input, setInput] = useState("");

  const handleFaqClick = (key: string) => {
    const question = faqButtons.find(b => b.key === key)?.label || key;
    setMessages(prev => [
      ...prev,
      { type: "user", content: question },
      { type: "bot", content: faqAnswers[key] || "I don't have an answer for that yet. Try the glossary for more detailed information." }
    ]);
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage = input.trim().toLowerCase();
    setMessages(prev => [...prev, { type: "user", content: input }]);
    setInput("");

    // Simple pattern matching
    const matchedKey = Object.keys(faqAnswers).find(key => 
      userMessage.includes(key) || faqAnswers[key].toLowerCase().includes(userMessage)
    );

    const response = matchedKey 
      ? faqAnswers[matchedKey]
      : "I'm not sure about that. Try clicking one of the suggested questions or check the SR&ED Glossary for more detailed information.";

    setTimeout(() => {
      setMessages(prev => [...prev, { type: "bot", content: response }]);
    }, 500);
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg z-50"
        size="icon"
        data-tour="chat-button"
      >
        <MessageCircle className="h-5 w-5 sm:h-6 sm:w-6" />
      </Button>
    );
  }

  return (
    <Card className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 w-[calc(100vw-2rem)] sm:w-96 max-w-md h-[calc(100vh-8rem)] sm:h-[500px] shadow-xl flex flex-col animate-in slide-in-from-bottom-2 z-50">
      <div className="flex items-center justify-between p-4 border-b">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">SR&ED Help Bot</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {messages.map((msg, idx) => (
            <div
              key={idx}
              className={`flex ${msg.type === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[80%] rounded-lg p-3 ${
                  msg.type === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted"
                }`}
              >
                <p className="text-sm">{msg.content}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <div className="p-4 border-t space-y-2">
        <div className="flex flex-wrap gap-2">
          {faqButtons.map(btn => (
            <Badge
              key={btn.key}
              variant="outline"
              className="cursor-pointer hover:bg-accent"
              onClick={() => handleFaqClick(btn.key)}
            >
              {btn.label}
            </Badge>
          ))}
        </div>

        <div className="flex gap-2">
          <Input
            placeholder="Ask a question..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
          />
          <Button size="icon" onClick={handleSend}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </Card>
  );
};
