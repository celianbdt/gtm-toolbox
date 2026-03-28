import type { AnalysisFocus, CompetitorEntry } from "./types";
import type { IntelBrief } from "./schemas";
import { ANALYSIS_FOCUS_LABELS } from "./types";

/**
 * Phase 1: Data Processing — extract structured intel from raw competitor data.
 */
export function buildIntelExtractionPrompt(
  competitor: CompetitorEntry,
  workspaceContext: string,
  toolInsights?: string
): string {
  const sources = competitor.data_sources
    .map((s) => `### ${s.title} (${s.type})\n${s.content}`)
    .join("\n\n");

  return `You are a competitive intelligence analyst. Extract structured intelligence about "${competitor.name}" from the raw data below.

## Our Company Context
${workspaceContext || "No company context provided."}

## Raw Data About ${competitor.name}
${competitor.website ? `Website: ${competitor.website}` : ""}

${sources}

${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
Extract the key facts into the structured format. Be precise and evidence-based. If information is not available, leave optional fields empty. For weaknesses_signals, identify any signals of weakness (slow releases, negative reviews, customer complaints, tech debt signals, etc.).`;
}

/**
 * Phase 2: Individual Analyst Assessment — prompt for each analyst.
 */
export function buildAnalystAssessmentPrompt(
  intelBriefs: { competitor: string; brief: IntelBrief }[],
  focusDimensions: AnalysisFocus[],
  customQuestion: string | undefined,
  workspaceContext: string,
  knowledgeBase: string,
  toolInsights?: string
): string {
  const briefsText = intelBriefs
    .map(
      (b) => `## ${b.competitor}
- **Positioning**: ${b.brief.positioning_statement}
- **Target Market**: ${b.brief.target_market}
- **Key Features**: ${b.brief.key_features.map((f) => f.name).join(", ")}
- **Differentiators**: ${b.brief.key_differentiators.join(", ")}
- **Pricing**: ${b.brief.pricing_model ?? "Unknown"}
- **Weakness Signals**: ${b.brief.weaknesses_signals.join(", ")}
- **Recent Moves**: ${b.brief.recent_moves.join(", ")}`
    )
    .join("\n\n");

  const focusText = focusDimensions
    .map((f) => `- ${ANALYSIS_FOCUS_LABELS[f]}`)
    .join("\n");

  return `## Competitive Intelligence Briefs
${briefsText}

## Our Company Context
${workspaceContext || "No company context provided."}

## Analysis Focus
Analyze these specific dimensions:
${focusText}
${customQuestion ? `\n## Additional Question\n${customQuestion}` : ""}

## GTM Knowledge Base
${knowledgeBase}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

CRITICAL: Keep your ENTIRE response under 150 words. Be sharp, direct, and actionable. Use bullet points, not paragraphs. One key insight per focus dimension — no filler. The team can ask you to go deeper on specific points later.`;
}

/**
 * Phase 3: Cross-Analyst Debate prompts.
 */
export function buildDebateRound1Prompt(): string {
  return `You have now read all four analyst assessments. Your job is to:

1. **Challenge**: Identify the most important disagreements or blind spots in other analysts' assessments. What did they miss or get wrong?
2. **Add nuance**: Where are other analysts being too simplistic? What context are they ignoring?
3. **Prioritize**: What is the single most critical competitive insight that the team MUST act on?

CRITICAL: Keep your response under 100 words. Challenge ONE key point from another analyst — name them, state why they're wrong, give your counter-argument. No preamble.`;
}

export function buildDebateRound2Prompt(): string {
  return `Based on this debate, state your final revised position:

1. **Where has your view changed?** What did other analysts convince you of?
2. **Where do you still disagree?** What's your strongest remaining conviction?
3. **Your top 3 recommendations**: What should the team do RIGHT NOW based on this competitive analysis?

CRITICAL: Keep your response under 80 words. State your revised position and your #1 recommendation for the team. No hedging, no preamble.`;
}

/**
 * Phase 4: Synthesis — prompt for generating structured deliverables.
 */
export type SynthesisOutputType = "battle-cards" | "positioning-matrix" | "objection-playbook" | "threat-assessment" | "executive-summary";

export function buildSynthesisPrompt(
  outputType: SynthesisOutputType,
  analysisTranscript: string,
  competitorNames: string[],
  workspaceContext: string,
  toolInsights?: string
): string {
  const base = `You are a synthesis engine. You have access to a full competitive intelligence analysis conducted by 4 expert analysts (Market Analyst, Product Strategist, Sales Tactician, Customer Voice). They have each assessed the competitors and debated their findings.

## Analysis Transcript
${analysisTranscript}

## Our Company Context
${workspaceContext || "No company context provided."}

## Competitors Analyzed
${competitorNames.join(", ")}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

`;

  switch (outputType) {
    case "battle-cards":
      return (
        base +
        `Generate exactly one battle card per competitor: ${competitorNames.join(", ")}.

Return them in a "cards" array. Each card must include:
- competitor_name: the competitor's name
- one_liner: what they do in one sentence
- target_overlap: "high", "medium", or "low"
- threat_level: "critical", "high", "medium", or "low"
- strengths: 3-5 items, each with "point" and "evidence"
- weaknesses: 3-5 items, each with "point" and "how_to_exploit"
- landmines: 2-4 questions to ask prospects that expose competitor weakness
- traps_to_avoid: 2-3 things the competitor will say about us
- winning_talk_track: 2-3 paragraph narrative for sales reps
- key_differentiators: 2-4 items with "our_advantage", "their_claim", "reality"
- pricing_intel: optional, only if you have concrete pricing data (their_model, vs_ours, negotiation_tips)

Be practical and sales-ready.`
      );
    case "positioning-matrix":
      return (
        base +
        `Generate a 2D positioning matrix.

Rules:
- Pick the 2 most strategically relevant axes for this market
- Each axis has: label, low_label, high_label
- Include ALL competitors (${competitorNames.join(", ")}) AND our company as players
- Mark exactly one player with is_us: true (our company)
- x and y are numbers between 0 and 100 representing position on each axis
- Each player has a short annotation explaining their position
- Include an "insight" paragraph (2-3 sentences) about positioning dynamics and white space`
      );
    case "objection-playbook":
      return (
        base +
        `Generate an objection handling playbook for EACH competitor: ${competitorNames.join(", ")}.

Return them in a "playbooks" array. Each playbook includes:
- competitor_name
- objections: 3-5 items, each with:
  - objection: exact words a prospect might say
  - frequency: "very_common", "common", or "occasional"
  - response_strategy: how to handle it
  - proof_points: 1-3 pieces of evidence to cite
  - follow_up_question: question to pivot the conversation

Focus on real objections reps encounter in deals.`
      );
    case "threat-assessment":
      return (
        base +
        `Generate a threat and opportunity assessment.

Include:
- threats: 3-6 items with competitor, threat description, severity (critical/high/medium/low), timeframe (immediate/near_term/long_term), and recommended_action
- opportunities: 2-4 items with description, competitors_affected array, action to take, and effort (low/medium/high)
- overall_competitive_position: 2-3 sentence honest summary

Be direct about where we are strong and where we are vulnerable.`
      );
    case "executive-summary":
      return (
        base +
        `Generate a one-page executive summary of this competitive analysis.

Include:
- title: a concise title for this analysis
- competitive_landscape: 2-3 sentence overview of the competitive landscape
- key_findings: 3-5 most important findings, each with a "finding" (1 sentence) and "impact" (critical/high/medium/low)
- our_position: 2-3 sentences about where we stand vs competitors
- immediate_actions: 3-5 concrete actions the team should take NOW
- watch_list: 2-3 things to monitor over the next quarter

Be concise, direct, actionable. This is for an executive audience.`
      );
  }
}
