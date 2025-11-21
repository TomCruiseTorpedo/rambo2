import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { NarrativeSection } from "./NarrativeSection";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Download, Copy, ChevronDown, FileText, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import jsPDF from "jspdf";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { saveAs } from "file-saver";

interface EnhancedResult {
  line242: string;
  line244: string;
  line246: string;
  thinkingProcess?: string;
  confidenceScores?: {
    line242?: number;
    line244?: number;
    line246?: number;
  };
}

interface EnhancedResultsDisplayProps {
  results: EnhancedResult;
  onReset: () => void;
  onResultsChange?: (results: EnhancedResult) => void;
}

export const EnhancedResultsDisplay = ({ 
  results, 
  onReset,
  onResultsChange 
}: EnhancedResultsDisplayProps) => {
  const [showThinking, setShowThinking] = useState(false);
  const [currentResults, setCurrentResults] = useState(results);

  const handleSectionChange = (section: keyof EnhancedResult, content: string) => {
    const updated = { ...currentResults, [section]: content };
    setCurrentResults(updated);
    onResultsChange?.(updated);
  };

  const handleCopyAll = () => {
    const fullText = `Line 242: Technological Uncertainty\n\n${currentResults.line242}\n\nLine 244: Systematic Investigation\n\n${currentResults.line244}\n\nLine 246: Technological Advancement\n\n${currentResults.line246}`;
    navigator.clipboard.writeText(fullText);
    toast.success("All sections copied to clipboard");
  };

  const handleExportTxt = () => {
    const content = `SR&ED Narrative - Generated ${new Date().toLocaleDateString()}\n\n${"=".repeat(60)}\n\nLine 242: Technological Uncertainty\n\n${currentResults.line242}\n\n${"=".repeat(60)}\n\nLine 244: Systematic Investigation\n\n${currentResults.line244}\n\n${"=".repeat(60)}\n\nLine 246: Technological Advancement\n\n${currentResults.line246}`;
    
    const blob = new Blob([content], { type: "text/plain" });
    saveAs(blob, `sred-narrative-${Date.now()}.txt`);
    toast.success("Exported as TXT");
  };

  const handleExportPdf = () => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const m = 15; // margin
    let y = 0;

    // ===== PAGE 1: General Information =====
    // Top right - Protected B
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Protected B when completed", pageWidth - 55, 10);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.text("CRA internal form identifier 060", pageWidth - 55, 14);
    doc.text("Code 1901", pageWidth - 55, 17);

    // Canada Flag and Agency name
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Canada Revenue", m, 15);
    doc.text("Agency", m, 19);
    doc.setFont(undefined, "normal");
    doc.text("Agence du revenu", m + 30, 15);
    doc.text("du Canada", m + 30, 19);

    // Title
    y = 35;
    doc.setFontSize(14);
    doc.setFont(undefined, "bold");
    doc.text("Scientific Research and Experimental", pageWidth / 2, y, { align: 'center' });
    y += 6;
    doc.text("Development (SR&ED) Expenditures Claim", pageWidth / 2, y, { align: 'center' });

    // Instructions
    y += 10;
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Use this form:", m, y);
    y += 5;
    doc.setFont(undefined, "normal");
    doc.setFontSize(8);
    doc.text("• to provide technical information on your SR&ED projects;", m + 3, y);
    y += 4;
    doc.text("• to calculate your SR&ED expenditures; and", m + 3, y);
    y += 4;
    doc.text("• to calculate your qualified SR&ED expenditures for investment tax credits (ITC).", m + 3, y);

    y += 7;
    doc.setFont(undefined, "bold");
    doc.text("To claim an ITC, use either:", m, y);
    y += 5;
    doc.setFont(undefined, "normal");
    doc.text("• Schedule T2SCH31, Investment Tax Credit – Corporations; or", m + 3, y);
    y += 4;
    doc.text("• Form T2038(IND), Investment Tax Credit (individuals).", m + 3, y);

    y += 7;
    const infoLines = doc.splitTextToSize(
      "The information requested in this form and documents supporting your expenditures and project information (Part 2) are prescribed information.",
      pageWidth - 2 * m
    );
    doc.text(infoLines, m, y);
    y += infoLines.length * 4 + 3;

    const info2Lines = doc.splitTextToSize(
      "In Part 6, a new box is added: Box 758 that must be filled if traditional method is used. The information is required for tax year ends after 2020 and optional for tax year ends before 2021.",
      pageWidth - 2 * m
    );
    doc.text(info2Lines, m, y);
    y += info2Lines.length * 4 + 3;

    doc.text("Your SR&ED claim must be filed within 12 months of the filing due date of your income tax return.", m, y);
    y += 7;

    doc.text("To help you fill out this form, use the T4088, Guide to Form T661, which is available on our website: ", m, y);
    doc.setTextColor(0, 0, 255);
    doc.text("canada.ca/taxes-sred", m + 145, y);
    doc.setTextColor(0, 0, 0);
    doc.text(".", m + 175, y);

    // Part 1 - General Information
    y += 10;
    doc.setFillColor(230, 230, 230);
    doc.rect(m, y, pageWidth - 2 * m, 7, 'F');
    doc.setFontSize(10);
    doc.setFont(undefined, "bold");
    doc.text("Part 1 – General information", m + 2, y + 5);

    y += 10;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");

    // Line 010 - Name of claimant
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("010", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Name of claimant", m + 9, y + 3);
    
    // Right side - Enter one of the following
    doc.text("Enter one of the following:", pageWidth / 2 + 10, y + 3);
    doc.setDrawColor(0, 0, 0);
    doc.setFillColor(220, 230, 255);
    doc.rect(m, y + 5, pageWidth / 2 - 5, 8, 'FD');
    
    // Fill claimant name
    doc.setFontSize(9);
    doc.text("TechInnovate Solutions Inc.", m + 2, y + 10);
    
    // BN boxes with sample data
    const bnX = pageWidth / 2 + 20;
    const bnNumber = "123456789RC0001";
    for (let i = 0; i < 15; i++) {
      doc.rect(bnX + i * 5, y + 6, 4, 6);
      if (i < bnNumber.length) {
        doc.setFontSize(8);
        doc.text(bnNumber[i], bnX + i * 5 + 1.2, y + 10);
      }
    }
    doc.setFontSize(6);
    doc.text("Business number (BN)", pageWidth - m - 40, y + 14);

    // Tax year section
    y += 15;
    doc.setFontSize(8);
    doc.text("Tax year", m, y + 3);
    doc.text("Year Month Day", m + 25, y);
    doc.text("Year Month Day", m + 70, y);
    doc.text("From", m + 15, y + 5);
    doc.text("to", m + 60, y + 5);
    
    // Date boxes From - with sample data
    const fromDate = "20240101";
    for (let i = 0; i < 4; i++) {
      doc.rect(m + 25 + i * 5, y + 2, 4, 6);
      doc.text(fromDate[i], m + 25 + i * 5 + 1.2, y + 6);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(m + 45 + i * 5, y + 2, 4, 6);
      doc.text(fromDate[4 + i], m + 45 + i * 5 + 1.2, y + 6);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(m + 55 + i * 5, y + 2, 4, 6);
      doc.text(fromDate[6 + i], m + 55 + i * 5 + 1.2, y + 6);
    }
    
    // Date boxes To - with sample data
    const toDate = "20241231";
    for (let i = 0; i < 4; i++) {
      doc.rect(m + 70 + i * 5, y + 2, 4, 6);
      doc.text(toDate[i], m + 70 + i * 5 + 1.2, y + 6);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(m + 90 + i * 5, y + 2, 4, 6);
      doc.text(toDate[4 + i], m + 90 + i * 5 + 1.2, y + 6);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(m + 100 + i * 5, y + 2, 4, 6);
      doc.text(toDate[6 + i], m + 100 + i * 5 + 1.2, y + 6);
    }

    // SIN boxes - left empty for privacy
    const sinX = pageWidth / 2 + 30;
    for (let i = 0; i < 9; i++) {
      doc.rect(sinX + i * 5, y + 2, 4, 6);
    }
    doc.setFontSize(6);
    doc.text("Social insurance number (SIN)", pageWidth - m - 35, y + 10);

    // Line 050
    y += 12;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.setFont(undefined, "bold");
    doc.text("050", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Total number of projects you are claiming this tax year:", m + 9, y + 3);
    doc.setFillColor(220, 230, 255);
    doc.rect(pageWidth / 2, y, 30, 5, 'FD');
    doc.setFontSize(9);
    doc.text("1", pageWidth / 2 + 12, y + 3.5);

    // Contact information
    y += 10;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("100", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Contact person for the financial information", m + 9, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(pageWidth / 2 + 10, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("105", pageWidth / 2 + 11, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Telephone number/extension", pageWidth / 2 + 19, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(pageWidth - m - 35, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("110", pageWidth - m - 34, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Fax number", pageWidth - m - 27, y + 3);
    
    doc.setFillColor(220, 230, 255);
    doc.rect(m, y + 6, pageWidth / 2 - 5, 6, 'FD');
    doc.rect(pageWidth / 2 + 10, y + 6, 55, 6, 'FD');
    doc.rect(pageWidth - m - 35, y + 6, 30, 6, 'FD');
    
    // Fill contact data
    doc.setFontSize(8);
    doc.text("Sarah Johnson, CFO", m + 2, y + 10);
    doc.text("416-555-1234 x101", pageWidth / 2 + 12, y + 10);
    doc.text("416-555-1235", pageWidth - m - 32, y + 10);

    y += 13;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("115", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Contact person for the technical information", m + 9, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(pageWidth / 2 + 10, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("120", pageWidth / 2 + 11, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Telephone number/extension", pageWidth / 2 + 19, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(pageWidth - m - 35, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("125", pageWidth - m - 34, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Fax number", pageWidth - m - 27, y + 3);
    
    doc.setFillColor(220, 230, 255);
    doc.rect(m, y + 6, pageWidth / 2 - 5, 6, 'FD');
    doc.rect(pageWidth / 2 + 10, y + 6, 55, 6, 'FD');
    doc.rect(pageWidth - m - 35, y + 6, 30, 6, 'FD');
    
    // Fill technical contact data
    doc.setFontSize(8);
    doc.text("Dr. Michael Chen, CTO", m + 2, y + 10);
    doc.text("416-555-1234 x202", pageWidth / 2 + 12, y + 10);
    doc.text("416-555-1235", pageWidth - m - 32, y + 10);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("T661 E (20)", m, pageHeight - 10);
    doc.text("(Ce formulaire est disponible en français.)", pageWidth / 2 - 30, pageHeight - 10);
    doc.text("Page 1 of 9", pageWidth - m - 20, pageHeight - 10);
    
    // Canada wordmark
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.setFont(undefined, "bold");
    doc.text("Canada", pageWidth - m - 20, pageHeight - 15);

    // ===== PAGE 2: Project Information =====
    doc.addPage();
    y = 15;

    // Header with Clear Data button
    doc.setFillColor(0, 200, 255);
    doc.rect(pageWidth - 35, y - 5, 30, 8, 'FD');
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "bold");
    doc.text("Clear Data", pageWidth - 28, y);

    doc.setFontSize(8);
    doc.text("Protected B when completed", pageWidth - 55, y + 8);
    doc.setFontSize(7);
    doc.setFont(undefined, "normal");
    doc.text("CRA internal form identifier 060", pageWidth - 55, y + 12);
    doc.text("Code 1901", pageWidth - 55, y + 15);

    y = 25;
    doc.setFontSize(11);
    doc.setFont(undefined, "bold");
    doc.text("Part 2 – Project information", m, y);
    y += 5;
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Complete a separate Part 2 for each project claimed this year.", m, y);

    // Section A - Project Identification
    y += 8;
    doc.setFillColor(230, 230, 230);
    doc.rect(m, y, pageWidth - 2 * m, 6, 'F');
    doc.setDrawColor(0, 0, 0);
    doc.rect(m, y, pageWidth - 2 * m, 6);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Section A – Project Identification", m + 2, y + 4);

    y += 8;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("200", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    doc.text("Project title (and identification code if applicable)", m + 9, y + 3);
    
    doc.setFillColor(220, 230, 255);
    doc.rect(m, y + 6, pageWidth - 2 * m, 8, 'FD');
    
    // Fill project title
    doc.setFontSize(9);
    doc.text("Advanced ML-Based Real-Time Fraud Detection System", m + 2, y + 11);

    y += 16;
    const col1 = m;
    const col2 = m + 65;
    const col3 = m + 130;

    doc.setFillColor(0, 0, 0);
    doc.rect(col1, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("202", col1 + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Project start date", col1 + 9, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(col2, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("204", col2 + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Completion or expected completion date", col2 + 9, y + 3);
    
    doc.setFillColor(0, 0, 0);
    doc.rect(col3, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.text("206", col3 + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Field of science or", col3 + 9, y + 2);
    doc.text("technology code", col3 + 9, y + 5);
    doc.setFontSize(6);
    doc.text("(See guide for list of codes)", col3 + 9, y + 8);

    // Date boxes with sample data
    doc.setFontSize(8);
    y += 6;
    doc.text("Year", col1 + 15, y);
    doc.text("Month", col1 + 30, y);
    
    // Project start date: 2024-01-10
    const startYear = "2024";
    const startMonth = "01";
    for (let i = 0; i < 4; i++) {
      doc.rect(col1 + 12 + i * 4, y + 2, 3.5, 5);
      doc.text(startYear[i], col1 + 12.8 + i * 4, y + 5.5);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(col1 + 30 + i * 4, y + 2, 3.5, 5);
      doc.text(startMonth[i], col1 + 30.8 + i * 4, y + 5.5);
    }

    doc.text("Year", col2 + 20, y);
    doc.text("Month", col2 + 35, y);
    
    // Completion date: 2024-12-31
    const endYear = "2024";
    const endMonth = "12";
    for (let i = 0; i < 4; i++) {
      doc.rect(col2 + 17 + i * 4, y + 2, 3.5, 5);
      doc.text(endYear[i], col2 + 17.8 + i * 4, y + 5.5);
    }
    for (let i = 0; i < 2; i++) {
      doc.rect(col2 + 35 + i * 4, y + 2, 3.5, 5);
      doc.text(endMonth[i], col2 + 35.8 + i * 4, y + 5.5);
    }
    
    doc.setFillColor(220, 230, 255);
    doc.rect(col3 + 9, y + 2, 30, 5, 'FD');
    
    // Fill field of science code (070 = Computer Science)
    doc.text("070", col3 + 18, y + 5.5);

    // Section B - Project descriptions
    y += 15;
    doc.setFillColor(230, 230, 230);
    doc.rect(m, y, pageWidth - 2 * m, 6, 'F');
    doc.rect(m, y, pageWidth - 2 * m, 6);
    doc.setFontSize(9);
    doc.setFont(undefined, "bold");
    doc.text("Section B – Project descriptions", m + 2, y + 4);

    // Line 242
    y += 8;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("242", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    doc.setFont(undefined, "normal");
    const q242 = doc.splitTextToSize(
      "What scientific or technological uncertainties did you attempt to overcome? (Maximum 350 words)",
      pageWidth - 2 * m - 10
    );
    doc.text(q242, m + 9, y + 3);

    y += q242.length * 4 + 2;
    doc.setFillColor(220, 230, 255);
    const box242Height = 65;
    doc.rect(m, y, pageWidth - 2 * m, box242Height, 'FD');
    
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const lines242 = doc.splitTextToSize(currentResults.line242, pageWidth - 2 * m - 4);
    doc.text(lines242, m + 2, y + 4);

    // Line 244
    y += box242Height + 6;
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("244", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const q244 = doc.splitTextToSize(
      "What work did you perform in the tax year to overcome the scientific or technological uncertainties described in line 242? (Summarize the systematic investigation or search) (Maximum 700 words)",
      pageWidth - 2 * m - 10
    );
    doc.text(q244, m + 9, y + 2);

    y += q244.length * 4 + 2;
    doc.setFillColor(220, 230, 255);
    const box244Height = 70;
    doc.rect(m, y, pageWidth - 2 * m, box244Height, 'FD');
    
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    const lines244 = doc.splitTextToSize(currentResults.line244, pageWidth - 2 * m - 4);
    doc.text(lines244, m + 2, y + 4);

    // Line 246
    y += box244Height + 6;
    if (y > pageHeight - 80) {
      doc.addPage();
      y = 20;
    }
    
    doc.setFillColor(0, 0, 0);
    doc.rect(m, y, 7, 5, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(7);
    doc.text("246", m + 1, y + 3.5);
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(8);
    const q246 = doc.splitTextToSize(
      "What scientific or technological advancements did you achieve or attempt to achieve as a result of the work described in line 244? (Maximum 350 words)",
      pageWidth - 2 * m - 10
    );
    doc.text(q246, m + 9, y + 2);

    y += q246.length * 4 + 2;
    doc.setFillColor(220, 230, 255);
    const box246Height = 65;
    doc.rect(m, y, pageWidth - 2 * m, box246Height, 'FD');
    
    doc.setDrawColor(0, 0, 0);
    doc.setTextColor(0, 0, 0);
    const lines246 = doc.splitTextToSize(currentResults.line246, pageWidth - 2 * m - 4);
    doc.text(lines246, m + 2, y + 4);

    // Footer
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text("T661 E (20)", m, pageHeight - 10);
    doc.text(`Page 2 of 9`, pageWidth - m - 20, pageHeight - 10);

    doc.save(`T661-Form-${Date.now()}.pdf`);
    toast.success("T661 Form downloaded");
  };

  const handleExportDocx = async () => {
    const doc = new Document({
      sections: [
        {
          children: [
            new Paragraph({
              children: [
                new TextRun({
                  text: "SR&ED Narrative",
                  bold: true,
                  size: 32,
                }),
              ],
            }),
            new Paragraph({
              children: [
                new TextRun({
                  text: `Generated: ${new Date().toLocaleDateString()}`,
                  size: 20,
                }),
              ],
            }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Line 242: Technological Uncertainty",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ text: currentResults.line242 }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Line 244: Systematic Investigation",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ text: currentResults.line244 }),
            new Paragraph({ text: "" }),
            new Paragraph({
              children: [
                new TextRun({
                  text: "Line 246: Technological Advancement",
                  bold: true,
                  size: 24,
                }),
              ],
            }),
            new Paragraph({ text: currentResults.line246 }),
          ],
        },
      ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `sred-narrative-${Date.now()}.docx`);
    toast.success("Exported as DOCX");
  };

  return (
    <div className="space-y-4 animate-fade-in">
      <Card className="p-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
              <h3 className="font-semibold text-base sm:text-lg">SR&ED Narrative Generated</h3>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button onClick={handleCopyAll} variant="outline" size="sm" className="text-xs sm:text-sm">
                <Copy className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                Copy All
              </Button>

              <Button onClick={handleExportPdf} size="sm" className="text-xs sm:text-sm">
                <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                <span className="hidden sm:inline">Download T661 PDF</span>
                <span className="sm:hidden">T661 PDF</span>
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="text-xs sm:text-sm">
                    <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                    <span className="hidden sm:inline">Other Formats</span>
                    <span className="sm:hidden">More</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleExportTxt}>
                    Export as TXT
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportDocx}>
                    Export as DOCX
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </Card>

      {currentResults.thinkingProcess && (
        <Collapsible open={showThinking} onOpenChange={setShowThinking}>
          <Card>
            <CollapsibleTrigger className="w-full p-3 sm:p-4 hover:bg-accent/50 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 sm:h-5 sm:w-5 text-primary" />
                  <h4 className="font-semibold text-sm sm:text-base">AI's Thinking Process</h4>
                </div>
                <ChevronDown
                  className={`h-3 w-3 sm:h-4 sm:w-4 transition-transform ${showThinking ? "" : "-rotate-90"}`}
                />
              </div>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <div className="p-3 sm:p-4 pt-0">
                <div className="bg-muted/30 rounded-lg p-3 sm:p-4 border border-border">
                  <p className="text-xs sm:text-sm whitespace-pre-wrap">{currentResults.thinkingProcess}</p>
                </div>
              </div>
            </CollapsibleContent>
          </Card>
        </Collapsible>
      )}

      <div className="space-y-3">
        <NarrativeSection
          title="Technological Uncertainty"
          lineNumber="242"
          content={currentResults.line242}
          onContentChange={(content) => handleSectionChange("line242", content)}
          confidenceScore={results.confidenceScores?.line242}
        />

        <NarrativeSection
          title="Systematic Investigation"
          lineNumber="244"
          content={currentResults.line244}
          onContentChange={(content) => handleSectionChange("line244", content)}
          confidenceScore={results.confidenceScores?.line244}
        />

        <NarrativeSection
          title="Technological Advancement"
          lineNumber="246"
          content={currentResults.line246}
          onContentChange={(content) => handleSectionChange("line246", content)}
          confidenceScore={results.confidenceScores?.line246}
        />
      </div>

      <Button onClick={onReset} variant="outline" className="w-full text-sm">
        Process Another Document
      </Button>
    </div>
  );
};
