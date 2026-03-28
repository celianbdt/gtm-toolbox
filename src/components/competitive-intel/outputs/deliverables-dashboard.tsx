"use client";

import { useState, useEffect } from "react";
import type { CISessionOutput, CISession } from "@/lib/competitive-intel/types";
import { BattleCardView } from "./battle-card";
import { PositioningMatrixView } from "./positioning-matrix";
import { ObjectionPlaybookView } from "./objection-playbook";
import { ThreatAssessmentView } from "./threat-assessment";
import { ExportButton } from "./export-button";
import { ArrowLeft, Play, FileText, Save } from "lucide-react";

type Tab = "summary" | "battle-cards" | "positioning" | "objections" | "threats" | "transcript";

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

export function DeliverablesDashboard({ sessionId, onBack }: Props) {
  const [outputs, setOutputs] = useState<CISessionOutput[]>([]);
  const [messages, setMessages] = useState<EnrichedMessage[]>([]);
  const [session, setSession] = useState<CISession | null>(null);
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");

  useEffect(() => {
    Promise.all([
      fetch(`/api/competitive-intel/outputs/${sessionId}`).then((r) => r.json()),
      fetch(`/api/competitive-intel/messages/${sessionId}`).then((r) => r.json()),
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
  const battleCards = outputs.filter((o) => o.output_type === "battle-card");
  const positioningMatrix = outputs.find((o) => o.output_type === "positioning-matrix");
  const playbooks = outputs.filter((o) => o.output_type === "objection-playbook");
  const threatAssessment = outputs.find((o) => o.output_type === "threat-assessment");
  const agentMessages = messages.filter((m) => m.role === "agent");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const hasDeliverables = battleCards.length > 0 || positioningMatrix || playbooks.length > 0 || threatAssessment || executiveSummary;
  const hasTranscript = agentMessages.length > 0;
  const isIncomplete = !hasDeliverables && hasTranscript;

  async function saveToContext() {
    setSaving(true);
    try {
      // Build markdown from all outputs
      const parts: string[] = [];
      if (executiveSummary) {
        const s = executiveSummary.metadata as any;
        parts.push(`# ${s.title}\n\n${s.competitive_landscape}\n\n## Key Findings\n${s.key_findings?.map((f: any) => `- [${f.impact}] ${f.finding}`).join("\n")}\n\n## Our Position\n${s.our_position}\n\n## Immediate Actions\n${s.immediate_actions?.map((a: string) => `- ${a}`).join("\n")}`);
      }
      for (const bc of battleCards) {
        const c = bc.metadata as any;
        parts.push(`## Battle Card: ${c.competitor_name}\n${c.one_liner}\n\nThreat: ${c.threat_level} | Overlap: ${c.target_overlap}\n\n**Strengths:** ${c.strengths?.map((s: any) => s.point).join(", ")}\n**Weaknesses:** ${c.weaknesses?.map((w: any) => w.point).join(", ")}\n\n**Talk Track:** ${c.winning_talk_track}`);
      }
      const content = parts.join("\n\n---\n\n");

      await fetch("/api/context/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId: session?.workspace_id,
          title: session?.title ?? "Competitive Intel Analysis",
          content,
          docType: "competitor",
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
      const res = await fetch("/api/competitive-intel/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        // Reload outputs
        const data = await fetch(`/api/competitive-intel/outputs/${sessionId}`).then((r) => r.json());
        setOutputs(data.outputs ?? []);
        setActiveTab("battle-cards");
      }
    } catch (e) {
      console.error("Synthesis failed:", e);
    }
    setSynthesizing(false);
  }

  const tabs: { key: Tab; label: string; count?: number; show: boolean }[] = [
    { key: "summary", label: "Summary", show: true },
    { key: "battle-cards", label: "Battle Cards", count: battleCards.length, show: true },
    { key: "positioning", label: "Positioning", show: true },
    { key: "objections", label: "Objections", count: playbooks.length, show: true },
    { key: "threats", label: "Threats", show: true },
    { key: "transcript", label: "Transcript", count: agentMessages.length, show: hasTranscript },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-6 h-6 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin" />
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
          {session?.title ?? "Competitive Intel"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {isIncomplete && (
            <button
              onClick={runSynthesis}
              disabled={synthesizing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg transition-colors"
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
          <ExportButton outputs={outputs} />
        </div>
      </div>

      {/* Incomplete banner */}
      {isIncomplete && !synthesizing && (
        <div className="shrink-0 px-6 py-3 bg-[#7C3AED]/5 border-b border-[#7C3AED]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <FileText className="size-4 text-[#A78BFA] shrink-0" />
            <p className="text-xs text-muted-foreground">
              This analysis has <span className="text-foreground font-medium">{agentMessages.length} agent messages</span> but no structured deliverables.
              Click &ldquo;Generate deliverables&rdquo; to create battle cards, playbooks and more from the existing transcript.
            </p>
          </div>
        </div>
      )}

      {synthesizing && (
        <div className="shrink-0 px-6 py-3 bg-[#7C3AED]/5 border-b border-[#7C3AED]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#7C3AED] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-muted-foreground">
              Generating deliverables from transcript... This may take a minute.
            </p>
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
                  ? "text-[#A78BFA] border-[#7C3AED]"
                  : "text-muted-foreground border-transparent hover:text-foreground"
              }`}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span className="ml-1.5 text-[10px] text-muted-foreground">
                  ({tab.count})
                </span>
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
              <SummaryView output={executiveSummary} />
            ) : (
              <EmptyState label="executive summary" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "battle-cards" && (
            <div className="space-y-6">
              {battleCards.map((bc) => (
                <BattleCardView key={bc.id} output={bc} />
              ))}
              {battleCards.length === 0 && (
                <EmptyState label="battle cards" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
              )}
            </div>
          )}
          {activeTab === "positioning" && (
            positioningMatrix ? (
              <PositioningMatrixView output={positioningMatrix} />
            ) : (
              <EmptyState label="positioning matrix" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "objections" && (
            <div className="space-y-6">
              {playbooks.map((pb) => (
                <ObjectionPlaybookView key={pb.id} output={pb} />
              ))}
              {playbooks.length === 0 && (
                <EmptyState label="objection playbooks" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
              )}
            </div>
          )}
          {activeTab === "threats" && (
            threatAssessment ? (
              <ThreatAssessmentView output={threatAssessment} />
            ) : (
              <EmptyState label="threat assessment" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
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
      <p className="text-sm text-muted-foreground mb-3">
        No {label} generated yet.
      </p>
      {hasTranscript && (
        <button
          onClick={onGenerate}
          disabled={synthesizing}
          className="px-4 py-2 text-xs bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          {synthesizing ? "Generating..." : `Generate from transcript`}
        </button>
      )}
    </div>
  );
}

function SummaryView({ output }: { output: CISessionOutput }) {
  const s = output.metadata as any;
  const IMPACT_COLORS: Record<string, string> = {
    critical: "text-red-400 bg-red-400/10",
    high: "text-orange-400 bg-orange-400/10",
    medium: "text-yellow-400 bg-yellow-400/10",
    low: "text-green-400 bg-green-400/10",
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-2">{s.title}</h2>
        <p className="text-sm text-foreground/80 leading-relaxed">{s.competitive_landscape}</p>
      </div>

      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Key Findings</h3>
        <div className="space-y-2">
          {s.key_findings?.map((f: any, i: number) => (
            <div key={i} className="flex items-start gap-2">
              <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 mt-0.5 ${IMPACT_COLORS[f.impact] ?? ""}`}>
                {f.impact}
              </span>
              <p className="text-sm text-foreground/90">{f.finding}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Our Position</h3>
        <p className="text-sm text-foreground/80 leading-relaxed">{s.our_position}</p>
      </div>

      <div className="border border-border rounded-xl p-5">
        <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Immediate Actions</h3>
        <ul className="space-y-1.5">
          {s.immediate_actions?.map((a: string, i: number) => (
            <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
              <span className="text-[#A78BFA] shrink-0 mt-1">&#8226;</span>
              {a}
            </li>
          ))}
        </ul>
      </div>

      {s.watch_list?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">Watch List</h3>
          <ul className="space-y-1.5">
            {s.watch_list.map((w: string, i: number) => (
              <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                <span className="shrink-0 mt-1">&#128065;</span>
                {w}
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
                  {msg.metadata.phase.replace("-", " ")}
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
