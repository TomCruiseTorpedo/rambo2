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
        <Button variant="outline" size="sm" data-tour="help-button">
          <HelpCircle className="h-4 w-4 mr-2" />
          Help & Resources
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Help & Resources</SheetTitle>
        </SheetHeader>

        <Tabs defaultValue="glossary" className="mt-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="glossary">Glossary</TabsTrigger>
            <TabsTrigger value="examples">Examples</TabsTrigger>
          </TabsList>

          <TabsContent value="glossary" className="mt-4">
            <SREDGlossary />
          </TabsContent>

          <TabsContent value="examples" className="mt-4">
            <ExampleGallery />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};
