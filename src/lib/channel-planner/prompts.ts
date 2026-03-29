import type { CPSessionConfig, ChannelFocus } from "./types";
import type { ChannelContext } from "./schemas";
import { CHANNEL_FOCUS_LABELS, GROWTH_STAGE_LABELS } from "./types";

/**
 * Phase 1: Context Loading — extract structured channel context from inputs.
 */
export function buildContextExtractionPrompt(
  config: CPSessionConfig,
  workspaceContext: string,
  toolInsights?: string
): string {
  const channelsText = config.current_channels
    .map(
      (c) =>
        `- ${c.channel}: status=${c.status}, assessment=${c.assessment}${
          c.monthly_spend ? `, spend=$${c.monthly_spend}` : ""
        }${c.metrics ? `, metrics: ${c.metrics}` : ""}${
          c.notes ? `, notes: ${c.notes}` : ""
        }`
    )
    .join("\n");

  const allocationText = config.budget.current_allocation
    .map((a) => `- ${a.channel}: $${a.spend}`)
    .join("\n");

  return `You are a GTM channel planning analyst. Extract and structure the channel planning context from the inputs below.

## Company Context
${workspaceContext || "No company context provided."}

## Goals
- Revenue target: ${config.goals.revenue_target}
- Timeline: ${config.goals.timeline_months} months
- Growth stage: ${GROWTH_STAGE_LABELS[config.goals.growth_stage]}
- Primary objective: ${config.goals.primary_objective}

## Budget
- Total monthly: $${config.budget.total_monthly} ${config.budget.currency}
- Current allocation:
${allocationText || "No current allocation specified."}

## Current Channels
${channelsText || "No current channels specified."}

## ICP
- Summary: ${config.icp_context.summary}
- Segments: ${config.icp_context.segments.join(", ")}
${config.icp_context.buying_behavior ? `- Buying behavior: ${config.icp_context.buying_behavior}` : ""}

${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
Extract the key facts into the structured format. Be precise and evidence-based. Identify key constraints and opportunities based on the inputs.`;
}

/**
 * Phase 2: Channel Assessment — prompt for each analyst.
 */
export function buildChannelAssessmentPrompt(
  channelContext: ChannelContext,
  focusDimensions: ChannelFocus[],
  customQuestion: string | undefined,
  workspaceContext: string,
  knowledgeBase: string,
  toolInsights?: string
): string {
  const contextText = `## Channel Planning Context
- **Stage**: ${channelContext.company_stage}
- **Revenue Target**: ${channelContext.revenue_target}
- **Timeline**: ${channelContext.timeline}
- **Budget**: $${channelContext.total_budget} ${channelContext.currency}/month
- **ICP**: ${channelContext.icp_summary}

### Current Channels
${channelContext.current_channels
  .map(
    (c) =>
      `- **${c.channel}**: ${c.status} (${c.assessment})${
        c.spend ? ` — $${c.spend}/mo` : ""
      }${c.notes ? ` — ${c.notes}` : ""}`
  )
  .join("\n")}

### Key Constraints
${channelContext.key_constraints.map((c) => `- ${c}`).join("\n")}

### Opportunities
${channelContext.opportunities.map((o) => `- ${o}`).join("\n")}`;

  const focusText = focusDimensions
    .map((f) => `- ${CHANNEL_FOCUS_LABELS[f]}`)
    .join("\n");

  return `${contextText}

## Our Company Context
${workspaceContext || "No company context provided."}

## Planning Focus
Evaluate channels through these dimensions:
${focusText}
${customQuestion ? `\n## Additional Question\n${customQuestion}` : ""}

## GTM Knowledge Base
${knowledgeBase}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

CRITICAL: Keep your ENTIRE response under 150 words. Be sharp, direct, and actionable. Use bullet points, not paragraphs. One key insight per focus dimension — no filler. The team can ask you to go deeper on specific points later.`;
}

/**
 * Phase 3: Strategy Debate prompts.
 */
export function buildDebateRound1Prompt(): string {
  return `You have now read all four analyst assessments on channel strategy. Your job is to:

1. **Challenge**: Identify the most important disagreements or blind spots in other analysts' channel recommendations. What did they miss or get wrong?
2. **Add nuance**: Where are other analysts being too simplistic about channel potential? What context are they ignoring?
3. **Prioritize**: What is the single most critical channel decision that the team MUST make?

CRITICAL: Keep your response under 100 words. Challenge ONE key point from another analyst — name them, state why they're wrong, give your counter-argument. No preamble.`;
}

export function buildDebateRound2Prompt(): string {
  return `Based on this debate, state your final revised position:

1. **Where has your view changed?** What did other analysts convince you of?
2. **Where do you still disagree?** What's your strongest remaining conviction?
3. **Your top 3 recommendations**: What channels should the team invest in, optimize, or cut RIGHT NOW?

CRITICAL: Keep your response under 80 words. State your revised position and your #1 channel recommendation for the team. No hedging, no preamble.`;
}

/**
 * Phase 4: Synthesis — prompt for generating structured deliverables.
 */
export type SynthesisOutputType =
  | "channel-scorecard"
  | "budget-allocation"
  | "channel-playbooks"
  | "timeline-roadmap"
  | "roi-projections"
  | "executive-summary";

export function buildSynthesisPrompt(
  outputType: SynthesisOutputType,
  analysisTranscript: string,
  config: CPSessionConfig,
  workspaceContext: string,
  toolInsights?: string
): string {
  const base = `You are a synthesis engine. You have access to a full channel planning analysis conducted by 4 expert analysts (Growth Hacker, Content Strategist, Demand Gen Specialist, Revenue Analyst). They have each assessed the channels and debated their findings.

## Analysis Transcript
${analysisTranscript}

## Our Company Context
${workspaceContext || "No company context provided."}

## Planning Parameters
- Revenue target: ${config.goals.revenue_target}
- Timeline: ${config.goals.timeline_months} months
- Growth stage: ${GROWTH_STAGE_LABELS[config.goals.growth_stage]}
- Monthly budget: $${config.budget.total_monthly} ${config.budget.currency}
- Current channels: ${config.current_channels.map((c) => c.channel).join(", ")}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

`;

  const channelList = config.current_channels.map((c) => c.channel).join(", ");

  switch (outputType) {
    case "channel-scorecard":
      return (
        base +
        `Generate a channel scorecard evaluating each channel discussed in the analysis.

For each channel include:
- channel_name: the channel name
- fit_score: 0-100 score based on ICP fit, budget, and stage
- cost_efficiency: brief assessment of cost efficiency
- scalability: brief assessment of scalability potential
- time_to_impact: estimated time to see results (e.g. "2-4 weeks", "3-6 months")
- current_status: current state of this channel
- recommendation: one of "invest" (increase spend), "optimize" (improve efficiency), "maintain" (keep as-is), "cut" (reduce/stop), "test" (run experiments)
- rationale: 1-2 sentence justification

Include an overall_assessment summarizing the channel landscape.

Current channels to evaluate: ${channelList}. Also include any new channels recommended by the analysts.`
      );
    case "budget-allocation":
      return (
        base +
        `Generate an optimized budget allocation plan.

Total monthly budget: $${config.budget.total_monthly} ${config.budget.currency}

For each channel include:
- channel: channel name
- recommended_spend: dollar amount
- percentage: percentage of total budget
- current_spend: current spend if known (optional)
- change_direction: "increase", "maintain", "decrease", "new" (new channel), or "cut"
- rationale: why this allocation

Include a reallocation_summary: 2-3 sentences explaining the overall budget strategy.

Ensure allocations sum to approximately the total budget. Be specific with dollar amounts.`
      );
    case "channel-playbooks":
      return (
        base +
        `Generate tactical playbooks for the top 3 most impactful channels recommended by the analysts.

Return them in a "playbooks" array. Each playbook includes:
- channel_name: the channel
- objective: what this channel should achieve
- tactics: 3-5 items, each with tactic name, description, priority (p0/p1/p2), estimated_cost, and expected_outcome
- kpis: 2-4 items with metric, target, and measurement method
- quick_wins: 2-3 things to do in the first 2 weeks
- risks: 2-3 risks to watch for

Be specific and actionable. Focus on practical execution, not theory.`
      );
    case "timeline-roadmap":
      return (
        base +
        `Generate a phased timeline roadmap for the channel strategy.

Timeline: ${config.goals.timeline_months} months total.

Include 3-4 phases, each with:
- phase_name: descriptive name (e.g. "Foundation", "Scale", "Optimize")
- duration: e.g. "Month 1-2"
- channels: which channels are active/launching in this phase
- milestones: 2-3 key milestones for this phase
- budget_allocation: budget split for this phase
- success_criteria: what success looks like at the end of this phase

Include a critical_path: 2-3 sentences about the most important dependencies and sequence.`
      );
    case "roi-projections":
      return (
        base +
        `Generate ROI projections for each recommended channel.

For each channel include:
- channel: channel name
- monthly_spend: recommended monthly spend
- expected_leads: expected leads per month
- expected_pipeline: expected pipeline value per month
- estimated_cac: estimated customer acquisition cost
- roi_assessment: brief ROI assessment
- confidence: "high", "medium", or "low"
- assumptions: 2-3 key assumptions behind this projection

Also include:
- total_expected_pipeline: sum of all channel pipeline
- blended_cac: overall blended CAC
- key_risks: 2-3 risks to the projections

Be realistic. Flag low-confidence projections explicitly.`
      );
    case "executive-summary":
      return (
        base +
        `Generate an executive summary of this channel planning analysis.

Include:
- title: a concise title for this channel plan
- channel_landscape: 2-3 sentence overview of the current channel landscape
- key_findings: 3-5 most important findings, each with a "finding" (1 sentence) and "impact" (critical/high/medium/low)
- budget_recommendation: 2-3 sentences about how to allocate the budget
- immediate_actions: 3-5 concrete actions the team should take NOW
- channels_to_watch: 2-3 channels or trends to monitor

Be concise, direct, actionable. This is for an executive audience.`
      );
  }
}
