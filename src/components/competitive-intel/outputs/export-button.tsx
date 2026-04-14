"use client";

import { useState } from "react";
import { Copy, Check, Download } from "lucide-react";
import { pdf } from "@react-pdf/renderer";
import type { CISessionOutput } from "@/lib/competitive-intel/types";
import type { BattleCard, PositioningMatrix, ObjectionPlaybook, ThreatAssessment } from "@/lib/competitive-intel/schemas";
import { CIReport } from "./pdf-report";

type Props = {
  outputs: CISessionOutput[];
};

export function ExportButton({ outputs }: Props) {
  const [copied, setCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  function exportAsMarkdown() {
    const md = outputs
      .map((o) => `## ${o.title}\n\n${o.description}\n\n\`\`\`json\n${JSON.stringify(o.metadata, null, 2)}\n\`\`\``)
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function downloadPDF() {
    setGenerating(true);
    try {
      const battleCards = outputs
        .filter((o) => o.output_type === "battle-card")
        .map((o) => o.metadata as unknown as BattleCard);

      const matrix = outputs.find((o) => o.output_type === "positioning-matrix");
      const playbooks = outputs
        .filter((o) => o.output_type === "objection-playbook")
        .map((o) => o.metadata as unknown as ObjectionPlaybook);

      const threat = outputs.find((o) => o.output_type === "threat-assessment");

      const competitorNames = battleCards.map((c) => c.competitor_name).join(" vs ");

      const reportData = {
        title: `Competitive Intel: ${competitorNames || "Analysis"}`,
        date: new Date().toLocaleDateString("fr-FR"),
        battleCards,
        positioningMatrix: matrix ? (matrix.metadata as unknown as PositioningMatrix) : null,
        objectionPlaybooks: playbooks,
        threatAssessment: threat ? (threat.metadata as unknown as ThreatAssessment) : null,
      };

      const blob = await pdf(<CIReport data={reportData} />).toBlob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `competitive-intel-${Date.now()}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("PDF generation failed:", e);
    }
    setGenerating(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={exportAsMarkdown}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
      >
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        {copied ? "Copied!" : "Copy MD"}
      </button>
      <button
        onClick={downloadPDF}
        disabled={generating || outputs.length === 0}
        className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg transition-colors"
      >
        <Download className="size-3.5" />
        {generating ? "Generating..." : "Download PDF"}
      </button>
    </div>
  );
}
