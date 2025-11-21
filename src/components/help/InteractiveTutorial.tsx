import { useState, useEffect } from "react";
import Joyride, { CallBackProps, STATUS, Step } from "react-joyride";

interface InteractiveTutorialProps {
  onComplete: () => void;
}

export const InteractiveTutorial = ({ onComplete }: InteractiveTutorialProps) => {
  const [run, setRun] = useState(false);

  useEffect(() => {
    // Start tutorial after a short delay
    const timer = setTimeout(() => setRun(true), 500);
    return () => clearTimeout(timer);
  }, []);

  const steps: Step[] = [
    {
      target: "body",
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold text-lg">Welcome to SR&ED GPT! 🎉</h3>
          <p>Let me show you around in 4 quick steps.</p>
        </div>
      ),
      placement: "center",
    },
    {
      target: '[data-tour="wizard-flow"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Step 1: Upload & Generate</h3>
          <p>Upload your technical documentation files (screenshots, tables, diagrams) or paste text. Then click "Generate Narrative" to create your SR&ED documentation.</p>
        </div>
      ),
      placement: "right",
    },
    {
      target: '[data-tour="help-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Step 2: Help & Resources</h3>
          <p>Access the SR&ED glossary, view examples, and find answers to common questions about eligibility and documentation.</p>
        </div>
      ),
      placement: "bottom",
    },
    {
      target: '[data-tour="chat-button"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Step 3: Chat Assistant</h3>
          <p>Ask questions about SR&ED, technological uncertainty, eligible expenses, or get help with specific lines on Form T661.</p>
        </div>
      ),
      placement: "top",
    },
    {
      target: '[data-tour="history"]',
      content: (
        <div className="space-y-2">
          <h3 className="font-semibold">Step 4: Session History</h3>
          <p>All generated narratives are saved here during your session. Download any result for later use.</p>
        </div>
      ),
      placement: "left",
    },
  ];

  const handleJoyrideCallback = (data: CallBackProps) => {
    const { status } = data;
    
    if (status === STATUS.FINISHED || status === STATUS.SKIPPED) {
      setRun(false);
      onComplete();
    }
  };

  return (
    <Joyride
      steps={steps}
      run={run}
      continuous
      showProgress
      showSkipButton
      callback={handleJoyrideCallback}
      styles={{
        options: {
          primaryColor: "hsl(var(--primary))",
          textColor: "hsl(var(--foreground))",
          backgroundColor: "hsl(var(--background))",
          arrowColor: "hsl(var(--background))",
          overlayColor: "rgba(0, 0, 0, 0.5)",
        },
        tooltip: {
          borderRadius: "var(--radius)",
        },
        buttonNext: {
          backgroundColor: "hsl(var(--primary))",
          borderRadius: "var(--radius)",
        },
        buttonBack: {
          color: "hsl(var(--muted-foreground))",
        },
      }}
    />
  );
};
