import type { SessionOutputRecord } from "./types";

type OutputFormatter = (output: SessionOutputRecord) => string;

// ── CI Formatters ──

const formatBattleCard: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}** (Threat: ${m.threat_level ?? "unknown"})`];
  lines.push(o.description);
  if (m.winning_talk_track) lines.push(`Talk track: ${m.winning_talk_track}`);
  const diffs = m.key_differentiators as Array<{ our_advantage: string }> | undefined;
  if (diffs?.length) {
    lines.push(`Differentiators: ${diffs.map((d) => d.our_advantage).join(", ")}`);
  }
  return lines.join("\n");
};

const formatThreatAssessment: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}**`];
  lines.push(o.description);
  if (m.overall_competitive_position) {
    lines.push(`Position: ${m.overall_competitive_position}`);
  }
  const threats = m.threats as Array<{ competitor: string; threat: string; severity: string }> | undefined;
  if (threats?.length) {
    lines.push(threats.map((t) => `- [${t.severity}] ${t.competitor}: ${t.threat}`).join("\n"));
  }
  return lines.join("\n");
};

const formatExecutiveSummary: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}**`];
  if (m.competitive_landscape) lines.push(String(m.competitive_landscape));
  if (m.our_position) lines.push(`Our position: ${m.our_position}`);
  const actions = m.immediate_actions as string[] | undefined;
  if (actions?.length) {
    lines.push(`Actions: ${actions.join("; ")}`);
  }
  return lines.join("\n");
};

const formatDebateSummary: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}**`];
  lines.push(o.description);
  const takeaways = m.key_takeaways as string[] | undefined;
  if (takeaways?.length) {
    lines.push(`Key takeaways:\n${takeaways.map((t) => `- ${t}`).join("\n")}`);
  }
  const recs = m.strategic_recommendations as string[] | undefined;
  if (recs?.length) {
    lines.push(`Recommendations:\n${recs.map((r) => `- ${r}`).join("\n")}`);
  }
  return lines.join("\n");
};

// ── Outbound Formatters ──

const formatStrategicPlaybook: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}**`];
  if (m.executive_summary) lines.push(String(m.executive_summary));
  const recs = m.top_recommendations as string[] | undefined;
  if (recs?.length) {
    lines.push(`Recommendations:\n${recs.map((r) => `- ${r}`).join("\n")}`);
  }
  return lines.join("\n");
};

const formatOutboundSequence: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const lines = [`**${o.title}**`];
  lines.push(o.description);
  if (m.strategy_rationale) lines.push(String(m.strategy_rationale));
  return lines.join("\n");
};

const formatCampaignKPIs: OutputFormatter = (o) => {
  const m = o.metadata as Record<string, unknown>;
  const overall = m.overall_metrics as { avg_open_rate: number; avg_reply_rate: number } | undefined;
  const lines = [`**${o.title}**`];
  if (overall) {
    lines.push(`Open: ${overall.avg_open_rate}% | Reply: ${overall.avg_reply_rate}%`);
  }
  return lines.join("\n");
};

// ── Default ──

const formatDefault: OutputFormatter = (o) => {
  return `**${o.title}**\n${o.description}`;
};

// ── Registry ──

const formatters: Record<string, Record<string, OutputFormatter>> = {
  "competitive-intel": {
    "battle-card": formatBattleCard,
    "threat-assessment": formatThreatAssessment,
    "executive-summary": formatExecutiveSummary,
  },
  "strategy-debate": {
    "debate-summary": formatDebateSummary,
  },
  "outbound-builder": {
    "strategic-playbook": formatStrategicPlaybook,
    "outbound-sequence": formatOutboundSequence,
    "campaign-kpi-summary": formatCampaignKPIs,
  },
};

export function formatOutput(toolId: string, output: SessionOutputRecord): string {
  const formatter = formatters[toolId]?.[output.output_type] ?? formatDefault;
  return formatter(output);
}

export const TOOL_DISPLAY_NAMES: Record<string, string> = {
  "strategy-debate": "Strategy Debate",
  "competitive-intel": "Competitive Intelligence",
  "outbound-builder": "Outbound Builder",
};
