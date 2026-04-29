import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { HelpCircle } from "lucide-react";
import { SREDGlossary } from "./SREDGlossary";
import { ExampleGallery } from "./ExampleGallery";

export const HelpDrawer = () => {
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" data-tour="help-button" aria-describedby="help-button-description">
          <HelpCircle className="h-4 w-4 mr-2" aria-hidden="true" />
          <span className="hidden sm:inline">Help & Resources</span>
          <span className="sm:hidden">Help</span>
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto" aria-describedby="help-content-description">
        <SheetHeader>
          <SheetTitle>Help & Resources</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="glossary" className="mt-6">
          <TabsList className="grid w-full grid-cols-2" role="tablist" aria-label="Help sections">
            <TabsTrigger value="glossary" className="text-sm">Glossary</TabsTrigger>
            <TabsTrigger value="examples" className="text-sm">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="glossary" className="mt-4" role="tabpanel" aria-labelledby="glossary-tab">
            <SREDGlossary />
          </TabsContent>

          <TabsContent value="examples" className="mt-4" role="tabpanel" aria-labelledby="examples-tab">
            <ExampleGallery />
          </TabsContent>
        </Tabs>
        
        <div className="sr-only">
          <p id="help-button-description">Opens help panel with glossary and examples</p>
          <p id="help-content-description">Help panel containing SR&ED terminology and example narratives</p>
        </div>
      </SheetContent>
    </Sheet>
  );
};
