import type { AuditFocus, CustomerDataSource, WinLossEntry, ICPSegment, ICPPersona } from "./types";
import type { CustomerDataExtract } from "./schemas";
import { AUDIT_FOCUS_LABELS } from "./types";

/**
 * Phase 1: Data Processing — extract structured data from customer/win-loss inputs.
 */
export function buildDataExtractionPrompt(
  source: CustomerDataSource,
  icpDefinition: string,
  segments: ICPSegment[],
  workspaceContext: string,
  toolInsights?: string
): string {
  const segmentsList = segments
    .map((s) => `- ${s.name}: ${s.description}${s.industry ? ` (${s.industry})` : ""}${s.company_size ? `, ${s.company_size}` : ""}`)
    .join("\n");

  return `You are an ICP data analyst. Extract structured insights from the customer data source below.

## Current ICP Definition
${icpDefinition}

## Defined Segments
${segmentsList || "No segments defined yet."}

## Our Company Context
${workspaceContext || "No company context provided."}

## Data Source: ${source.title} (${source.type})
${source.content}

${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}

Extract key patterns: segment distribution, metrics, signals. Map data to existing segments where possible. Be precise and evidence-based.`;
}

/**
 * Phase 1: Win/Loss data extraction prompt.
 */
export function buildWinLossExtractionPrompt(
  winLossData: WinLossEntry[],
  segments: ICPSegment[],
  workspaceContext: string
): string {
  const entries = winLossData
    .map((e, i) => `${i + 1}. [${e.type.toUpperCase()}] ${e.account_name ? `${e.account_name} — ` : ""}${e.reason}${e.segment ? ` (Segment: ${e.segment})` : ""}${e.deal_size ? ` | $${e.deal_size}` : ""}${e.notes ? ` | Notes: ${e.notes}` : ""}`)
    .join("\n");

  const segmentsList = segments
    .map((s) => `- ${s.name}: ${s.description}`)
    .join("\n");

  return `You are a win/loss analyst. Analyze the win/loss data and extract patterns.

## Defined Segments
${segmentsList || "No segments defined."}

## Company Context
${workspaceContext || "No context."}

## Win/Loss Data (${winLossData.length} entries)
${entries}

Extract patterns by segment, identify common win/loss reasons, and flag any signals.`;
}

/**
 * Phase 2: Individual Analyst Assessment.
 */
export function buildAnalystAssessmentPrompt(
  dataExtracts: { source: string; extract: CustomerDataExtract }[],
  icpDefinition: string,
  segments: ICPSegment[],
  personas: ICPPersona[],
  focusDimensions: AuditFocus[],
  customQuestion: string | undefined,
  workspaceContext: string,
  knowledgeBase: string,
  toolInsights?: string
): string {
  const extractsText = dataExtracts
    .map((d) => `## Data: ${d.source}
- Segments detected: ${d.extract.segments_detected.map((s) => s.name).join(", ")}
- Top industries: ${d.extract.key_metrics.top_industries.join(", ")}
- Top company sizes: ${d.extract.key_metrics.top_company_sizes.join(", ")}
- Signals: ${d.extract.signals.join("; ")}`)
    .join("\n\n");

  const segmentsList = segments
    .map((s) => `- **${s.name}**: ${s.description}${s.industry ? ` | Industry: ${s.industry}` : ""}${s.company_size ? ` | Size: ${s.company_size}` : ""}${s.revenue_range ? ` | Revenue: ${s.revenue_range}` : ""}`)
    .join("\n");

  const personasList = personas
    .map((p) => `- **${p.title}** (${p.role}): Pain points: ${p.pain_points.join(", ")}. Goals: ${p.goals.join(", ")}.`)
    .join("\n");

  const focusText = focusDimensions
    .map((f) => `- ${AUDIT_FOCUS_LABELS[f]}`)
    .join("\n");

  return `## Current ICP Definition
${icpDefinition}

## Defined Segments
${segmentsList}

## Defined Personas
${personasList}

## Extracted Customer Data
${extractsText}

## Our Company Context
${workspaceContext || "No company context provided."}

## Audit Focus
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
  return `You have now read all four analyst assessments of this ICP. Your job is to:

1. **Challenge**: Identify the most important disagreements or blind spots in other analysts' assessments. What did they miss or get wrong about the ICP?
2. **Add nuance**: Where are other analysts being too simplistic about segment fit or persona accuracy?
3. **Prioritize**: What is the single most critical ICP insight that the team MUST act on?

CRITICAL: Keep your response under 100 words. Challenge ONE key point from another analyst — name them, state why they're wrong, give your counter-argument. No preamble.`;
}

export function buildDebateRound2Prompt(): string {
  return `Based on this debate, state your final revised position:

1. **Where has your view changed?** What did other analysts convince you of regarding the ICP?
2. **Where do you still disagree?** What's your strongest remaining conviction?
3. **Your top 3 recommendations**: What should the team do RIGHT NOW to improve their ICP?

CRITICAL: Keep your response under 80 words. State your revised position and your #1 recommendation for the team. No hedging, no preamble.`;
}

/**
 * Phase 4: Synthesis prompts.
 */
export type SynthesisOutputType =
  | "icp-scorecard"
  | "segment-analysis"
  | "persona-cards"
  | "tam-sam-analysis"
  | "prioritization-matrix"
  | "executive-summary";

export function buildSynthesisPrompt(
  outputType: SynthesisOutputType,
  analysisTranscript: string,
  icpDefinition: string,
  segments: ICPSegment[],
  personas: ICPPersona[],
  workspaceContext: string,
  toolInsights?: string
): string {
  const segmentNames = segments.map((s) => s.name);
  const personaTitles = personas.map((p) => p.title);

  const base = `You are a synthesis engine. You have access to a full ICP audit conducted by 4 expert analysts (Market Researcher, Customer Success Analyst, Sales Intelligence, PMF Analyst). They have each assessed the ICP and debated their findings.

## Analysis Transcript
${analysisTranscript}

## Current ICP Definition
${icpDefinition}

## Segments: ${segmentNames.join(", ")}
## Personas: ${personaTitles.join(", ")}

## Our Company Context
${workspaceContext || "No company context provided."}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

`;

  switch (outputType) {
    case "icp-scorecard":
      return (
        base +
        `Generate an ICP Scorecard.

Include:
- overall_score: 0-100 rating of current ICP health
- dimensions: score each audit dimension (segment fit, persona accuracy, TAM/SAM alignment, win/loss patterns, expansion signals, churn risk) with a score (0-100) and brief assessment
- top_strengths: 3-5 things the ICP gets right
- critical_gaps: 3-5 areas where the ICP needs improvement
- overall_assessment: 2-3 sentence summary of ICP health

Be honest and data-driven. A score of 70+ means the ICP is well-defined.`
      );
    case "segment-analysis":
      return (
        base +
        `Generate a segment analysis for EACH segment: ${segmentNames.join(", ")}.

Return them in a "segments" array. Each segment must include:
- segment_name: the segment name
- fit_score: 0-100 rating of how well this segment fits
- current_performance: object with optional win_rate, avg_deal_size, retention_rate, nrr
- strengths: 2-4 reasons this segment works
- weaknesses: 2-4 reasons this segment is challenging
- recommendation: one of "double-down", "optimize", "deprioritize", "exit"
- rationale: 1-2 sentences explaining the recommendation

Be direct about which segments to invest in and which to deprioritize.`
      );
    case "persona-cards":
      return (
        base +
        `Generate a refined persona card for EACH persona: ${personaTitles.join(", ")}.

Return them in a "personas" array. Each persona must include:
- persona_title: the persona title
- role: their role
- refined_pain_points: 3-5 data-backed pain points (refined from the original based on analysis)
- buying_triggers: 2-4 events or signals that trigger a buying conversation
- objections: 2-4 common objections from this persona
- messaging_angle: best messaging approach for this persona
- confidence: 0-100 confidence in this persona's accuracy
- refinement_notes: what changed from the original persona definition and why

Ground persona refinements in actual customer data and analyst insights.`
      );
    case "tam-sam-analysis":
      return (
        base +
        `Generate a TAM/SAM/SOM analysis.

Include:
- tam_estimate: total addressable market estimate with currency
- sam_estimate: serviceable addressable market estimate
- som_estimate: serviceable obtainable market estimate
- methodology: 1-2 sentences on how you estimated
- segments: for each segment, include name, tam_share, sam_share, optional growth_rate, and notes
- key_assumptions: 3-5 assumptions underlying the estimates

Be transparent about your methodology and assumptions. Use ranges if precise data is unavailable.`
      );
    case "prioritization-matrix":
      return (
        base +
        `Generate a segment prioritization matrix.

Include:
- axes: pick the 2 most strategically relevant axes for prioritizing ICP segments. Each axis has label, low_label, high_label. Good axes: "Fit Score" vs "Market Size", "Win Rate" vs "Revenue Potential", etc.
- segments: for each segment (${segmentNames.join(", ")}), include name, x (0-100), y (0-100), priority (high/medium/low), and annotation
- recommendation: 2-3 sentence strategic recommendation based on the matrix

Position segments honestly based on the analysis data.`
      );
    case "executive-summary":
      return (
        base +
        `Generate an executive summary of this ICP audit.

Include:
- title: a concise title for this audit
- icp_health: overall health rating ("strong", "moderate", "weak", "critical")
- key_findings: 3-5 most important findings, each with "finding" (1 sentence) and "impact" (critical/high/medium/low)
- top_segments: names of the top-performing segments to invest in
- segments_to_deprioritize: names of segments to scale back or exit
- immediate_actions: 3-5 concrete actions the team should take NOW
- long_term_recommendations: 2-4 strategic recommendations for the next quarter

Be concise, direct, actionable. This is for an executive audience.`
      );
  }
}
