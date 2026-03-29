import type { MessagingFocus, MLSessionConfig } from "./types";
import type { MessagingContext } from "./schemas";
import { MESSAGING_FOCUS_LABELS } from "./types";

/**
 * Phase 1: Context Loading — extract structured messaging context from all inputs.
 */
export function buildContextExtractionPrompt(
  config: MLSessionConfig,
  workspaceContext: string,
  toolInsights?: string
): string {
  const competitorsText = config.competitors
    .map(
      (c) =>
        `- **${c.name}**: ${c.tagline ? `"${c.tagline}"` : "No tagline"} | Claims: ${c.key_claims.join(", ")} | Positioning: ${c.positioning ?? "Unknown"}`
    )
    .join("\n");

  const currentText = [
    config.current_messaging.tagline ? `Tagline: "${config.current_messaging.tagline}"` : "",
    config.current_messaging.value_props.length > 0
      ? `Value Props: ${config.current_messaging.value_props.join("; ")}`
      : "",
    config.current_messaging.elevator_pitch
      ? `Elevator Pitch: ${config.current_messaging.elevator_pitch}`
      : "",
    config.current_messaging.what_to_improve
      ? `Areas to Improve: ${config.current_messaging.what_to_improve}`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  return `You are a messaging analyst. Extract structured messaging context from the inputs below.

## Product/Service
- **Name**: ${config.product.name}
- **Description**: ${config.product.description}
- **Category**: ${config.product.category}
- **Key Features**: ${config.product.key_features.join(", ")}
${config.product.pricing_model ? `- **Pricing Model**: ${config.product.pricing_model}` : ""}

## Target Audience
- **ICP Summary**: ${config.audience.icp_summary}
- **Pain Points**: ${config.audience.primary_pain_points.join(", ")}
- **Decision Criteria**: ${config.audience.decision_criteria.join(", ")}
${config.audience.buying_stage ? `- **Buying Stage**: ${config.audience.buying_stage}` : ""}

## Competitive Context
${competitorsText || "No competitors provided."}

## Current Messaging
${currentText || "No current messaging provided."}

## Company Context
${workspaceContext || "No company context provided."}

${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
Extract the key messaging context into the structured format. Be precise and identify concrete messaging opportunities.`;
}

/**
 * Phase 2: Messaging Workshop — each agent independently drafts messaging.
 */
export function buildWorkshopPrompt(
  context: MessagingContext,
  config: MLSessionConfig,
  focusDimensions: MessagingFocus[],
  customQuestion: string | undefined,
  workspaceContext: string,
  knowledgeBase: string,
  toolInsights?: string
): string {
  const focusText = focusDimensions
    .map((f) => `- ${MESSAGING_FOCUS_LABELS[f]}`)
    .join("\n");

  const competitorsText = config.competitors
    .map(
      (c) =>
        `- **${c.name}**: ${c.tagline ? `"${c.tagline}"` : "No tagline"} | Claims: ${c.key_claims.join(", ")}`
    )
    .join("\n");

  return `## Messaging Context
- **Product**: ${config.product.name} — ${config.product.description}
- **Category**: ${config.product.category}
- **Key Features**: ${config.product.key_features.join(", ")}
- **Target Audience**: ${context.primary_audience}
- **Key Pain Points**: ${context.key_pain_points.join(", ")}
- **Current Assessment**: ${context.current_messaging_assessment}
- **Opportunities**: ${context.messaging_opportunities.join("; ")}

## Competitive Landscape
${competitorsText || "No competitors provided."}
${context.competitive_landscape}

## Current Messaging
${config.current_messaging.tagline ? `Tagline: "${config.current_messaging.tagline}"` : "No tagline"}
${config.current_messaging.value_props.length > 0 ? `Value Props: ${config.current_messaging.value_props.join("; ")}` : ""}
${config.current_messaging.what_to_improve ? `To Improve: ${config.current_messaging.what_to_improve}` : ""}

## Company Context
${workspaceContext || "No company context provided."}

## Focus Dimensions
${focusText}
${customQuestion ? `\n## Additional Question\n${customQuestion}` : ""}

## GTM Knowledge Base
${knowledgeBase}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

CRITICAL INSTRUCTIONS:
1. Draft CONCRETE messaging from your perspective — tagline ideas, value prop drafts, headline options, talk track snippets.
2. Be creative and specific. Do NOT just analyze — PRODUCE draft messaging.
3. Keep your ENTIRE response under 200 words. Use bullet points. Lead with your best draft messaging, then brief rationale.
4. Focus on the dimensions listed above.`;
}

/**
 * Phase 3: Critique & Debate prompts.
 */
export function buildCritiqueRound1Prompt(): string {
  return `You have now read all four agents' messaging drafts. Your job is to:

1. **Critique**: Pick the strongest and weakest messaging from other agents. What works? What falls flat? Be specific — quote the exact copy you're critiquing.
2. **Strengthen**: Take one other agent's draft and make it better. Show the improved version.
3. **Your top pick**: What is the single best piece of messaging from this round that should make it into the final deliverables?

CRITICAL: Keep your response under 120 words. Quote specific copy, critique it, improve it. No preamble.`;
}

export function buildCritiqueRound2Prompt(): string {
  return `Based on this critique round, produce your final revised messaging:

1. **Revised drafts**: Your best messaging after incorporating feedback. Include at least one tagline, one value prop headline, and one talk track opening.
2. **What changed**: Where did other agents improve your thinking?
3. **Your #1 recommendation**: The single most important messaging change the team should make.

CRITICAL: Keep your response under 100 words. Lead with your best revised copy. No hedging, no preamble.`;
}

/**
 * Phase 4: Synthesis — prompt for generating structured deliverables.
 */
export type SynthesisOutputType =
  | "messaging-framework"
  | "value-propositions"
  | "tagline-options"
  | "objection-responses"
  | "elevator-pitch"
  | "executive-summary";

export function buildSynthesisPrompt(
  outputType: SynthesisOutputType,
  workshopTranscript: string,
  config: MLSessionConfig,
  workspaceContext: string,
  toolInsights?: string
): string {
  const base = `You are a synthesis engine. You have access to a full messaging workshop conducted by 4 expert agents (Brand Strategist, Conversion Copywriter, Buyer Persona, Sales Enablement). They have each drafted messaging, critiqued each other's work, and refined their proposals.

## Workshop Transcript
${workshopTranscript}

## Product Context
- **Product**: ${config.product.name} — ${config.product.description}
- **Category**: ${config.product.category}
- **Key Features**: ${config.product.key_features.join(", ")}
${config.product.pricing_model ? `- **Pricing Model**: ${config.product.pricing_model}` : ""}

## Target Audience
- **ICP**: ${config.audience.icp_summary}
- **Pain Points**: ${config.audience.primary_pain_points.join(", ")}
- **Decision Criteria**: ${config.audience.decision_criteria.join(", ")}

## Competitive Context
${config.competitors.map((c) => `- ${c.name}: ${c.tagline ?? ""} | ${c.key_claims.join(", ")}`).join("\n")}

## Company Context
${workspaceContext || "No company context provided."}
${toolInsights ? `\n## Prior Analysis Insights\n${toolInsights}\n` : ""}
---

`;

  switch (outputType) {
    case "messaging-framework":
      return (
        base +
        `Generate a complete messaging framework.

Include:
- positioning_statement: A clear, compelling positioning statement (1-2 sentences)
- category: The market category this product owns or creates
- pillars: 3-4 messaging pillars, each with pillar name, description, proof_points array, and key_message
- brand_voice: tone description, do_list (3-5 items), dont_list (3-5 items)
- competitive_narrative: 2-3 sentences on how to position against competitors

Synthesize the best ideas from all four agents. Be specific and actionable.`
      );
    case "value-propositions":
      return (
        base +
        `Generate value propositions.

Return a "propositions" array with 4-6 value propositions. Each must include:
- headline: clear, benefit-driven headline (under 10 words)
- subheadline: supporting statement that adds specificity
- supporting_copy: 1-2 sentences of supporting evidence
- target_persona: which buyer persona this resonates with most
- proof_points: 2-3 evidence points
- strength: "primary", "secondary", or "tertiary"
- rationale: why this messaging works

Rank them by strength. Primary = must-use, Secondary = strong alternative, Tertiary = niche/situational.`
      );
    case "tagline-options":
      return (
        base +
        `Generate tagline options organized by creative direction.

Return:
- directions: 3-4 creative directions, each with:
  - direction_name: name of this creative direction (e.g. "Authority", "Challenger", "Empathy")
  - taglines: 3-4 tagline options, each with tagline text and rationale
  - tone: the overall tone of this direction
  - best_for: when to use this direction (e.g. "homepage hero", "sales deck opening", "ad campaigns")
- recommendation: 2-3 sentences recommending which direction and specific tagline to lead with, and why

Be bold. Push beyond safe/generic. Every tagline must pass the "would I actually use this?" test.`
      );
    case "objection-responses":
      return (
        base +
        `Generate objection response playbook.

Return an "objections" array with 5-8 objections. Each must include:
- objection: exact words a prospect might say
- frequency: "very_common", "common", or "occasional"
- short_response: 1-2 sentence response for quick handling
- detailed_response: full response with context and evidence (2-3 sentences)
- proof_points: 2-3 pieces of evidence to cite
- follow_up_question: question to pivot the conversation

Focus on real objections that come up in sales conversations for this type of product.`
      );
    case "elevator-pitch":
      return (
        base +
        `Generate elevator pitches at three lengths.

Include:
- pitch_30s: 30-second pitch (2-3 sentences, hook + core value)
- pitch_60s: 60-second pitch (adds differentiation + proof point)
- pitch_2min: 2-minute pitch (full narrative: problem, solution, differentiation, proof, call to action)
- key_hook: the single most compelling opening line
- conversation_starters: 3-5 natural ways to start a conversation about this product (not pitches — genuine conversation openers)

Each pitch should flow naturally in spoken conversation. Avoid jargon. Be specific about outcomes.`
      );
    case "executive-summary":
      return (
        base +
        `Generate an executive summary of this messaging workshop.

Include:
- title: a concise title for this messaging analysis
- messaging_assessment: 2-3 sentence assessment of the current messaging state
- key_findings: 3-5 most important findings, each with "finding" (1 sentence) and "impact" (critical/high/medium/low)
- positioning_recommendation: 2-3 sentences on recommended positioning direction
- immediate_actions: 3-5 concrete actions the team should take NOW
- messaging_gaps: 2-4 gaps in the current messaging that need to be addressed

Be concise, direct, actionable. This is for a leadership audience.`
      );
  }
}
