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
  "icp-audit": {
    "icp-scorecard": (o) => {
      const m = o.metadata as Record<string, unknown>;
      const lines = [`**${o.title}** (Score: ${m.overall_score ?? "N/A"}/100)`];
      lines.push(o.description);
      const gaps = m.critical_gaps as string[] | undefined;
      if (gaps?.length) lines.push(`Gaps: ${gaps.join("; ")}`);
      return lines.join("\n");
    },
    "segment-analysis": (o) => {
      const m = o.metadata as Record<string, unknown>;
      return `**${o.title}** (Fit: ${m.fit_score ?? "N/A"}/100, Action: ${m.recommendation ?? "N/A"})\n${m.rationale ?? o.description}`;
    },
    "executive-summary": formatExecutiveSummary,
  },
  "messaging-lab": {
    "messaging-framework": (o) => {
      const m = o.metadata as Record<string, unknown>;
      const lines = [`**${o.title}**`];
      if (m.positioning_statement) lines.push(String(m.positioning_statement));
      const pillars = m.pillars as Array<{ pillar: string }> | undefined;
      if (pillars?.length) lines.push(`Pillars: ${pillars.map((p) => p.pillar).join(", ")}`);
      return lines.join("\n");
    },
    "value-propositions": (o) => {
      const m = o.metadata as Record<string, unknown>;
      const props = m.propositions as Array<{ headline: string }> | undefined;
      return `**${o.title}**\n${props?.map((p) => `- ${p.headline}`).join("\n") ?? o.description}`;
    },
    "executive-summary": formatExecutiveSummary,
  },
  "channel-planner": {
    "channel-scorecard": (o) => {
      const m = o.metadata as Record<string, unknown>;
      const channels = m.channels as Array<{ channel_name: string; recommendation: string; fit_score: number }> | undefined;
      const lines = [`**${o.title}**`];
      if (channels?.length) {
        lines.push(channels.map((c) => `- ${c.channel_name}: ${c.recommendation} (fit: ${c.fit_score}/100)`).join("\n"));
      }
      return lines.join("\n");
    },
    "budget-allocation": (o) => {
      const m = o.metadata as Record<string, unknown>;
      return `**${o.title}**\n${m.reallocation_summary ?? o.description}`;
    },
    "executive-summary": formatExecutiveSummary,
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
  "icp-audit": "ICP Audit",
  "messaging-lab": "Messaging Lab",
  "channel-planner": "Channel Planner",
};
