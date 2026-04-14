"use client";

import { useState, useEffect } from "react";
import type { ICASessionOutput, ICASession } from "@/lib/icp-audit/types";
import { ICPScorecardView } from "./icp-scorecard-view";
import { SegmentAnalysisView } from "./segment-analysis-view";
import { PersonaCardView } from "./persona-card-view";
import { TAMSAMView } from "./tam-sam-view";
import { PrioritizationMatrixView } from "./prioritization-matrix-view";
import { ArrowLeft, Play, FileText, Save, Copy, Check } from "lucide-react";

type Tab = "summary" | "scorecard" | "segments" | "personas" | "tam-sam" | "priorities" | "transcript";

type EnrichedMessage = {
  id: string;
  role: string;
  content: string;
  agent_name: string;
  agent_emoji: string;
  agent_color: string;
  step_number: number;
  metadata: Record<string, unknown>;
};

type Props = {
  sessionId: string;
  onBack: () => void;
};

export function OutputsDashboard({ sessionId, onBack }: Props) {
  const [outputs, setOutputs] = useState<ICASessionOutput[]>([]);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [session, setSession] = useState<ICASession | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/icp-audit/outputs/${sessionId}`).then((r) => r.json()),
      fetch(`/api/icp-audit/messages/${sessionId}`).then((r) => r.json()),
    ])
      .then(([outputsData, msgsData]) => {
        setOutputs(outputsData.outputs ?? []);
        setMessages(msgsData.messages ?? []);
        setSession(msgsData.session ?? null);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const executiveSummary = outputs.find((o) => o.output_type === "executive-summary");
  const scorecard = outputs.find((o) => o.output_type === "icp-scorecard" && o.title === "ICP Scorecard");
  const segmentAnalyses = outputs.filter((o) => o.output_type === "segment-analysis");
  const personaCards = outputs.filter((o) => o.output_type === "persona-card");
  const tamSam = outputs.find((o) => o.output_type === "tam-sam-analysis");
  const prioritizationMatrix = outputs.find((o) => o.output_type === "prioritization-matrix");
  const agentMessages = messages.filter((m) => m.role === "agent");

  const hasDeliverables = scorecard || segmentAnalyses.length > 0 || personaCards.length > 0 || tamSam || prioritizationMatrix || executiveSummary;
  const hasTranscript = agentMessages.length > 0;
  const isIncomplete = !hasDeliverables && hasTranscript;

  async function saveToContext() {
    setSaving(true);
    try {
      const parts: string[] = [];
      if (executiveSummary) {
        const s = executiveSummary.metadata as Record<string, unknown>;
        parts.push(`# ${s.title}\n\nICP Health: ${s.icp_health}\n\n## Key Findings\n${(s.key_findings as Array<{ finding: string; impact: string }>)?.map((f) => `- [${f.impact}] ${f.finding}`).join("\n")}\n\n## Top Segments\n${(s.top_segments as string[])?.join(", ")}\n\n## Immediate Actions\n${(s.immediate_actions as string[])?.map((a) => `- ${a}`).join("\n")}`);
      }
      const content = parts.join("\n\n---\n\n");

      await fetch("/api/context/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: session?.workspace_id,
          title: session?.title ?? "ICP Audit",
          content,
          docType: "icp",
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save to context failed:", e);
    }
    setSaving(false);
  }

  async function runSynthesis() {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/icp-audit/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await fetch(`/api/icp-audit/outputs/${sessionId}`).then((r) => r.json());
        setOutputs(data.outputs ?? []);
        setActiveTab("scorecard");
      }
    } catch (e) {
      console.error("Synthesis failed:", e);
    }
    setSynthesizing(false);
  }

  function exportMarkdown() {
    const md = outputs
      .map((o) => `## ${o.title}\n\n${o.description}\n\n\`\`\`json\n${JSON.stringify(o.metadata, null, 2)}\n\`\`\``)
      .join("\n\n---\n\n");

    navigator.clipboard.writeText(md).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const IMPACT_COLORS: Record<string, string> = {
    critical: "text-red-400 bg-red-400/10",
    high: "text-orange-400 bg-orange-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    low: "text-green-400 bg-green-400/10",
  };

  const HEALTH_COLORS: Record<string, string> = {
    strong: "text-green-400",
    moderate: "text-yellow-400",
    weak: "text-orange-400",
    critical: "text-red-400",
  };

  const tabs: { key: Tab; label: string; count?: number; show: boolean }[] = [
    { key: "summary", label: "Summary", show: true },
    { key: "scorecard", label: "Scorecard", show: true },
    { key: "segments", label: "Segments", count: segmentAnalyses.length, show: true },
    { key: "personas", label: "Personas", count: personaCards.length, show: true },
    { key: "tam-sam", label: "TAM/SAM", show: true },
    { key: "priorities", label: "Priorities", show: true },
    { key: "transcript", label: "Transcript", count: agentMessages.length, show: hasTranscript },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="shrink-0 px-6 py-4 border-b border-border flex items-center gap-4">
        <button
          onClick={onBack}
          className="text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-4" />
        </button>
        <h1 className="text-sm font-semibold text-foreground truncate">
          {session?.title ?? "ICP Audit"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {isIncomplete && (
            <button
              onClick={runSynthesis}
              disabled={synthesizing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg transition-colors"
            >
              <Play className="size-3.5" />
              {synthesizing ? "Generating..." : "Generate deliverables"}
            </button>
          )}
          {hasDeliverables && session?.workspace_id && (
            <button
              onClick={saveToContext}
              disabled={saving || saved}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
            >
              <Save className="size-3.5" />
              {saved ? "Saved!" : saving ? "Saving..." : "Save to context"}
            </button>
          )}
          {outputs.length > 0 && (
            <button
              onClick={exportMarkdown}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
            >
              {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
              {copied ? "Copied!" : "Copy MD"}
            </button>
          )}
        </div>
      </div>

      {/* Incomplete banner */}
      {isIncomplete && !synthesizing && (
        <div className="shrink-0 px-6 py-3 bg-[#8a6e4e]/5 border-b border-[#8a6e4e]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <FileText className="size-4 text-[#c4a882] shrink-0" />
            <p className="text-xs text-muted-foreground">
              This audit has <span className="text-foreground font-medium">{agentMessages.length} agent messages</span> but no structured deliverables.
              Click &ldquo;Generate deliverables&rdquo; to create scorecard, segments, and more.
            </p>
          </div>
        </div>
      )}

      {synthesizing && (
        <div className="shrink-0 px-6 py-3 bg-[#8a6e4e]/5 border-b border-[#8a6e4e]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-muted-foreground">Generating deliverables from transcript...</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="shrink-0 px-6 border-b border-border">
        <div className="flex gap-1">
          {tabs.filter((t) => t.show).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-2.5 text-xs font-medium transition-colors border-b-2 -mb-px ${
                activeTab === tab.key
                  ? "text-[#c4a882] border-[#8a6e4e]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">({tab.count})</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto">
          {activeTab === "summary" && (
            executiveSummary ? (
              <SummaryView output={executiveSummary} impactColors={IMPACT_COLORS} healthColors={HEALTH_COLORS} />
            ) : (
              <EmptyState label="executive summary" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "scorecard" && (
            scorecard ? (
              <ICPScorecardView output={scorecard} />
            ) : (
              <EmptyState label="ICP scorecard" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "segments" && (
            <div className="space-y-6">
              {segmentAnalyses.map((s) => (
                <SegmentAnalysisView key={s.id} output={s} />
              ))}
              {segmentAnalyses.length === 0 && (
                <EmptyState label="segment analyses" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
              )}
            </div>
          )}
          {activeTab === "personas" && (
            <div className="space-y-6">
              {personaCards.map((p) => (
                <PersonaCardView key={p.id} output={p} />
              ))}
              {personaCards.length === 0 && (
                <EmptyState label="persona cards" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
              )}
            </div>
          )}
          {activeTab === "tam-sam" && (
            tamSam ? (
              <TAMSAMView output={tamSam} />
            ) : (
              <EmptyState label="TAM/SAM analysis" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "priorities" && (
            prioritizationMatrix ? (
              <PrioritizationMatrixView output={prioritizationMatrix} />
            ) : (
              <EmptyState label="prioritization matrix" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "transcript" && (
            <TranscriptView messages={agentMessages} />
          )}
        </div>
      </div>
    </div>
  );
}

function EmptyState({
  label,
  hasTranscript,
  onGenerate,
  synthesizing,
}: {
  label: string;
  hasTranscript: boolean;
  onGenerate: () => void;
  synthesizing: boolean;
}) {
  return (
    <div className="text-center py-12">
      <p className="text-sm text-muted-foreground mb-3">No {label} generated yet.</p>
      {hasTranscript && (
        <button
          onClick={onGenerate}
          disabled={synthesizing}
          className="px-4 py-2 text-xs bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          {synthesizing ? "Generating..." : `Generate from transcript`}
        </button>
      )}
    </div>
  );
}

function SummaryView({
  output,
  impactColors,
  healthColors,
}: {
  output: ICASessionOutput;
  impactColors: Record<string, string>;
  healthColors: Record<string, string>;
}) {
  const s = output.metadata as Record<string, unknown>;
  const health = String(s.icp_health ?? "moderate");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{String(s.title)}</h2>
        <div className="flex items-center gap-2 mb-4">
          <span className="text-xs text-muted-foreground">ICP Health:</span>
          <span className={`text-sm font-bold capitalize ${healthColors[health] ?? "text-foreground"}`}>
            {health}
          </span>
        </div>
      </div>

      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Findings</h3>
        <div className="space-y-2">
          {(s.key_findings as Array<{ finding: string; impact: string }>)?.map((f, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${impactColors[f.impact] ?? ""}`}>
                {f.impact}
              </span>
              <p className="text-sm text-foreground/90">{f.finding}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-green-400 uppercase tracking-wider mb-3">Top Segments</h3>
          <ul className="space-y-1">
            {(s.top_segments as string[])?.map((seg, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-green-400 shrink-0 mt-1">&#8226;</span>
                {seg}
              </li>
            ))}
          </ul>
        </div>
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-orange-400 uppercase tracking-wider mb-3">Deprioritize</h3>
          <ul className="space-y-1">
            {(s.segments_to_deprioritize as string[])?.map((seg, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-orange-400 shrink-0 mt-1">&#8226;</span>
                {seg}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Immediate Actions</h3>
        <ul className="space-y-1.5">
          {(s.immediate_actions as string[])?.map((a, i) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
              <span className="text-[#c4a882] shrink-0 mt-1">&#8226;</span>
              {a}
            </li>
          ))}
        </ul>
      </div>

      {(s.long_term_recommendations as string[])?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Long-term Recommendations</h3>
          <ul className="space-y-1.5">
            {(s.long_term_recommendations as string[]).map((r, i) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="shrink-0 mt-1">&#8594;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function TranscriptView({ messages }: { messages: EnrichedMessage[] }) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No messages.</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => (
        <div key={msg.id} className="flex gap-3">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
            style={{
              backgroundColor: `${msg.agent_color}15`,
              border: `1px solid ${msg.agent_color}40`,
            }}
          >
            {msg.agent_emoji}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium" style={{ color: msg.agent_color }}>
                {msg.agent_name}
              </span>
              <span className="text-[10px] text-muted-foreground">
                Step {msg.step_number}
              </span>
              {typeof msg.metadata?.phase === "string" && (
                <span className="text-[10px] text-muted-foreground uppercase">
                  {(msg.metadata.phase as string).replace("-", " ")}
                </span>
              )}
            </div>
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {msg.content}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
