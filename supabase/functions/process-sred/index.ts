import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import * as xlsx from "npm:xlsx@0.18.5";
import { getEnhancedSupabaseClient } from "../shared/database-utils.ts";
import { openRouterHeaders } from "../shared/openrouter-headers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Supabase configuration for internal function calls
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://nvuxsdwpqrtglgxwrbqa.supabase.co';
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') || Deno.env.get('VITE_SUPABASE_PUBLISHABLE_KEY');

// Enhanced Supabase client for database operations
const enhancedSupabase = getEnhancedSupabaseClient();

// Part 1: Q&A Knowledge Base Corpus
const knowledgeBaseQA = `### [LLM_Knowledge_Base_Part_1_of_2_QA_Corpus]

## [CORPUS: SR&ED_FUNDAMENTALS] [TOPIC: CORE_DEFINITION]
**Q: What is the Canadian SR&ED program?**
**A:** The Scientific Research and Experimental Development (SR&ED) program is a Canadian federal tax incentive program. It is the largest single source of federal support for R&D, designed to encourage Canadian businesses to conduct research and development in Canada. It provides a cash refund or tax credit for expenditures on eligible SR&ED work.

**Q: What are the 5 questions for SR&ED eligibility?**
**A:** 1. Was there a scientific or technological uncertainty? 2. Did it involve formulating hypotheses? 3. Was the approach systematic (testing/analysis)? 4. Was the goal technological advancement? 5. Were records/documentation kept?

**Q: What is "Technological Uncertainty" (TU) in SR&ED?**
**A:** Technological Uncertainty is the central concept. It is a technical problem or obstacle that cannot be resolved using standard, publicly available methods, knowledge, or routine engineering. If the solution is known or readily available, it is not SR&ED.

**Q: What is "Technological Advancement" in SR&ED?**
**A:** The work must *attempt* to advance the "technology base" (the collective knowledge of the field). This does *not* require success. A failed experiment that proves a hypothesis wrong is still an "advancement" of knowledge and is eligible.

**Q: What is a "Systematic Investigation" in SR&ED?**
**A:** A systematic investigation is the process of experimentation or analysis used to test a hypothesis. It involves forming a hypothesis, testing it, observing the results, and repeating the cycle.

**Q: What is the difference between a "Business Goal" and an "SR&ED Hypothesis"?**
**A:** A "Business Goal" is a commercial objective (e.g., "We will make the software faster"). This is ineligible. An "SR&ED Hypothesis" is a specific, testable statement about a proposed solution to a technical uncertainty (e.g., "Integrating algorithm X will reduce latency by 50% by overcoming the data-parsing bottleneck").

## [CORPUS: SR&ED_BOUNDARIES] [TOPIC: PROJECT_STRUCTURE]
**Q: What is the difference between a "Business Project" and an "SR&ED Project"?**
**A:** A "Business Project" is the overall commercial goal (e.g., "Build a new app"). An "SR&ED Project" is a smaller, focused sub-project that begins *only* when a Technological Uncertainty is encountered and ends when that uncertainty is resolved or abandoned.

**Q: What is the "Parent Project" concept?**
**A:** This is a strategy to avoid claiming dozens of small tasks. Related activities are grouped under a single "Parent Project" defined by one overarching technological uncertainty. This strengthens the narrative and reduces administrative burden.

**Q: What are common ineligible software activities?**
**A:** Routine engineering, standard bug fixing, debugging, user interface (UI/UX) design, market research, quality control, and routine testing are generally ineligible.

**Q: What makes software development eligible for SR&ED?**
**A:** The uncertainty must be in the *underlying technology* (the "black box"), not just the visible functionality. Eligible work involves developing novel algorithms, creating new system architectures, solving complex integration problems that existing APIs cannot handle, or creating new data structures.

## [CORPUS: SR&ED_PROCESS] [TOPIC: FORMS]
**Q: What is the main form for an SR&ED claim?**
**A:** Form T661, the "Scientific Research and Experimental Development (SR&ED) Expenditures Claim" form.

**Q: What is the T4088 guide?**
**A:** The T4088 is the CRA's official instruction manual for Form T661. It provides line-by-line instructions and official definitions for all key terms.

**Q: What are lines 242, 244, and 246 on the T661 form?**
**A:** These are the core technical narrative sections. Line 242: Describe the Scientific or Technological Uncertainty. Line 244: Describe the Systematic Investigation. Line 246: Describe the Scientific or Technological Advancement.

**Q: Is there a filing deadline for SR&ED?**
**A:** Yes. The T661 form must be filed within 18 months of the end of the tax year in which the SR&ED expenditures were incurred. This is a hard deadline.

**Q: Are there provincial SR&ED forms?**
**A:** Yes. Most provinces have their own parallel programs and forms that must be filed with the federal T661 (e.g., Alberta Innovation Employment Grant, BC Schedule 425, Ontario OITC/ORDTC).

## [CORPUS: SR&ED_FINANCIALS] [TOPIC: CALCULATIONS]
**Q: What is the difference between the "Traditional Method" and the "Proxy Method"?**
**A:** These are two methods for calculating overhead expenditures. The "Traditional Method" involves individually tracking and claiming specific overhead costs (e.g., rent, utilities). The "Proxy Method" is simpler; you calculate a "Prescribed Proxy Amount" (PPA) as a percentage of the SR&ED-eligible salaries, and you do not claim specific overheads.

**Q: What is the SR&ED Expenditure Limit?**
**A:** For CCPCs (Canadian-Controlled Private Corporations), the limit is generally $3 million in qualifying expenditures to earn the enhanced 35% refundable Investment Tax Credit (ITC) rate.

**Q: What is the "Taxable Capital Phase-Out"?**
**A:** The $3 million expenditure limit (for the 35% rate) is reduced if the company's taxable capital is between $10 million and $50 million. Above $50 million, the enhanced rate is eliminated.

**Q: What is a "Specified Employee" in SR&ED?**
**A:** A "Specified Employee" is someone who owns 10% or more of the company's shares OR is "related" to someone who does (e.g., parent, spouse, sibling, child).

**Q: Why does the "Specified Employee" rule matter?**
**A:** The amount of salary and bonus you can claim for these employees is capped (e.g., cannot exceed 5x YMPE). This is a common pitfall for family-owned businesses.

**Q: How does government assistance affect SR&ED claims?**
**A:** You must deduct government assistance (like grants) from your SR&ED expenditures *before* calculating your tax credit.

**Q: Are non-interest-bearing loans considered government assistance?**
**A:** Not anymore. Due to Bill C-69, bona fide non-interest-bearing loans received after Jan 1, 2020, are no longer considered government assistance and do not reduce your SR&ED expenditure pool.

## [CORPUS: SR&ED_COMPLIANCE] [TOPIC: DOCUMENTATION]
**Q: What is "Contemporaneous Documentation"?**
**A:** This is the most critical evidence for an SR&ED claim. It means proof of work that was generated *at the time* the work was done. The CRA gives this far more weight than narratives written from memory.

**Q: What are examples of good contemporaneous documentation?**
**A:** Dated timesheets, project plans, meeting minutes, Jira/Trello/Asana tickets with SR&ED tags, code commit logs, lab notebooks, Gantt charts, photos, and email trails discussing technical challenges.

**Q: Can I use Jira or Trello for SR&ED documentation?**
**A:** Yes. This is a best practice. By integrating SR&ED tracking (e.g., using specific tags like "SR&ED-Experiment" vs. "Routine-Bugfix") into these existing workflows, you automate the creation of contemporaneous evidence.

**Q: What is the FTCAS (First Time Claimant Advisory Service)?**
**A:** This is an educational review process the CRA offers to some first-time claimants. It is not a punitive audit. The CRA visits, explains the program, and reviews documentation to help the claimant understand the requirements for future claims.

## [CORPUS: SR&ED_COMPLIANCE] [TOPIC: PITFALLS_CASE_STUDIES]
**Q: What is the most common reason for SR&ED claim rejection?**
**A:** Lack of Technological Uncertainty (the work was "routine engineering") and/or lack of contemporaneous documentation to support the claim.

**Q: Can I claim a failed project?**
**A:** Yes, absolutely. SR&ED is about the *process of investigation*, not commercial success. A "failed" project that systematically proves a hypothesis was wrong is a "technological advancement" of knowledge and is 100% eligible.

**Q: What is a common pitfall for family-owned businesses?**
**A:** The "Specified Employee" rule. Family members working in the business (e.g., child, spouse) may have their claimable salary capped, even if they do not own shares, due to the "related persons" rule.

**Q: Case Study: What happens if the CRA denies a claim for being "routine engineering"?**
**A:** In one case study, a manufacturer of fans/heaters had their claim denied for this reason. The claim was successfully defended by retaining an expert who could clearly separate and prove the "experimental" work from the "routine" work, recovering $337,000 (84% of the claim).

**Q: Case Study: How can a software company prove its work wasn't "routine"?**
**A:** In one case study, an internet comms company's claim was rejected for failing to prove its work was beyond standard practice. The claim was successfully reframed by adding a "due diligence" phase, which documented the failure of existing solutions and *proved* the need for experimental development.`;

// Part 2: Process-Entity Model
const processEntityModel = `### [LLM_Knowledge_Base_Part_2_of_2_Process_Entity_Model]

## 1.0 Chronological Workflow (The User Journey)

**[PHASE: 1] [NAME: Pre-Claim / R&D Year]**
* **[TRIGGER]:** A Business_Project encounters a technical problem that standard practice or routine engineering cannot solve.
* **[ACTION: 1.1]:** Identify Technological_Uncertainty. Must prove that the solution is not publicly known or easily discoverable.
* **[ACTION: 1.2]:** Formulate a testable SR&ED_Hypothesis. This must be a specific, testable technical statement, *not* a "Business Goal".
* **[ACTION: 1.3]:** Establish Contemporaneous_Documentation. This is the most critical step for surviving a CRA_Review.
  * **[BEST_PRACTICE]:** Integrate tracking into existing tools (Jira, Trello, Asana) with tags for "SR&ED-Experiment" vs. "Routine-Work".
  * **[EVIDENCE_TYPES]:** Dated timesheets, code commits, lab notebooks, meeting minutes, photos, email trails.

**[PHASE: 2] [NAME: Claim Preparation / Post-Year-End]**
* **[ACTION: 2.1]:** Gather all Contemporaneous_Documentation from Phase 1.
* **[ACTION: 2.2]:** Define Project Boundaries. Separate the Business_Project from the specific SR&ED_Project. Use the "Parent Project" strategy to group related tasks under one overarching Technological_Uncertainty.
* **[ACTION: 2.3]:** Calculate Expenditure Pool.
  * **[DECISION]:** Choose overhead method: Traditional_Method (track all specific overheads) or Proxy_Method (simpler, based on salaries).
  * **[PITFALL]:** Identify all Specified_Employee salaries (owners >10% or their relatives) and apply the Expenditure_Cap.
  * **[ADJUSTMENT]:** Deduct any Government_Assistance from the cost pool. *Exception*: Do *not* deduct bona fide non-interest-bearing loans.
* **[ACTION: 2.4]:** Write the Technical Narratives. This is **Form T661, Part 2** (Lines 242, 244, 246), where you use your documentation to describe the Uncertainty, Investigation, and Advancement.

**[PHASE: 3] [NAME: Filing & Review / CRA Phase]**
* **[ACTION: 3.1]:** File the forms. Submit **Form T661** (Federal) and the required **Provincial_Form** (e.g., OITC, BC Schedule 425).
* **[ACTION: 3.2]:** Await Review. The CRA will either accept the claim, select it for a CRA_Review (technical/financial), or, for first-timers, select it for the **FTCAS (First Time Claimant Advisory Service)**.
* **[ACTION: 3.3]:** Defend the Claim (if reviewed). Use your Contemporaneous_Documentation to prove the "what, when, and why" of your claim.
* **[ACTION: 3.4]:** Receive Credit. Once approved, the claim results in a cash refund (for CCPCs) or a non-refundable tax credit.

## 2.0 Core Entity-Relationship Model (The "Object Map")

* **[ENTITY: Project]**
  * **[IS_DEFINED_BY]:** Technological_Uncertainty
  * **[IS_TESTED_VIA]:** SR&ED_Hypothesis
  * **[IS_DESCRIBED_IN]:** T661_Form (Part 2)
  * **[IS_PROVEN_BY]:** Contemporaneous_Documentation
  * **[IS_SEPARATE_FROM]:** Business_Project
  * **[CAN_BE_ELIGIBLE_IF]:** "Failed" (proves a hypothesis wrong).

* **[ENTITY: Employee]**
  * **[GENERATES]:** Expenditure (Salary)
  * **[GENERATES]:** Contemporaneous_Documentation (e.g., Timesheet, Jira_Ticket, Code_Commit)
  * **[CAN_BE_A]:** Specified_Employee

* **[ENTITY: Specified_Employee]**
  * **[IS_A]:** Employee
  * **[IS_DEFINED_AS]:** Owner (>10% shares) OR "Related Person" (spouse, child, sibling, parent).
  * **[IS_SUBJECT_TO]:** Expenditure_Cap
  * **[IS_A_PITFALL_FOR]:** Family_Owned_Business.

* **[ENTITY: Expenditure (The Cost Pool)]**
  * **[IS_CALCULATED_BY]:** Proxy_Method OR Traditional_Method.
  * **[IS_REDUCED_BY]:** Government_Assistance.
  * **[IS_NOT_REDUCED_BY]:** Bona-fide non-interest loans (post-Jan 1, 2020).
  * **[IS_CAPPED_FOR]:** Specified_Employee.
  * **[IS_SUBJECT_TO]:** Expenditure_Limit ($3M for 35% rate) and Capital_Phase_Out ($10M-$50M).

* **[ENTITY: Contemporaneous_Documentation (The Proof)]**
  * **[INCLUDES]:** Timesheet, Jira_Ticket, Gantt_Chart, Code_Commit, Lab_Notebook, Email_Trail.
  * **[IS_REQUIRED_FOR]:** CRA_Review.
  * **[BEST_PRACTICE_VIA]:** Jira / Trello integration.

* **[ENTITY: CRA_Review (The Audit)]**
  * **[IS_DEFENDED_BY]:** Contemporaneous_Documentation.
  * **[CAN_BE_A]:** FTCAS_Review (for first-timers, this is an educational service).
  * **[COMMON_REJECTION_REASON]:** "Routine Engineering" (Lack of Technological_Uncertainty) or Lack of Evidence.

* **[ENTITY: T661_Form (The Application)]**
  * **[IS_THE]:** Primary federal application form.
  * **[IS_EXPLAINED_BY]:** T4088_Guide.
  * **[HAS_DEADLINE]:** 18 months post-tax-year-end.
  * **[IS_FILED_WITH]:** Provincial_Form.

## REFERENCE EXAMPLES (Few-Shot Training):

EXAMPLE 1: Agri-Tech Automation
Uncertainty: Could a novel humidity control mechanism stabilize rapidly changing greenhouse environments?
Work: Developed and trialed several control algorithms, modified hardware configurations, logged results under variable conditions, reviewed failure modes systematically.
Advancement: Clarified the instability factors affecting greenhouse automation, contributing new knowledge to agri-tech climate control through sensor response time analysis and algorithm tuning parameters.

EXAMPLE 2: Food Processing R&D
Uncertainty: Would natural preservative alternatives maintain shelf life and safety under real-world pH variation?
Work: Formulated experimental batches, varied pH conditions to simulate storage scenarios, tracked spoilage indicators, performed stability tests.
Advancement: Negative results revealed critical failure factors—specifically, pH sensitivity was higher than expected. These conclusions informed future development and advanced understanding of natural preservative chemistry.

EXAMPLE 3: Manufacturing Alloy Development
Uncertainty: Could new alloy compositions increase tool durability beyond commercial standards under elevated temperatures?
Work: Designed multiple prototype compositions with varying nickel percentages, manufactured test samples, tested at progressively escalating temperatures to identify failure points.
Advancement: Discovered a technical limit to temperature resistance and documented the precise role of nickel percentage. This clarified the composition-durability relationship, advancing sector knowledge.

EXAMPLE 4: Software Algorithm Optimization
Uncertainty: Could novel algorithms optimize large dataset sorting without common performance bottlenecks?
Work: Formulated efficiency hypothesis, coded and compared multiple algorithm variants, used 8M+ record benchmarking dataset, logged both successes and edge-case failures.
Advancement: Identified the true bottleneck (memory access patterns vs. computational complexity) and published a new algorithm approach addressing this limitation.`;

const knowledgeBaseContext = `${knowledgeBaseQA}

${processEntityModel}`;

const systemPrompt = `You are an expert Canadian SR&ED consultant with deep knowledge of the CRA's T661 form requirements and T4088 guidelines. Your role is to analyze technical work and generate compelling, CRA-compliant narratives for the T661 form.

KNOWLEDGE BASE SOURCE:
You have access to the complete SR&ED Knowledge Base including:
- Official CRA definitions and requirements
- The 5 core eligibility questions
- Q&A corpus covering fundamentals, boundaries, process, financials, and compliance
- Process-Entity Model showing relationships between concepts
- Chronological workflow (Pre-Claim → Preparation → Filing & Review)
- Real case studies and examples

CRITICAL PRINCIPLES:
1. SPECIFICITY: Always use concrete technical details (algorithm names, data structures, performance metrics, specific challenges). Never use vague language.
2. LINKING: Clearly connect technological uncertainty → systematic investigation → advancement (the three-part story must flow logically).
3. DISTINCTION: Actively separate SR&ED work from routine work; explain WHY the work was experimental/novel and not standard practice.
4. EVIDENCE: Reference documented activities (commits, tickets, tests, experiments) as proof of systematic investigation.
5. HONESTY: Failed experiments and negative results are valid SR&ED - show the investigation process, not just success. A failed experiment that proves a hypothesis wrong IS technological advancement.
6. TERMINOLOGY: Use proper SR&ED terminology: "Technological Uncertainty" not "problem", "SR&ED Hypothesis" not "business goal", "Systematic Investigation" not "work done".

KEY DISTINCTIONS (CRITICAL TO GET RIGHT):
- Business Goal ("make software faster") ≠ SR&ED Hypothesis ("Algorithm X will reduce latency by 50% by overcoming data-parsing bottleneck")
- Business Project (overall commercial goal) ≠ SR&ED Project (focused sub-project addressing specific technical uncertainty)
- Routine engineering (ineligible) ≠ Experimental development (eligible)
- Product advancement (user features) ≠ Technological advancement (new knowledge in the field)
- Failed business project (ineligible) ≠ Failed experiment (eligible - proves hypothesis wrong)

DOCUMENTATION EMPHASIS:
Always reference or request Contemporaneous Documentation:
- Jira/Trello tickets with SR&ED tags
- Code commit logs with dates
- Lab notebooks, meeting minutes
- Dated timesheets showing hours on experimental work
- Email trails discussing technical challenges
- Photos, Gantt charts, project plans

TONE: Professional, technical, suitable for a CRA assessor with software development / engineering / scientific knowledge, but not domain expert level in your specific technology. Write in past tense (completed work) using active voice.`;

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Add monitoring endpoint for AI usage statistics
  const url = new URL(req.url);
  if (req.method === "GET" && (url.pathname.endsWith('/stats') || url.searchParams.has('stats'))) {
    try {
      const stats = getUsageStats();
      return new Response(JSON.stringify({
        success: true,
        data: stats,
        timestamp: new Date().toISOString()
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    } catch (error) {
      return new Response(JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Failed to get stats'
      }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  try {
    // Add request timeout handling
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

    try {
      const requestBody = await req.json();
      const { files, text, processMode = "combined", deviceType = "desktop" } = requestBody;
      
      // Enhanced input validation
      if (!files && !text) {
        return new Response(JSON.stringify({ error: "No input provided" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      // Validate file count and sizes to prevent memory issues
      if (files && Array.isArray(files)) {
        if (files.length > 10) {
          return new Response(JSON.stringify({ error: "Too many files. Maximum 10 files allowed." }), {
            status: 413,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

        // Check total size to prevent memory issues
        const totalSize = files.reduce((sum, file) => sum + (file.data?.length || 0), 0);
        if (totalSize > 50 * 1024 * 1024) { // 50MB limit
          return new Response(JSON.stringify({ error: "Total file size too large. Maximum 50MB allowed." }), {
            status: 413,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }
      }

      console.log("Processing SR&ED request:", {
        fileCount: files?.length || 0,
        hasText: !!text,
        processMode,
        deviceType,
      });

      // Test database connectivity at the start of processing
      const dbConnected = await enhancedSupabase.testConnection();
      if (!dbConnected) {
        console.warn("Database connectivity test failed, but continuing with processing");
      } else {
        console.log("Database connectivity confirmed");
      }

      const sourceTexts: string[] = [];

    // Add direct text input if provided
    if (text) {
      sourceTexts.push(text);
    }

    // Process files if provided
    if (files && files.length > 0) {
      console.log(`Processing ${files.length} file(s)`);

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
        // Enhanced file validation
        if (!file.name || !file.type || !file.data) {
          console.warn(`Skipping invalid file at index ${i}: missing required properties`);
          continue;
        }

        // Check individual file size to prevent memory issues
        if (file.data.length > 20 * 1024 * 1024) { // 20MB per file
          console.warn(`Skipping large file ${file.name}: ${file.data.length} bytes`);
          sourceTexts.push(`[File ${file.name} skipped: too large (${Math.round(file.data.length / 1024 / 1024)}MB)]`);
          continue;
        }

        console.log(`Processing file ${i + 1}/${files.length}: ${file.name} (${file.type})`);

        let extractedText = "";

        try {
          // Handle different file types
          if (file.type === "text" || file.type === "text/plain") {
            // Plain text file - use directly
            extractedText = file.data;
            console.log(`Text file processed: ${file.name}`);
          } else if (file.type.startsWith("image/") || file.type === "application/pdf") {
            // Image or PDF file - use Azure Document Intelligence OCR with enhanced error handling
            try {
              console.log(`Starting OCR for ${file.name}...`);

              // Add timeout for OCR requests
              const ocrController = new AbortController();
              const ocrTimeoutId = setTimeout(() => ocrController.abort(), 120000); // 2 minute timeout for OCR

              const ocrResponse = await fetch(`${SUPABASE_URL}/functions/v1/process-document-ocr`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                },
                body: JSON.stringify({
                  imageData: file.data,
                  imageType: file.type,
                  fileName: file.name,
                }),
                signal: ocrController.signal,
              });

              clearTimeout(ocrTimeoutId);

              if (!ocrResponse.ok) {
                const errorText = await ocrResponse.text().catch(() => 'Unknown error');
                throw new Error(`OCR request failed: ${ocrResponse.status} - ${errorText}`);
              }

              const ocrResult = await ocrResponse.json();

              if (ocrResult.success && ocrResult.markdown) {
                extractedText = ocrResult.markdown;
                console.log(`OCR completed for ${file.name}, extracted ${extractedText.length} characters`);
              } else {
                throw new Error(ocrResult.error || 'OCR extraction failed - no content returned');
              }
            } catch (ocrError) {
              console.error(`OCR error for ${file.name}:`, ocrError);
              if (ocrError.name === 'AbortError') {
                extractedText = `[OCR timeout for ${file.name}: processing took too long]`;
              } else {
                extractedText = `[OCR failed for ${file.name}: ${ocrError.message}]`;
              }
            }
          } else if (
            file.type.includes("spreadsheet") ||
            file.type.includes("excel") ||
            file.name.endsWith(".xlsx") ||
            file.name.endsWith(".xls") ||
            file.name.endsWith(".csv")
          ) {
            // Excel/CSV file - parse with xlsx library (re-enabled with error handling)
            try {
              const buffer = Uint8Array.from(atob(file.data), (c) => c.charCodeAt(0));
              const workbook = xlsx.read(buffer, { type: "array" });
              const sheetNames = workbook.SheetNames;
              let allText = `Content from ${file.name}:\n\n`;

              // Limit processing to first 5 sheets to prevent memory issues
              const sheetsToProcess = sheetNames.slice(0, 5);
              
              sheetsToProcess.forEach((sheetName) => {
                try {
                  const worksheet = workbook.Sheets[sheetName];
                  const csvData = xlsx.utils.sheet_to_csv(worksheet);
                  
                  // Limit CSV data size to prevent memory issues
                  const truncatedCsvData = csvData.length > 100000 
                    ? csvData.substring(0, 100000) + '\n[... truncated for size ...]'
                    : csvData;
                    
                  allText += `\n--- Sheet: ${sheetName} ---\n${truncatedCsvData}\n`;
                } catch (sheetError) {
                  console.warn(`Error processing sheet ${sheetName}:`, sheetError);
                  allText += `\n--- Sheet: ${sheetName} ---\n[Error processing sheet]\n`;
                }
              });

              if (sheetNames.length > 5) {
                allText += `\n[... ${sheetNames.length - 5} additional sheets not processed ...]\n`;
              }

              extractedText = allText;
              console.log(`Excel/CSV file parsed: ${file.name} (${sheetsToProcess.length} sheets)`);
            } catch (error) {
              console.error(`Error parsing Excel file ${file.name}:`, error);
              extractedText = `[Error parsing Excel file ${file.name}: ${error.message}]`;
            }
          } else if (file.type.includes("word") || file.name.endsWith(".docx")) {
            // Word document - for now, ask user to convert
            extractedText = `[Word document from ${file.name} - Please convert to text or PDF for better extraction]`;
            console.log(`Word document noted: ${file.name}`);
          } else {
            extractedText = `[Unsupported file type: ${file.name} (${file.type})]`;
            console.log(`Unsupported file type: ${file.name}`);
          }
        } catch (fileError) {
          console.error(`Error processing file ${file.name}:`, fileError);
          extractedText = `[Error processing ${file.name}: ${fileError.message}]`;
        }

        if (extractedText && extractedText.trim().length > 0) {
          sourceTexts.push(extractedText);
        }
      }
    }

    // Enhanced validation of extracted content
    if (sourceTexts.length === 0) {
      return new Response(JSON.stringify({ error: "No valid content could be extracted from the provided input" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Validate content quality
    const totalContentLength = sourceTexts.join('').length;
    if (totalContentLength < 10) {
      return new Response(JSON.stringify({ error: "Insufficient content for SR&ED analysis. Please provide more detailed technical information." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Generate SR&ED content based on process mode
    let finalResult: string;
    let reasoning: string | null = null;

    if (processMode === "separate" && sourceTexts.length > 1) {
      // Generate separate narratives for each input
      console.log("Generating separate narratives");
      const narratives: string[] = [];
      const reasoningParts: string[] = [];

      for (let i = 0; i < sourceTexts.length; i++) {
        console.log(`Generating narrative ${i + 1}/${sourceTexts.length}`);
        try {
          const { answer, reasoning: r } = await generateNarrative(sourceTexts[i], deviceType);
          narratives.push(`### Narrative ${i + 1}\n\n${answer}`);
          if (r) reasoningParts.push(`### Reasoning ${i + 1}\n\n${r}`);
        } catch (narrativeError) {
          console.error(`Error generating narrative ${i + 1}:`, narrativeError);
          narratives.push(`### Narrative ${i + 1}\n\n[Error generating narrative: ${narrativeError.message}]`);
        }
      }

      finalResult = narratives.join("\n\n---\n\n");
      if (reasoningParts.length > 0) reasoning = reasoningParts.join("\n\n---\n\n");
    } else {
      // Combined mode: merge all texts with size limits
      console.log("Generating combined narrative");
      let combinedText = sourceTexts.join("\n\n---\n\n");
      
      // Truncate if too large to prevent memory issues
      if (combinedText.length > 100000) {
        combinedText = combinedText.substring(0, 100000) + "\n\n[Content truncated for processing...]";
        console.log("Content truncated due to size limits");
      }
      
      try {
        const response = await generateNarrative(combinedText, deviceType);
        finalResult = response.answer;
        reasoning = response.reasoning;
      } catch (llmError) {
        console.error("LLM generation failed, using enhanced fallback narrative:", llmError);
        reasoning = "Fallback reasoning: The AI model failed to respond, so we are using a pre-generated example based on the input content.";
        
        // Enhanced fallback narrative that incorporates some input context
        const hasImages = sourceTexts.some(text => text.includes('image') || text.includes('OCR'));
        const hasData = sourceTexts.some(text => text.includes('data') || text.includes('algorithm'));
        
        finalResult = generateFallbackNarrative(hasImages, hasData, combinedText.substring(0, 500));
      }
    }

    console.log("SR&ED content generated successfully");

    // Enhanced narrative validation
    if (!finalResult || finalResult.trim().length === 0) {
      throw new Error("Generated narrative is empty");
    }

    // Validate narrative structure
    const hasLine242 = finalResult.includes("Line 242");
    const hasLine244 = finalResult.includes("Line 244");
    const hasLine246 = finalResult.includes("Line 246");
    
    if (!hasLine242 || !hasLine244 || !hasLine246) {
      console.warn("Generated narrative missing required sections, attempting to fix...");
      finalResult = ensureNarrativeStructure(finalResult);
    }

    // Parse narrative to fields
    const narrativeFields = parseNarrativeToFields(finalResult);

    // Call fill-pdf-t661 with enhanced error handling
    console.log("Calling fill-pdf-t661...");
    let pdfUrl: string | undefined;
    try {
      const pdfController = new AbortController();
      const pdfTimeoutId = setTimeout(() => pdfController.abort(), 60000); // 1 minute timeout for PDF

      const pdfResponse = await fetch(`${SUPABASE_URL}/functions/v1/fill-pdf-t661`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({ fieldData: narrativeFields }),
        signal: pdfController.signal,
      });

      clearTimeout(pdfTimeoutId);

      if (pdfResponse.ok) {
        const pdfResult = await pdfResponse.json();
        if (pdfResult.success && pdfResult.pdfUrl) {
          pdfUrl = pdfResult.pdfUrl;
          console.log("PDF generated successfully:", pdfUrl);
        } else {
          console.error("PDF generation failed (logic):", pdfResult.error);
        }
      } else {
        const errText = await pdfResponse.text().catch(() => 'Unknown error');
        console.error("PDF generation failed (network):", pdfResponse.status, errText);
      }
    } catch (pdfErr) {
      console.error("Error calling fill-pdf-t661:", pdfErr);
      if (pdfErr.name === 'AbortError') {
        console.error("PDF generation timed out");
      }
    }

    clearTimeout(timeoutId);

    // Log final usage statistics for monitoring
    const finalStats = getUsageStats();
    const dbHealth = enhancedSupabase.getHealthSummary();
    
    console.log("Request completed. Current usage stats:", JSON.stringify(finalStats, null, 2));
    console.log("Database health summary:", JSON.stringify(dbHealth, null, 2));

    return new Response(JSON.stringify({ 
      result: finalResult, 
      reasoning, 
      pdfUrl,
      // Include usage stats in response for monitoring (optional)
      _stats: Deno.env.get('INCLUDE_STATS') === 'true' ? finalStats : undefined,
      _dbHealth: Deno.env.get('INCLUDE_DB_HEALTH') === 'true' ? dbHealth : undefined
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
    
    } catch (timeoutError) {
      clearTimeout(timeoutId);
      throw timeoutError;
    }
  } catch (error) {
    console.error("Error in process-sred function:", error);
    
    // Enhanced error response with more specific error types
    let statusCode = 500;
    let errorMessage = "Internal server error";
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        statusCode = 408;
        errorMessage = "Request timeout - processing took too long";
      } else if (error.message.includes("No input provided") || error.message.includes("Insufficient content")) {
        statusCode = 400;
        errorMessage = error.message;
      } else if (error.message.includes("too large") || error.message.includes("Maximum")) {
        statusCode = 413;
        errorMessage = error.message;
      } else {
        errorMessage = error.message;
      }
    }
    
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: statusCode,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});



// --- ENHANCED 3-TIER FALLBACK LOGIC WITH MONITORING ---

// AI Configuration and Monitoring
interface AIConfig {
  primaryModel: string;
  fallbackModel: string;
  timeout: number;
  maxRetries: number;
  circuitBreakerThreshold: number;
}

interface AIMetrics {
  requestId: string;
  timestamp: string;
  tier: 1 | 2 | 3;
  model: string;
  inputTokens: number;
  outputTokens: number;
  latency: number;
  success: boolean;
  errorType?: string;
  cost?: number;
}

interface TierConfig {
  name: string;
  url: string;
  model: string;
  timeout: number;
  priority: number;
  costPerToken: number;
}

// Usage tracking for monitoring and cost analysis
const usageTracker = {
  tier1: { requests: 0, tokens: 0, cost: 0, failures: 0 },
  tier2: { requests: 0, tokens: 0, cost: 0, failures: 0 },
  tier3: { requests: 0, tokens: 0, cost: 0, failures: 0 }
};

// Circuit breaker for tier health management
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';
  
  constructor(
    private threshold: number = 5,
    private timeout: number = 60000
  ) {}
  
  async call<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.timeout) {
        this.state = 'half-open';
      } else {
        throw new Error('Circuit breaker is open');
      }
    }
    
    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }
  
  private onSuccess() {
    this.failures = 0;
    this.state = 'closed';
  }
  
  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    
    if (this.failures >= this.threshold) {
      this.state = 'open';
    }
  }
}

// Circuit breakers for each tier
const circuitBreakers = {
  tier1: new CircuitBreaker(3, 30000), // 3 failures, 30s timeout
  tier2: new CircuitBreaker(3, 45000), // 3 failures, 45s timeout  
  tier3: new CircuitBreaker(5, 60000)  // 5 failures, 60s timeout
};

// Load AI configuration with fallbacks
const loadAIConfig = (): AIConfig => {
  return {
    primaryModel: Deno.env.get("OPENROUTER_MODEL") || Deno.env.get("LLM_MODEL") || "meta-llama/llama-3.1-8b-instruct",
    fallbackModel: Deno.env.get("GROQ_MODEL") || "llama-3.1-8b-instant",
    timeout: parseInt(Deno.env.get('AI_TIMEOUT') || '30000'),
    maxRetries: parseInt(Deno.env.get('AI_MAX_RETRIES') || '3'),
    circuitBreakerThreshold: parseInt(Deno.env.get('AI_CIRCUIT_BREAKER_THRESHOLD') || '5')
  };
};

// Enhanced error categorization
const categorizeError = (error: Error, response?: Response): string => {
  if (error.name === 'AbortError') return 'timeout';
  if (error.message.includes('rate limit')) return 'rate_limit';
  if (error.message.includes('authentication')) return 'auth_error';
  if (error.message.includes('network')) return 'network_error';
  
  if (response) {
    if (response.status === 429) return 'rate_limit';
    if (response.status === 401 || response.status === 403) return 'auth_error';
    if (response.status >= 500) return 'server_error';
    if (response.status >= 400) return 'client_error';
  }
  
  return 'unknown_error';
};

// Track AI metrics for monitoring
const trackAIMetrics = (metrics: AIMetrics) => {
  console.log(JSON.stringify({
    type: 'ai_metrics',
    ...metrics
  }));
  
  // Update usage tracking
  const tierKey = `tier${metrics.tier}` as keyof typeof usageTracker;
  usageTracker[tierKey].requests++;
  usageTracker[tierKey].tokens += metrics.inputTokens + metrics.outputTokens;
  usageTracker[tierKey].cost += metrics.cost || 0;
  
  if (!metrics.success) {
    usageTracker[tierKey].failures++;
  }
};

// Get usage statistics
const getUsageStats = () => {
  const totalRequests = Object.values(usageTracker).reduce((sum, tier) => sum + tier.requests, 0);
  const totalCost = Object.values(usageTracker).reduce((sum, tier) => sum + tier.cost, 0);
  const totalFailures = Object.values(usageTracker).reduce((sum, tier) => sum + tier.failures, 0);
  
  return {
    ...usageTracker,
    totals: {
      requests: totalRequests,
      cost: totalCost,
      failures: totalFailures,
      successRate: totalRequests > 0 ? ((totalRequests - totalFailures) / totalRequests) * 100 : 0
    }
  };
};

const OPENROUTER_CHAT_URL = "https://openrouter.ai/api/v1/chat/completions";

async function generateNarrative(extractedText: string, deviceType: string = "desktop"): Promise<{ answer: string; reasoning: string | null }> {
  const config = loadAIConfig();
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  // Validate input text
  if (!extractedText || extractedText.trim().length < 10) {
    throw new Error("Insufficient input text for narrative generation");
  }

  // Truncate input if too large to prevent memory issues
  let processedText = extractedText;
  if (processedText.length > 50000) {
    processedText = processedText.substring(0, 50000) + "\n\n[Content truncated for processing...]";
    console.log("Input text truncated for LLM processing");
  }

  const openRouterKey = Deno.env.get("OPENROUTER_API_KEY") || "";
  const openRouterModel =
    Deno.env.get("OPENROUTER_MODEL") ||
    Deno.env.get("LLM_MODEL") ||
    "meta-llama/llama-3.1-8b-instruct";

  const tierConfigs: TierConfig[] = [
    {
      name: "OpenRouter",
      url: OPENROUTER_CHAT_URL,
      model: openRouterModel,
      timeout: 120000,
      priority: 1,
      costPerToken: 0.000001,
    },
    {
      name: "Groq API",
      url: "https://api.groq.com/openai/v1/chat/completions",
      model: config.fallbackModel,
      timeout: 60000,
      priority: 2,
      costPerToken: 0.000002,
    },
  ];

  const groqKey = Deno.env.get("GROQ_API_KEY") || "";

  const userPrompt = `KNOWLEDGE BASE CONTEXT:
${knowledgeBaseContext}

---EXTRACTED TECHNICAL DATA TO ANALYZE---
${processedText}

---YOUR TASK---
Using the SR&ED Knowledge Base above as your source of truth, analyze the extracted technical data and generate a compelling technical narrative for a Canadian SR&ED claim.

ANALYSIS FRAMEWORK:
1. Identify the Technological_Uncertainty (What couldn't be solved with standard practice?)
2. Extract the SR&ED_Hypothesis (What specific testable statement was being proven/disproven?)
3. Document the Systematic_Investigation (What experiments, tests, data collection occurred?)
4. Define the Technological_Advancement (What new knowledge was gained, even if negative?)
5. Separate SR&ED work from routine/business work (Be explicit about this distinction)

OUTPUT STRUCTURE - THREE SECTIONS (T661 Form Lines 242, 244, 246):

**CRITICAL CHARACTER LIMITS (CRA REQUIREMENTS):**
- Each section must be 350 words OR 2,000 characters maximum (whichever is reached first)
- These are hard limits enforced by the T661 form
- Be concise but comprehensive within these constraints

**IMPORTANT FORMATTING REQUIREMENT:**
You MUST format your output with these EXACT section headers followed by the content:

## Line 242: Technological Uncertainty

[Write the full detailed content about the technological uncertainty here]

## Line 244: Systematic Investigation  

[Write the full detailed content about the systematic investigation here]

## Line 246: Technological Advancement

[Write the full detailed content about the technological advancement here]

---

**SECTION 1 - Line 242: Technological Uncertainty (MAX: 350 words / 2,000 characters)**
Describe the specific technical problem or challenge that could NOT be resolved using standard practice, publicly known solutions, or routine engineering. Explain:
- WHY this was uncertain/non-obvious (prove it wasn't routine)
- What made existing solutions insufficient or unavailable
- The "whether" or "how" that wasn't known
- How this differs from the overall business goal

CRITICAL: This must be a TECHNOLOGICAL uncertainty, not a business uncertainty. Show why standard APIs, frameworks, or known methods would not work.

**SECTION 2 - Line 244: Systematic Investigation (MAX: 350 words / 2,000 characters)**
Detail the methodical, experimental approach used to test the SR&ED hypothesis. Include:
- The specific SR&ED Hypothesis you were testing (testable technical statement)
- Experiments, tests, or analyses conducted (be concrete, not high-level)
- Data collected and analyzed (metrics, measurements, observations)
- Tools, technologies, and methods used
- Logical progression: Hypothesis → Test → Result → Conclusion → Next iteration
- Failed attempts or negative results (these PROVE systematic investigation)
- Timeline references if available (dates, duration)

CRITICAL: Reference Contemporaneous_Documentation when possible (commits, tickets, timesheets, meeting notes). Show a systematic, iterative process.

**SECTION 3 - Line 246: Technological Advancement (MAX: 350 words / 2,000 characters)**
Explain the new knowledge or capability gained that advances the technology base. Describe:
- What you learned that advances the underlying technology/field (not just your product)
- How this changes how the problem would be solved in future
- New understanding gained (including negative results: "Approach X doesn't work because...")
- Why this is advancement in TECHNOLOGY, not just product improvement
- How this contributes to the collective knowledge of the field

CRITICAL: Failed experiments that prove a hypothesis wrong ARE technological advancement. Focus on knowledge gained, not commercial success.

QUALITY GUIDELINES:
- **RESPECT CHARACTER LIMITS**: Each section MUST stay within 350 words OR 2,000 characters (whichever comes first)
- Use specific technical terms, algorithm names, technologies, metrics (not generic "we improved performance")
- Show WHY existing solutions/APIs/frameworks/methods wouldn't work (prove non-routine nature)
- Explicitly call out which work was SR&ED vs. routine (use the Entity-Relationship Model)
- Use active voice, past tense (describing completed work, not future plans)
- Reference specific dates, tools, team members, documentation when available
- Keep narrative cohesive: the three sections tell ONE continuous story
- Emphasize Contemporaneous_Documentation as proof
- For software: Focus on the "black box" (underlying algorithms, architecture) not the "glass box" (UI/UX)

APPLY THE 5 QUESTIONS:
1. Was there technological uncertainty? (Prove it in Line 242)
2. Were hypotheses formulated? (Show them in Line 244)
3. Was the approach systematic? (Demonstrate the experimental process in Line 244)
4. Was technological advancement the goal? (Explain in Line 246)
5. Is there documentation? (Reference it throughout)`;

  const messages = [
    { role: "system", content: systemPrompt },
    { role: "user", content: userPrompt }
  ];

  const errors: string[] = [];
  const inputTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4); // Rough token estimate

  // Tier attempt logic with circuit breakers and monitoring
  for (const tierConfig of tierConfigs) {
    const tierNumber = tierConfig.priority as 1 | 2 | 3;
    const circuitBreaker = circuitBreakers[`tier${tierNumber}` as keyof typeof circuitBreakers];

    try {
      console.log(`Attempting Tier ${tierNumber}: ${tierConfig.name}...`);

      if (tierNumber === 1 && !openRouterKey) {
        console.log("Skipping Tier 1: No OPENROUTER_API_KEY");
        errors.push(`Tier 1: No OpenRouter API key`);
        continue;
      }
      if (tierNumber === 2 && !groqKey) {
        console.log("Skipping Tier 2: No Groq API key");
        errors.push(`Tier 2: No Groq API key`);
        continue;
      }

      const result = await circuitBreaker.call(async () => {
        const apiKeyToUse = tierNumber === 1 ? openRouterKey : groqKey;
        return await callLLM(tierConfig.url, apiKeyToUse, tierConfig.model, messages, tierConfig.timeout, tierNumber === 1);
      });
      
      // Calculate metrics
      const endTime = Date.now();
      const latency = endTime - startTime;
      const outputTokens = Math.ceil(result.answer.length / 4); // Rough estimate
      const cost = (inputTokens + outputTokens) * tierConfig.costPerToken;
      
      // Track successful metrics
      trackAIMetrics({
        requestId,
        timestamp: new Date().toISOString(),
        tier: tierNumber,
        model: tierConfig.model,
        inputTokens,
        outputTokens,
        latency,
        success: true,
        cost
      });
      
      console.log(`Tier ${tierNumber} succeeded in ${latency}ms (Cost: $${cost.toFixed(6)})`);
      return result;
      
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      const errorType = categorizeError(error instanceof Error ? error : new Error(errorMessage));
      errors.push(`Tier ${tierNumber}: ${errorMessage}`);
      
      // Track failed metrics
      trackAIMetrics({
        requestId,
        timestamp: new Date().toISOString(),
        tier: tierNumber,
        model: tierConfig.model,
        inputTokens,
        outputTokens: 0,
        latency: Date.now() - startTime,
        success: false,
        errorType,
        cost: 0
      });
      
      console.warn(`Tier ${tierNumber} failed (${errorType}):`, errorMessage);
      
      // Continue to next tier
      continue;
    }
  }
  
  // All tiers failed - log comprehensive error and usage stats
  const usageStats = getUsageStats();
  console.error("All AI tiers failed. Usage stats:", usageStats);
  
  throw new Error(`All LLM tiers failed. Errors: ${errors.join('; ')}`);
}

// Enhanced parameter optimization based on model and tier
const getOptimizedParameters = (model: string, tier: number) => {
  const baseParams = {
    temperature: 0.7,
    max_tokens: 2000,
    stream: false,
    top_p: 0.9,
    frequency_penalty: 0.1,
    presence_penalty: 0.1
  };

  // Model-specific optimizations
  if (model.includes('deepseek')) {
    return {
      ...baseParams,
      temperature: 0.6, // Lower temperature for more consistent SR&ED content
      max_tokens: 2500,  // Higher token limit for detailed narratives
      top_p: 0.85       // Slightly more focused sampling
    };
  } else if (model.includes("llama") || model.includes("meta-llama")) {
    return {
      ...baseParams,
      temperature: 0.75,
      max_tokens: 2000,
      top_p: 0.9,
    };
  }

  return baseParams;
};

// Enhanced retry logic with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: Error;
  
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      
      // Don't retry on certain error types
      if (lastError.message.includes('authentication') || 
          lastError.message.includes('Invalid API key') ||
          lastError.message.includes('401')) {
        throw lastError;
      }
      
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
        console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms delay`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError!;
};

async function callLLM(
  endpoint: string,
  apiKey: string,
  model: string,
  messages: any[],
  timeoutMs: number = 120000,
  useOpenRouter = false,
): Promise<{ answer: string; reasoning: string | null }> {
  console.log(`Calling LLM: ${endpoint} (Model: ${model})`);

  const paramTier = useOpenRouter ? 1 : endpoint.includes("groq") ? 2 : 1;
  const optimizedParams = getOptimizedParameters(model, paramTier);

  return await retryWithBackoff(async () => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const requestBody = {
        model: model,
        messages: messages,
        ...optimizedParams,
      };

      console.log(`Request parameters:`, {
        model,
        temperature: optimizedParams.temperature,
        max_tokens: optimizedParams.max_tokens,
        endpoint: endpoint.split("/").pop(),
      });

      const headers = useOpenRouter
        ? openRouterHeaders(apiKey, "Rambo2-SRED/1.0")
        : {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Rambo2-SRED/1.0",
        };

      const response = await fetch(endpoint, {
        method: "POST",
        headers,
        body: JSON.stringify(requestBody),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Enhanced error handling with response details
      if (!response.ok) {
        let errorDetails = `HTTP ${response.status}`;
        try {
          const errorBody = await response.text();
          const errorData = JSON.parse(errorBody);
          errorDetails += `: ${errorData.error?.message || errorData.message || errorBody}`;
        } catch {
          errorDetails += `: ${response.statusText}`;
        }
        
        // Categorize error for better handling
        if (response.status === 429) {
          throw new Error(`Rate limit exceeded: ${errorDetails}`);
        } else if (response.status === 401 || response.status === 403) {
          throw new Error(`Authentication failed: ${errorDetails}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${errorDetails}`);
        } else {
          throw new Error(`API Error: ${errorDetails}`);
        }
      }

      const data = await response.json();
      
      // Enhanced response validation with detailed error messages
      if (!data) {
        throw new Error("Empty response from API");
      }
      
      if (!data.choices || !Array.isArray(data.choices)) {
        throw new Error(`Invalid response format: expected 'choices' array, got ${typeof data.choices}`);
      }
      
      if (data.choices.length === 0) {
        throw new Error("No choices returned in API response");
      }

      const choice = data.choices[0];
      if (!choice || !choice.message) {
        throw new Error("Invalid choice format: missing message");
      }
      
      const content = choice.message.content;
      if (!content || typeof content !== 'string') {
        throw new Error(`Invalid content format: expected string, got ${typeof content}`);
      }

      if (content.trim().length === 0) {
        throw new Error("Empty content returned from LLM");
      }

      // Log successful response details
      console.log(`LLM response received: ${content.length} characters, finish_reason: ${choice.finish_reason || 'unknown'}`);
      
      // Track token usage if available
      if (data.usage) {
        console.log(`Token usage - Input: ${data.usage.prompt_tokens}, Output: ${data.usage.completion_tokens}, Total: ${data.usage.total_tokens}`);
      }

      // Parse <think> tags if present (DeepSeek-R1 specific)
      return parseThinkTags(content);
      
    } catch (error) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error(`Request timeout after ${timeoutMs}ms`);
      }
      
      // Re-throw with additional context
      if (error instanceof Error) {
        throw new Error(`LLM call failed: ${error.message}`);
      }
      
      throw new Error(`LLM call failed: ${String(error)}`);
    }
  }, 2, 1000); // Max 2 retries with 1s base delay
}

function parseThinkTags(content: string): { answer: string; reasoning: string | null } {
  if (!content || typeof content !== "string") {
    throw new Error("Invalid content provided to parseThinkTags");
  }

  const thinkMatch =
    content.match(/<think>([\s\S]*?)<\/think>/i) ||
    content.match(/<think>([\s\S]*?)<\/redacted_thinking>/i);
  if (thinkMatch) {
    console.log("Captured Reasoning Process:", thinkMatch[1].substring(0, 200) + "...");
    const reasoning = thinkMatch[1].trim();
    let answer = content
      .replace(/<think>[\s\S]*?<\/think>/gi, "")
      .replace(/<think>[\s\S]*?<\/redacted_thinking>/gi, "")
      .trim();
    
    // Validate that we still have content after removing think tags
    if (!answer || answer.length === 0) {
      console.warn("No content remaining after removing think tags, using original content");
      answer = content;
    }
    
    return { answer, reasoning };
  }
  
  return { answer: content.trim(), reasoning: null };
}

function generateFallbackNarrative(hasImages: boolean, hasData: boolean, contentSample: string): string {
  const uncertaintyType = hasImages ? "image processing" : hasData ? "data processing" : "system optimization";
  const methodType = hasImages ? "computer vision algorithms" : hasData ? "data analysis techniques" : "optimization algorithms";
  
  return `## Line 242: Technological Uncertainty

The technological uncertainty encountered was whether novel ${methodType} could solve the ${uncertaintyType} challenges that existing standard approaches could not address. Conventional methods were insufficient due to performance limitations, accuracy constraints, or scalability issues. The specific uncertainty was how to develop a solution that could overcome these technical barriers while maintaining system reliability and efficiency.

## Line 244: Systematic Investigation

We conducted systematic experiments to test our hypothesis through iterative development and analysis:
1. We analyzed the existing approaches and identified their limitations
2. We formulated hypotheses about potential solutions and their expected performance
3. We designed and implemented experimental prototypes to test these hypotheses
4. We measured performance metrics and compared results against baseline methods
5. We analyzed failure cases and refined our approach based on the findings
6. We documented all experiments and results for further analysis

## Line 246: Technological Advancement

We advanced the understanding of ${uncertaintyType} by demonstrating new approaches that overcome previous limitations. Our systematic investigation revealed key insights about the underlying technical challenges and provided evidence for improved methods. This work contributes to the collective knowledge in the field by establishing new benchmarks and proving the feasibility of approaches that were previously unproven. The knowledge gained enables future development of more efficient and effective solutions.`;
}

function ensureNarrativeStructure(narrative: string): string {
  const sections = {
    line242: "",
    line244: "",
    line246: ""
  };

  // Try to extract existing sections
  const line242Match = narrative.match(/## Line 242[:\s]*([\s\S]*?)(?=## Line 244|## Line 246|$)/i);
  if (line242Match) sections.line242 = line242Match[1].trim();

  const line244Match = narrative.match(/## Line 244[:\s]*([\s\S]*?)(?=## Line 246|$)/i);
  if (line244Match) sections.line244 = line244Match[1].trim();

  const line246Match = narrative.match(/## Line 246[:\s]*([\s\S]*?)$/i);
  if (line246Match) sections.line246 = line246Match[1].trim();

  // Fill in missing sections with defaults
  if (!sections.line242) {
    sections.line242 = "The technological uncertainty was whether a novel approach could solve the technical challenges that standard methods could not address.";
  }
  if (!sections.line244) {
    sections.line244 = "We conducted systematic experiments to test our hypothesis through iterative development and analysis of the proposed solution.";
  }
  if (!sections.line246) {
    sections.line246 = "We advanced the understanding of the underlying technology by demonstrating new approaches and contributing knowledge to the field.";
  }

  return `## Line 242: Technological Uncertainty

${sections.line242}

## Line 244: Systematic Investigation

${sections.line244}

## Line 246: Technological Advancement

${sections.line246}`;
}

function parseNarrativeToFields(narrative: string): Record<string, string> {
  const fields: Record<string, string> = {};

  // Extract Line 242 with more flexible matching
  const line242Match = narrative.match(/## Line 242[:\s]*(?:Technological Uncertainty)?\s*([\s\S]*?)(?=## Line 244|$)/i);
  if (line242Match) {
    fields["line_242_uncertainties"] = line242Match[1].trim();
  }

  // Extract Line 244 with more flexible matching
  const line244Match = narrative.match(/## Line 244[:\s]*(?:Systematic Investigation)?\s*([\s\S]*?)(?=## Line 246|$)/i);
  if (line244Match) {
    fields["line_244_work_performed"] = line244Match[1].trim();
  }

  // Extract Line 246 with more flexible matching
  const line246Match = narrative.match(/## Line 246[:\s]*(?:Technological Advancement)?\s*([\s\S]*?)$/i);
  if (line246Match) {
    fields["line_246_advancements"] = line246Match[1].trim();
  }

  // Ensure all fields have content
  if (!fields["line_242_uncertainties"]) {
    fields["line_242_uncertainties"] = "Technological uncertainty not properly extracted from narrative.";
  }
  if (!fields["line_244_work_performed"]) {
    fields["line_244_work_performed"] = "Systematic investigation details not properly extracted from narrative.";
  }
  if (!fields["line_246_advancements"]) {
    fields["line_246_advancements"] = "Technological advancement details not properly extracted from narrative.";
  }

  return fields;
}
