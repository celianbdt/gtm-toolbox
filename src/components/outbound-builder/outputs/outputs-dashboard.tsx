"use client";

import { useState, useEffect } from "react";
import type { OBSessionOutput } from "@/lib/outbound-builder/types";

type Props = {
  sessionId: string;
  onBack: () => void;
};

export function OutputsDashboard({ sessionId, onBack }: Props) {
  const [outputs, setOutputs] = useState<OBSessionOutput[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/outbound-builder/outputs/${sessionId}`);
        if (res.ok) {
          const { outputs: o } = await res.json();
          setOutputs(o);
          if (o.length > 0) setSelectedId(o[0].id);
        }
      } catch (e) {
        console.error("Failed to load outputs:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [sessionId]);

  const selected = outputs.find((o) => o.id === selectedId);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        Loading outputs...
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-3 border-b border-border flex items-center justify-between">
        <button onClick={onBack} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
          &larr; Back
        </button>
        <span className="text-sm text-foreground font-medium">{outputs.length} outputs</span>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Output list sidebar */}
        <div className="w-64 border-r border-border overflow-y-auto py-2">
          {outputs.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedId(o.id)}
              className={`w-full text-left px-4 py-3 transition-colors ${
                selectedId === o.id ? "bg-[#8a6e4e]/10 border-l-2 border-l-[#8a6e4e]" : "hover:bg-secondary/50"
              }`}
            >
              <span className="text-xs text-muted-foreground uppercase">{o.output_type}</span>
              <p className="text-sm text-foreground font-medium truncate">{o.title}</p>
            </button>
          ))}
        </div>

        {/* Output detail */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {selected ? (
            <div className="max-w-3xl">
              <h2 className="text-lg font-semibold text-foreground mb-1">{selected.title}</h2>
              <p className="text-sm text-muted-foreground mb-6">{selected.description}</p>

              {selected.output_type === "strategic-playbook" && (
                <PlaybookView metadata={selected.metadata} />
              )}
              {selected.output_type === "outbound-sequence" && (
                <SequenceView metadata={selected.metadata} />
              )}
              {selected.output_type === "campaign-kpi-summary" && (
                <KPIView metadata={selected.metadata} />
              )}
              {selected.output_type === "ab-variants" && (
                <ABView metadata={selected.metadata} />
              )}
              {selected.output_type === "sequence-package" && (
                <PackageView metadata={selected.metadata} />
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Select an output to view details.</p>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Sub-views ──

function PlaybookView({ metadata }: { metadata: Record<string, unknown> }) {
  const m = metadata;
  const segments = (m.segments as Array<{ name: string; performance_rating: string; insights: string[]; recommendations: string[] }>) ?? [];
  const channels = (m.channel_analysis as Array<{ channel: string; effectiveness: string; best_use_case: string; optimization_tips: string[] }>) ?? [];
  const recs = (m.top_recommendations as string[]) ?? [];
  const lessons = (m.lessons_learned as Array<{ lesson: string; evidence: string; action: string }>) ?? [];

  return (
    <div className="space-y-6">
      {typeof m.executive_summary === "string" && (
        <div className="p-4 bg-[#8a6e4e]/5 rounded-lg border border-[#8a6e4e]/20">
          <h3 className="text-xs font-medium text-[#c4a882] uppercase mb-2">Executive Summary</h3>
          <p className="text-sm text-foreground">{m.executive_summary}</p>
        </div>
      )}

      {segments.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Segment Analysis</h3>
          <div className="space-y-3">
            {segments.map((s, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium text-foreground">{s.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    s.performance_rating === "strong" ? "bg-emerald-500/10 text-emerald-400" :
                    s.performance_rating === "moderate" ? "bg-yellow-500/10 text-yellow-400" :
                    "bg-red-500/10 text-red-400"
                  }`}>{s.performance_rating}</span>
                </div>
                <ul className="text-xs text-muted-foreground space-y-1">
                  {s.insights?.map((ins, j) => <li key={j}>• {ins}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {channels.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-3">Channel Analysis</h3>
          <div className="grid grid-cols-1 gap-2">
            {channels.map((c, i) => (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-medium text-foreground">{c.channel}</span>
                  <span className="text-xs text-muted-foreground">({c.effectiveness})</span>
                </div>
                <p className="text-xs text-muted-foreground">{c.best_use_case}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {recs.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Top Recommendations</h3>
          <ol className="text-sm text-muted-foreground space-y-1.5 list-decimal list-inside">
            {recs.map((r, i) => <li key={i}>{r}</li>)}
          </ol>
        </div>
      )}

      {lessons.length > 0 && (
        <div>
          <h3 className="text-sm font-medium text-foreground mb-2">Lessons Learned</h3>
          <div className="space-y-2">
            {lessons.map((l, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <p className="text-foreground font-medium">{l.lesson}</p>
                <p>Evidence: {l.evidence}</p>
                <p>Action: {l.action}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SequenceView({ metadata }: { metadata: Record<string, unknown> }) {
  const steps = (metadata.steps as Array<{
    step_number: number; day: number; channel: string; action_type: string;
    subject?: string; body: string; call_script?: string; notes: string; goal: string;
  }>) ?? [];

  const channelIcons: Record<string, string> = { email: "✉️", linkedin: "💼", call: "📞" };

  return (
    <div className="space-y-4">
      {typeof metadata.strategy_rationale === "string" && (
        <p className="text-sm text-muted-foreground italic">{metadata.strategy_rationale}</p>
      )}
      <div className="relative">
        <div className="absolute left-4 top-0 bottom-0 w-px bg-border" />
        <div className="space-y-4">
          {steps.map((step) => (
            <div key={step.step_number} className="relative pl-10">
              <div className="absolute left-2 top-2 w-4 h-4 rounded-full bg-secondary border-2 border-[#8a6e4e] flex items-center justify-center text-[8px] text-foreground">
                {step.step_number}
              </div>
              <div className="border border-border rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  <span>{channelIcons[step.channel] ?? "📌"}</span>
                  <span className="text-xs font-medium text-foreground">{step.action_type}</span>
                  <span className="text-[10px] text-muted-foreground ml-auto">Day {step.day}</span>
                </div>
                {step.subject && (
                  <p className="text-xs text-[#c4a882] mb-1">Subject: {step.subject}</p>
                )}
                <p className="text-sm text-foreground whitespace-pre-wrap mb-2">{step.body}</p>
                {step.call_script && (
                  <div className="bg-secondary/50 rounded p-2 mb-2">
                    <p className="text-xs text-muted-foreground">Call script:</p>
                    <p className="text-xs text-foreground">{step.call_script}</p>
                  </div>
                )}
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Goal: {step.goal}</span>
                  <span>{step.notes}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function KPIView({ metadata }: { metadata: Record<string, unknown> }) {
  const m = metadata;
  const overall = m.overall_metrics as { avg_open_rate: number; avg_reply_rate: number; avg_meetings_rate: number; total_sent: number } | undefined;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{String(m.total_campaigns_analyzed ?? 0)} campaigns analyzed</p>
      {overall && (
        <div className="grid grid-cols-2 gap-3">
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{overall.avg_open_rate}%</p>
            <p className="text-xs text-muted-foreground">Avg Open Rate</p>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{overall.avg_reply_rate}%</p>
            <p className="text-xs text-muted-foreground">Avg Reply Rate</p>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{overall.avg_meetings_rate}%</p>
            <p className="text-xs text-muted-foreground">Avg Meeting Rate</p>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-foreground">{overall.total_sent.toLocaleString()}</p>
            <p className="text-xs text-muted-foreground">Total Sent</p>
          </div>
        </div>
      )}
    </div>
  );
}

function ABView({ metadata }: { metadata: Record<string, unknown> }) {
  const variants = (metadata.variants as Array<{
    step_number: number;
    variant_a: { subject?: string; body: string; hypothesis: string };
    variant_b: { subject?: string; body: string; hypothesis: string };
    what_to_measure: string;
  }>) ?? [];

  return (
    <div className="space-y-4">
      {variants.map((v, i) => (
        <div key={i} className="border border-border rounded-lg p-4">
          <h4 className="text-sm font-medium text-foreground mb-3">Step {v.step_number} — A/B Test</h4>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-500/5 rounded-lg p-3">
              <span className="text-xs font-medium text-blue-400">Variant A</span>
              {v.variant_a.subject && <p className="text-xs text-muted-foreground mt-1">Subject: {v.variant_a.subject}</p>}
              <p className="text-sm text-foreground mt-1">{v.variant_a.body}</p>
              <p className="text-xs text-muted-foreground mt-2 italic">{v.variant_a.hypothesis}</p>
            </div>
            <div className="bg-purple-500/5 rounded-lg p-3">
              <span className="text-xs font-medium text-purple-400">Variant B</span>
              {v.variant_b.subject && <p className="text-xs text-muted-foreground mt-1">Subject: {v.variant_b.subject}</p>}
              <p className="text-sm text-foreground mt-1">{v.variant_b.body}</p>
              <p className="text-xs text-muted-foreground mt-2 italic">{v.variant_b.hypothesis}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">Measure: {v.what_to_measure}</p>
        </div>
      ))}
    </div>
  );
}

function PackageView({ metadata }: { metadata: Record<string, unknown> }) {
  const m = metadata;
  const expected = m.expected_metrics as { target_open_rate: string; target_reply_rate: string; target_meeting_rate: string } | undefined;

  return (
    <div className="space-y-4">
      {typeof m.overall_strategy === "string" && (
        <div className="p-4 bg-[#8a6e4e]/5 rounded-lg border border-[#8a6e4e]/20">
          <h3 className="text-xs font-medium text-[#c4a882] uppercase mb-2">Overall Strategy</h3>
          <p className="text-sm text-foreground">{m.overall_strategy}</p>
        </div>
      )}
      {expected && (
        <div className="grid grid-cols-3 gap-3">
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{expected.target_open_rate}</p>
            <p className="text-xs text-muted-foreground">Target Open</p>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{expected.target_reply_rate}</p>
            <p className="text-xs text-muted-foreground">Target Reply</p>
          </div>
          <div className="border border-border rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-foreground">{expected.target_meeting_rate}</p>
            <p className="text-xs text-muted-foreground">Target Meeting</p>
          </div>
        </div>
      )}
    </div>
  );
}
