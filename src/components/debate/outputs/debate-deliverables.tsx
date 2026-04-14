"use client";

import { useState, useEffect } from "react";
import { ArrowLeft, Play, Save, MessageSquare } from "lucide-react";
import type { DebateSession, AgentConfig, DebateMessage } from "@/lib/debate/types";
import type { DebateSummary } from "@/lib/debate/schemas";
import ReactMarkdown from "react-markdown";

type Tab = "summary" | "decisions" | "tensions" | "transcript";

type SessionOutput = {
  id: string;
  session_id: string;
  output_type: string;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

type Props = {
  sessionId: string;
  workspaceId: string;
  onBackToDebate?: () => void;
};

export function DebateDeliverables({ sessionId, workspaceId, onBackToDebate }: Props) {
  const [outputs, setOutputs] = useState<SessionOutput[]>([]);
  const [messages, setMessages] = useState<DebateMessage[]>([]);
  const [session, setSession] = useState<DebateSession | null>(null);
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [agentsMap, setAgentsMap] = useState<Map<string, AgentConfig>>(new Map());
  const [loading, setLoading] = useState(true);
  const [synthesizing, setSynthesizing] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("summary");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/debate/outputs/${sessionId}`).then((r) => r.json()),
      fetch(`/api/debate/messages/${sessionId}`).then((r) => r.json()),
      fetch(`/api/debate/session/${sessionId}`).then((r) => r.json()),
    ])
      .then(([outputsData, msgsData, sessionData]) => {
        setOutputs(outputsData.outputs ?? []);
        setMessages(msgsData.messages ?? []);
        if (sessionData.session) {
          setSession(sessionData.session);
        }
        if (sessionData.agents) {
          setAgents(sessionData.agents);
          setAgentsMap(new Map(sessionData.agents.map((a: AgentConfig) => [a.id, a])));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [sessionId]);

  const summaryOutput = outputs.find((o) => o.output_type === "debate-summary");
  const summary = summaryOutput?.metadata as unknown as DebateSummary | undefined;
  const agentMessages = messages.filter((m) => m.role === "agent" || m.role === "user");
  const hasTranscript = agentMessages.length > 0;
  const hasSummary = !!summary;
  const isActive = session?.status === "active";

  async function runSynthesis() {
    setSynthesizing(true);
    try {
      const res = await fetch("/api/debate/synthesize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });
      if (res.ok) {
        const data = await fetch(`/api/debate/outputs/${sessionId}`).then((r) => r.json());
        setOutputs(data.outputs ?? []);
        setActiveTab("summary");
        // Refresh session status
        const sData = await fetch(`/api/debate/session/${sessionId}`).then((r) => r.json());
        if (sData.session) setSession(sData.session);
      }
    } catch (e) {
      console.error("Synthesis failed:", e);
    }
    setSynthesizing(false);
  }

  async function saveToContext() {
    setSaving(true);
    try {
      const parts: string[] = [];
      if (summary) {
        parts.push(`# Debate Summary: ${session?.title ?? "Strategy Debate"}`);
        if (summary.key_takeaways?.length) {
          parts.push(`## Key Takeaways\n${summary.key_takeaways.map((t) => `- ${t}`).join("\n")}`);
        }
        if (summary.strategic_recommendations?.length) {
          parts.push(`## Strategic Recommendations\n${summary.strategic_recommendations.map((r) => `- ${r}`).join("\n")}`);
        }
        if (summary.key_decisions?.length) {
          parts.push(`## Key Decisions\n${summary.key_decisions.map((d) => `- **${d.topic}**: ${d.decision} (${d.confidence})`).join("\n")}`);
        }
        if (summary.unresolved_tensions?.length) {
          parts.push(`## Unresolved Tensions\n${summary.unresolved_tensions.map((t) => `- ${t}`).join("\n")}`);
        }
      }
      const content = parts.join("\n\n");

      await fetch("/api/context/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          title: session?.title ?? "Strategy Debate Summary",
          content,
          docType: "strategy",
        }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save to context failed:", e);
    }
    setSaving(false);
  }

  const tabs: { key: Tab; label: string; count?: number; show: boolean }[] = [
    { key: "summary", label: "Summary", show: true },
    { key: "decisions", label: "Decisions", count: summary?.key_decisions?.length, show: true },
    { key: "tensions", label: "Tensions", count: summary?.unresolved_tensions?.length, show: true },
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
        <h1 className="text-sm font-semibold text-foreground truncate">
          {session?.title ?? "Strategy Debate"}
        </h1>
        <div className="ml-auto flex items-center gap-2">
          {isActive && onBackToDebate && (
            <button
              onClick={onBackToDebate}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors"
            >
              <MessageSquare className="size-3.5" />
              Back to debate
            </button>
          )}
          {!hasSummary && hasTranscript && (
            <button
              onClick={runSynthesis}
              disabled={synthesizing}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-white bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 rounded-lg transition-colors"
            >
              <Play className="size-3.5" />
              {synthesizing ? "Synthesizing..." : "Re-synthesize"}
            </button>
          )}
          {hasSummary && (
            <>
              <button
                onClick={runSynthesis}
                disabled={synthesizing}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors disabled:opacity-40"
              >
                <Play className="size-3.5" />
                {synthesizing ? "Synthesizing..." : "Re-synthesize"}
              </button>
              <button
                onClick={saveToContext}
                disabled={saving || saved}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground bg-secondary/50 hover:bg-secondary rounded-lg transition-colors disabled:opacity-50"
              >
                <Save className="size-3.5" />
                {saved ? "Saved!" : saving ? "Saving..." : "Save to context"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Synthesizing banner */}
      {synthesizing && (
        <div className="shrink-0 px-6 py-3 bg-[#8a6e4e]/5 border-b border-[#8a6e4e]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <div className="w-4 h-4 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin shrink-0" />
            <p className="text-xs text-muted-foreground">
              Synthesizing debate insights... This may take a minute.
            </p>
          </div>
        </div>
      )}

      {/* No summary banner */}
      {!hasSummary && !synthesizing && hasTranscript && (
        <div className="shrink-0 px-6 py-3 bg-[#8a6e4e]/5 border-b border-[#8a6e4e]/10">
          <div className="max-w-4xl mx-auto flex items-center gap-3">
            <MessageSquare className="size-4 text-[#c4a882] shrink-0" />
            <p className="text-xs text-muted-foreground">
              This debate has <span className="text-foreground font-medium">{agentMessages.length} messages</span> but no structured summary.
              Click &ldquo;Re-synthesize&rdquo; to generate insights.
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
                  ? "text-[#c4a882] border-[#8a6e4e]"
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
            summary ? (
              <SummaryView summary={summary} />
            ) : (
              <EmptyState label="summary" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "decisions" && (
            summary?.key_decisions?.length ? (
              <DecisionsView decisions={summary.key_decisions} />
            ) : (
              <EmptyState label="decisions" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "tensions" && (
            summary?.unresolved_tensions?.length ? (
              <TensionsView tensions={summary.unresolved_tensions} />
            ) : (
              <EmptyState label="unresolved tensions" hasTranscript={hasTranscript} onGenerate={runSynthesis} synthesizing={synthesizing} />
            )
          )}
          {activeTab === "transcript" && (
            <TranscriptView messages={agentMessages} agentsMap={agentsMap} />
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
          className="px-4 py-2 text-xs bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-white rounded-lg transition-colors"
        >
          {synthesizing ? "Generating..." : "Generate from transcript"}
        </button>
      )}
    </div>
  );
}

function SummaryView({ summary }: { summary: DebateSummary }) {
  return (
    <div className="space-y-6">
      {/* Key Takeaways */}
      {summary.key_takeaways?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Key Takeaways
          </h3>
          <ul className="space-y-2">
            {summary.key_takeaways.map((t, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-[#c4a882] shrink-0 mt-1">&#8226;</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Strategic Recommendations */}
      {summary.strategic_recommendations?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Strategic Recommendations
          </h3>
          <ul className="space-y-2">
            {summary.strategic_recommendations.map((r, i) => (
              <li key={i} className="text-sm text-foreground/90 flex items-start gap-2">
                <span className="text-[#c4a882] shrink-0 mt-1">&#8226;</span>
                {r}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Quick Decisions preview */}
      {summary.key_decisions?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Key Decisions ({summary.key_decisions.length})
          </h3>
          <div className="space-y-2">
            {summary.key_decisions.slice(0, 3).map((d, i) => (
              <div key={i} className="flex items-start gap-2">
                <ConfidenceBadge confidence={d.confidence} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{d.topic}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{d.decision}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Unresolved tensions preview */}
      {summary.unresolved_tensions?.length > 0 && (
        <div className="border border-border rounded-xl p-5">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Unresolved Tensions ({summary.unresolved_tensions.length})
          </h3>
          <ul className="space-y-1.5">
            {summary.unresolved_tensions.slice(0, 3).map((t, i) => (
              <li key={i} className="text-sm text-orange-300/80 flex items-start gap-2">
                <span className="shrink-0 mt-0.5 text-orange-400">!</span>
                {t}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function DecisionsView({ decisions }: { decisions: DebateSummary["key_decisions"] }) {
  return (
    <div className="space-y-3">
      {decisions.map((d, i) => (
        <div key={i} className="border border-border rounded-xl p-5">
          <div className="flex items-start gap-3">
            <ConfidenceBadge confidence={d.confidence} />
            <div className="flex-1 min-w-0">
              <h4 className="text-sm font-semibold text-foreground">{d.topic}</h4>
              <p className="text-sm text-foreground/80 mt-1 leading-relaxed">{d.decision}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TensionsView({ tensions }: { tensions: string[] }) {
  return (
    <div className="space-y-3">
      {tensions.map((t, i) => (
        <div key={i} className="border border-orange-500/20 bg-orange-500/5 rounded-xl p-5">
          <div className="flex items-start gap-3">
            <span className="text-orange-400 text-sm font-bold shrink-0 mt-0.5">!</span>
            <p className="text-sm text-foreground/90 leading-relaxed">{t}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

function TranscriptView({
  messages,
  agentsMap,
}: {
  messages: DebateMessage[];
  agentsMap: Map<string, AgentConfig>;
}) {
  if (messages.length === 0) {
    return <p className="text-sm text-muted-foreground text-center py-8">No messages.</p>;
  }

  return (
    <div className="space-y-4">
      {messages.map((msg) => {
        const agent = msg.agent_config_id ? agentsMap.get(msg.agent_config_id) : null;
        const name = msg.role === "user" ? "You" : agent?.name ?? "Agent";
        const emoji = msg.role === "user" ? "" : agent?.avatar_emoji ?? "";
        const color = msg.role === "user" ? "#8a6e4e" : agent?.color ?? "#888";

        return (
          <div key={msg.id} className="flex gap-3">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-sm shrink-0 mt-0.5"
              style={{
                backgroundColor: `${color}15`,
                border: `1px solid ${color}40`,
              }}
            >
              {msg.role === "user" ? "H" : emoji}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium" style={{ color }}>
                  {name}
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
              <div className="text-sm text-foreground/90 leading-relaxed prose prose-invert prose-sm max-w-none">
                <ReactMarkdown>{msg.content}</ReactMarkdown>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: "text-green-400 bg-green-400/10 border-green-400/20",
  medium: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20",
  low: "text-red-400 bg-red-400/10 border-red-400/20",
};

function ConfidenceBadge({ confidence }: { confidence: string }) {
  const cls = CONFIDENCE_COLORS[confidence] ?? CONFIDENCE_COLORS.medium;
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border shrink-0 mt-0.5 ${cls}`}>
      {confidence}
    </span>
  );
}
