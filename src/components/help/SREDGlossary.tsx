import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Search, BookOpen } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import Fuse from "fuse.js";

interface GlossaryTerm {
  term: string;
  category: "core" | "process" | "forms" | "financial";
  definition: string;
  example?: string;
  relatedTerms?: string[];
  t4088Reference?: string;
}

const glossaryTerms: GlossaryTerm[] = [
  {
    term: "Technological Uncertainty",
    category: "core",
    definition: "A technical problem or obstacle that cannot be resolved using standard, publicly available methods or routine engineering. The solution must not be readily determinable by a competent professional.",
    example: "Developing a new algorithm because existing solutions cannot meet performance requirements.",
    relatedTerms: ["Systematic Investigation", "Technological Advancement"],
    t4088Reference: "Section 2.1"
  },
  {
    term: "Systematic Investigation",
    category: "core",
    definition: "The process of experimentation or analysis used to test a hypothesis. It involves forming a hypothesis, testing it, observing results, and repeating the cycle.",
    example: "Running multiple experiments with different parameters to test if a new caching strategy improves performance.",
    relatedTerms: ["Technological Uncertainty", "Hypothesis"],
    t4088Reference: "Section 2.2"
  },
  {
    term: "Technological Advancement",
    category: "core",
    definition: "Work that attempts to advance the 'technology base' (collective knowledge of the field). Success is not required - a failed experiment that proves a hypothesis wrong is still an advancement.",
    example: "Proving that a proposed solution doesn't work eliminates a potential approach and advances knowledge.",
    relatedTerms: ["Technological Uncertainty", "SR&ED Project"],
    t4088Reference: "Section 2.3"
  },
  {
    term: "T661 Form",
    category: "forms",
    definition: "The main form for SR&ED claims: 'Scientific Research and Experimental Development (SR&ED) Expenditures Claim'.",
    example: "Must be filed within 18 months of the end of the tax year.",
    relatedTerms: ["T4088 Guide", "Line 242", "Line 244", "Line 246"],
  },
  {
    term: "Line 242",
    category: "forms",
    definition: "Describe the Scientific or Technological Uncertainty section of the T661 form.",
    example: "What was the technical problem that couldn't be solved with existing methods?",
    relatedTerms: ["Line 244", "Line 246", "T661 Form"],
  },
  {
    term: "Line 244",
    category: "forms",
    definition: "Describe the Systematic Investigation section of the T661 form.",
    example: "How did you test your hypotheses? What experiments did you conduct?",
    relatedTerms: ["Line 242", "Line 246", "T661 Form"],
  },
  {
    term: "Line 246",
    category: "forms",
    definition: "Describe the Scientific or Technological Advancement section of the T661 form.",
    example: "What knowledge did you gain? How did this advance the technology base?",
    relatedTerms: ["Line 242", "Line 244", "T661 Form"],
  },
  {
    term: "Contemporaneous Documentation",
    category: "process",
    definition: "Evidence of work generated at the time the work was done. The CRA gives this far more weight than narratives written from memory.",
    example: "Dated timesheets, code commits, Jira tickets, meeting minutes, lab notebooks.",
    relatedTerms: ["CRA Review", "Documentation"],
  },
  {
    term: "Specified Employee",
    category: "financial",
    definition: "An employee who owns 10% or more of the company's shares OR is related to someone who does (parent, spouse, sibling, child).",
    example: "A founder's spouse working in the business may have salary caps even without share ownership.",
    relatedTerms: ["Expenditure Cap", "CCPC"],
  },
  {
    term: "Proxy Method",
    category: "financial",
    definition: "A simplified method for calculating overhead expenditures as a percentage of SR&ED-eligible salaries. You cannot claim specific overheads when using this method.",
    example: "Calculate a Prescribed Proxy Amount (PPA) instead of tracking individual overhead costs.",
    relatedTerms: ["Traditional Method", "Expenditure"],
  }
];

const categoryColors: Record<GlossaryTerm["category"], string> = {
  core: "bg-primary/10 text-primary",
  process: "bg-accent/10 text-accent",
  forms: "bg-secondary/10 text-secondary-foreground",
  financial: "bg-muted text-muted-foreground"
};

export const SREDGlossary = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<GlossaryTerm["category"] | "all">("all");

  const fuse = new Fuse(glossaryTerms, {
    keys: ["term", "definition", "example"],
    threshold: 0.3,
  });

  const filteredTerms = searchQuery
    ? fuse.search(searchQuery).map(result => result.item)
    : glossaryTerms;

  const displayedTerms = selectedCategory === "all"
    ? filteredTerms
    : filteredTerms.filter(t => t.category === selectedCategory);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <BookOpen className="h-5 w-5 text-primary" />
        <h3 className="text-lg font-semibold">SR&ED Glossary</h3>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search terms..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="pl-10"
        />
      </div>

      <div className="flex flex-wrap gap-2">
        <Badge
          variant={selectedCategory === "all" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("all")}
        >
          All
        </Badge>
        <Badge
          variant={selectedCategory === "core" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("core")}
        >
          Core Concepts
        </Badge>
        <Badge
          variant={selectedCategory === "process" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("process")}
        >
          Process
        </Badge>
        <Badge
          variant={selectedCategory === "forms" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("forms")}
        >
          Forms
        </Badge>
        <Badge
          variant={selectedCategory === "financial" ? "default" : "outline"}
          className="cursor-pointer"
          onClick={() => setSelectedCategory("financial")}
        >
          Financial
        </Badge>
      </div>

      <ScrollArea className="h-[500px]">
        <div className="space-y-4 pr-4">
          {displayedTerms.map((term) => (
            <Card key={term.term} className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-2">
                <h4 className="font-semibold text-lg">{term.term}</h4>
                <Badge className={categoryColors[term.category]} variant="secondary">
                  {term.category}
                </Badge>
              </div>

              <p className="text-sm text-foreground">{term.definition}</p>

              {term.example && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-xs font-semibold text-muted-foreground mb-1">Example:</p>
                  <p className="text-sm">{term.example}</p>
                </div>
              )}

              {term.t4088Reference && (
                <p className="text-xs text-muted-foreground">
                  📖 T4088 Reference: {term.t4088Reference}
                </p>
              )}

              {term.relatedTerms && term.relatedTerms.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs text-muted-foreground">Related:</span>
                  {term.relatedTerms.map(related => (
                    <Badge key={related} variant="outline" className="text-xs">
                      {related}
                    </Badge>
                  ))}
                </div>
              )}
            </Card>
          ))}

          {displayedTerms.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              <p>No terms found matching "{searchQuery}"</p>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
};
