import type { CampaignRow, AnalyzerFocus, ICPDefinition, ChannelConfig, SequenceParams } from "./types";
import { ANALYZER_FOCUS_LABELS } from "./types";

// ── Helpers ──

function formatCampaignStats(r: CampaignRow): string {
  return `- ${r.campaign_name} | ${r.channel} | segment: ${r.segment ?? "N/A"} | sent: ${r.sent ?? "?"} | open: ${r.open_rate ?? "?"}% | reply: ${r.reply_rate ?? "?"}% | meetings: ${r.meetings_booked ?? "?"} | period: ${r.period ?? "N/A"} | ${r.notes ?? ""}`;
}

function formatCampaignContent(r: CampaignRow): string {
  if (!r.sequence_steps || r.sequence_steps.length === 0) return "";
  const steps = r.sequence_steps
    .map((s) => {
      const parts = [`  Step ${s.step_number} (${s.channel})`];
      if (s.delay_days) parts[0] += ` — delay: ${s.delay_days}d`;
      if (s.subject) parts.push(`    Subject: ${s.subject}`);
      if (s.body) {
        const bodyPreview = s.body.length > 500 ? s.body.slice(0, 500) + "…" : s.body;
        parts.push(`    Body: ${bodyPreview}`);
      }
      return parts.join("\n");
    })
    .join("\n");
  return `\n  [Sequence — ${r.sequence_steps.length} steps]\n${steps}`;
}

function formatCampaignsWithContent(rows: CampaignRow[]): string {
  return rows
    .map((r) => formatCampaignStats(r) + formatCampaignContent(r))
    .join("\n\n");
}

function formatCampaignsStatsOnly(rows: CampaignRow[]): string {
  return rows.map(formatCampaignStats).join("\n");
}

// ══════════════════════════════════════════
// MODE 1: CAMPAIGN ANALYZER PROMPTS
// ══════════════════════════════════════════

export function buildCampaignDataPrompt(
  rows: CampaignRow[],
  workspaceContext: string,
  toolInsights?: string
): string {
  const hasContent = rows.some((r) => r.sequence_steps && r.sequence_steps.length > 0);
  const dataSection = hasContent
    ? formatCampaignsWithContent(rows)
    : formatCampaignsStatsOnly(rows);

  return `You are a campaign performance analyst. Analyze the following outbound campaign data and produce a structured KPI summary.

## Campaign Data (Performance + Messaging Content)
${dataSection}

## Company Context
${workspaceContext || "No company context provided."}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
Calculate aggregate metrics across all campaigns. Identify the best and worst performing campaigns with clear reasoning.
${hasContent ? "\nIMPORTANT: You have access to the actual email/message content of each campaign. Analyze the MESSAGING and POSITIONING — what language, angles, and value props correlate with higher open/reply rates? This is critical for the analysis." : ""}`;
}

export function buildAnalyzerAssessmentPrompt(
  campaignData: CampaignRow[],
  kpiSummary: string,
  focusDimensions: AnalyzerFocus[],
  customQuestion: string | undefined,
  workspaceContext: string,
  knowledgeBase: string,
  toolInsights?: string
): string {
  const hasContent = campaignData.some((r) => r.sequence_steps && r.sequence_steps.length > 0);
  const dataSection = hasContent
    ? formatCampaignsWithContent(campaignData)
    : formatCampaignsStatsOnly(campaignData);

  const focusText = focusDimensions
    .map((f) => `- ${ANALYZER_FOCUS_LABELS[f]}`)
    .join("\n");

  return `## Campaign Performance Data & Messaging Content
${dataSection}

## KPI Summary
${kpiSummary}

## Company Context
${workspaceContext || "No company context provided."}

## Analysis Focus
${focusText}
${customQuestion ? `\n## Additional Question\n${customQuestion}` : ""}

## GTM Knowledge Base
${knowledgeBase}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

CRITICAL: Keep your ENTIRE response under 150 words. Be sharp, direct, and actionable. Use bullet points. One key insight per focus dimension.
${hasContent ? "You have the FULL MESSAGE CONTENT — analyze which subject lines, value props, angles, and CTAs drive better results. Compare messaging across campaigns." : "Focus on what the data reveals and what should change."}`;
}

export function buildAnalyzerDebateRound1Prompt(): string {
  return `You have read all four analyst assessments on campaign performance. Your job:

1. **Challenge**: What did another analyst miss or get wrong? Name them.
2. **Add nuance**: What context is being ignored in the data?
3. **Prioritize**: What is the single most important change to make?

CRITICAL: Keep under 100 words. Challenge ONE specific point from another analyst.`;
}

export function buildAnalyzerDebateRound2Prompt(): string {
  return `Based on this debate, state your final position:

1. **Changed view?** What convinced you?
2. **Still disagree?** Your strongest conviction?
3. **Top 3 recommendations** for the outbound team RIGHT NOW.

CRITICAL: Under 80 words. No hedging.`;
}

export function buildPlaybookSynthesisPrompt(
  analysisTranscript: string,
  campaignData: CampaignRow[],
  workspaceContext: string,
  toolInsights?: string
): string {
  const hasContent = campaignData.some((r) => r.sequence_steps && r.sequence_steps.length > 0);
  const dataSection = hasContent
    ? formatCampaignsWithContent(campaignData)
    : formatCampaignsStatsOnly(campaignData);

  return `You are a synthesis engine. Generate a comprehensive strategic playbook from the analyst debate.

## Campaign Data & Messaging Content
${dataSection}

## Analysis Transcript
${analysisTranscript}

## Company Context
${workspaceContext || "No company context provided."}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
Generate a strategic playbook with:
- Executive summary (2-3 sentences)
- Segment analysis with performance ratings, metrics, insights, and recommendations
- Channel analysis with effectiveness ratings and optimization tips
${hasContent ? "- **Messaging analysis**: Which subject lines, opening hooks, value props, and CTAs performed best? What patterns emerge in top-performing vs low-performing campaigns?\n- **Positioning insights**: What angles resonated? What language worked? What should be replicated vs abandoned?" : ""}
- Cadence insights (optimal touchpoints, best days/times, spacing)
- KPI benchmarks (current vs industry benchmark)
- Lessons learned with evidence and actions
- Top 5-7 actionable recommendations

Be data-driven and practical. This playbook will be used to build new outbound sequences.`;
}

// ══════════════════════════════════════════
// MODE 2: SEQUENCE BUILDER PROMPTS
// ══════════════════════════════════════════

export function buildStrategyDebatePrompt(
  icp: ICPDefinition,
  channels: ChannelConfig,
  params: SequenceParams,
  workspaceContext: string,
  playbookContext: string,
  toolInsights?: string
): string {
  const enabledChannels = Object.entries(channels)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  return `## Target ICP
- **Persona**: ${icp.persona_role}${icp.industry ? ` in ${icp.industry}` : ""}${icp.company_size ? ` (${icp.company_size})` : ""}
- **Pain Points**: ${icp.pain_points.join(", ")}
- **Value Props**: ${icp.value_props.join(", ")}

## Sequence Configuration
- Channels: ${enabledChannels}
- Length: ${params.sequence_length} touchpoints over ${params.total_duration_days} days
- Tone: ${params.tone}
- Language: ${params.language === "fr" ? "French" : "English"}
- A/B variants: ${params.ab_variants ? "Yes" : "No"}

## Company Context
${workspaceContext || "No company context provided."}
${playbookContext ? `\n## Strategic Playbook Insights\n${playbookContext}\n` : ""}
${toolInsights ? `\n## Cross-Tool Insights\n${toolInsights}\n` : ""}
---

Debate the optimal outbound approach: Which channel should lead? What's the ideal cadence? How should we personalize for this ICP? What messaging angle will cut through noise?

CRITICAL: Under 150 words. Be specific to this ICP and these channels. No generic advice.`;
}

export function buildBuilderDebateRound2Prompt(): string {
  return `Based on the debate, finalize the sequence strategy:

1. **Agreed channel priority** and why
2. **Messaging angle** that won the debate
3. **Specific personalization** approach for this ICP
4. **Cadence timing** consensus

CRITICAL: Under 100 words. This will directly inform sequence generation.`;
}

export function buildSequenceGenerationPrompt(
  icp: ICPDefinition,
  channels: ChannelConfig,
  params: SequenceParams,
  debateTranscript: string,
  workspaceContext: string,
  playbookContext: string,
  toolInsights?: string
): string {
  const enabledChannels = Object.entries(channels)
    .filter(([, v]) => v)
    .map(([k]) => k)
    .join(", ");

  return `You are an expert outbound sequence builder. Generate a complete multi-channel outbound sequence based on the strategic debate and ICP definition.

## Target ICP
- **Title**: ${icp.title}
- **Persona**: ${icp.persona_role}${icp.industry ? ` in ${icp.industry}` : ""}${icp.company_size ? ` (${icp.company_size})` : ""}
- **Pain Points**: ${icp.pain_points.join("; ")}
- **Value Props**: ${icp.value_props.join("; ")}

## Sequence Configuration
- Channels: ${enabledChannels}
- Length: ${params.sequence_length} touchpoints
- Duration: ${params.total_duration_days} days
- Tone: ${params.tone}
- Language: ${params.language === "fr" ? "French" : "English"}
- A/B variants: ${params.ab_variants ? "Yes — generate variants for email steps" : "No"}

## Strategic Debate Context
${debateTranscript}

## Company Context
${workspaceContext || "No company context provided."}
${playbookContext ? `\n## Strategic Playbook\n${playbookContext}\n` : ""}
${toolInsights ? `\n## Cross-Tool Insights\n${toolInsights}\n` : ""}
---

Generate exactly ONE sequence with ${params.sequence_length} steps. Rules:
- Each step has: step_number, day (starting from day 1), channel, action_type, subject (for emails), body (the actual message/script), notes (internal SDR notes), goal
- For LinkedIn: action_type can be "connection_request", "inmail", "comment", "voice_note"
- For calls: include a call_script field with a natural script
- For emails: include a compelling subject line
- Space steps logically across ${params.total_duration_days} days
- Messages should feel human, not AI-generated. ${params.tone === "bold" ? "Be bold and pattern-breaking." : params.tone === "conversational" ? "Be casual and warm." : "Be professional but not stiff."}
- Write all messages in ${params.language === "fr" ? "French" : "English"}
- Include strategy_rationale explaining why this sequence structure was chosen
${params.ab_variants ? "- Also generate A/B variants for the first 2 email steps with different hypotheses and what to measure" : ""}

Provide expected metrics (target_open_rate, target_reply_rate, target_meeting_rate) as percentage strings.`;
}
