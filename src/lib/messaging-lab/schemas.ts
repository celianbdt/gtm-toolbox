import { z } from "zod";

// ── Phase 1: Messaging Context (extracted from inputs) ──

export const MessagingContextSchema = z.object({
  product_summary: z.string(),
  primary_audience: z.string(),
  key_pain_points: z.array(z.string()),
  competitive_landscape: z.string(),
  current_messaging_assessment: z.string(),
  messaging_opportunities: z.array(z.string()),
});

export type MessagingContext = z.infer<typeof MessagingContextSchema>;

// ── Phase 4: Messaging Framework ──
// NOTE: No .max() on arrays — Zod + generateObject breaks with array max constraints.

export const MessagingFrameworkSchema = z.object({
  positioning_statement: z.string(),
  category: z.string(),
  pillars: z.array(
    z.object({
      pillar: z.string(),
      description: z.string(),
      proof_points: z.array(z.string()),
      key_message: z.string(),
    })
  ),
  brand_voice: z.object({
    tone: z.string(),
    do_list: z.array(z.string()),
    dont_list: z.array(z.string()),
  }),
  competitive_narrative: z.string(),
});

export type MessagingFramework = z.infer<typeof MessagingFrameworkSchema>;

// ── Phase 4: Value Propositions ──

export const ValuePropositionsSchema = z.object({
  propositions: z.array(
    z.object({
      headline: z.string(),
      subheadline: z.string(),
      supporting_copy: z.string(),
      target_persona: z.string(),
      proof_points: z.array(z.string()),
      strength: z.enum(["primary", "secondary", "tertiary"]),
      rationale: z.string(),
    })
  ),
});

export type ValuePropositions = z.infer<typeof ValuePropositionsSchema>;

// ── Phase 4: Tagline Options ──

export const TaglineOptionsSchema = z.object({
  directions: z.array(
    z.object({
      direction_name: z.string(),
      taglines: z.array(
        z.object({
          tagline: z.string(),
          rationale: z.string(),
        })
      ),
      tone: z.string(),
      best_for: z.string(),
    })
  ),
  recommendation: z.string(),
});

export type TaglineOptions = z.infer<typeof TaglineOptionsSchema>;

// ── Phase 4: Objection Responses ──

export const ObjectionResponsesSchema = z.object({
  objections: z.array(
    z.object({
      objection: z.string(),
      frequency: z.enum(["very_common", "common", "occasional"]),
      short_response: z.string(),
      detailed_response: z.string(),
      proof_points: z.array(z.string()),
      follow_up_question: z.string(),
    })
  ),
});

export type ObjectionResponses = z.infer<typeof ObjectionResponsesSchema>;

// ── Phase 4: Elevator Pitch ──

export const ElevatorPitchSchema = z.object({
  pitch_30s: z.string(),
  pitch_60s: z.string(),
  pitch_2min: z.string(),
  key_hook: z.string(),
  conversation_starters: z.array(z.string()),
});

export type ElevatorPitch = z.infer<typeof ElevatorPitchSchema>;

// ── Phase 4: Executive Summary ──

export const MLExecutiveSummarySchema = z.object({
  title: z.string(),
  messaging_assessment: z.string(),
  key_findings: z.array(
    z.object({
      finding: z.string(),
      impact: z.enum(["critical", "high", "medium", "low"]),
    })
  ),
  positioning_recommendation: z.string(),
  immediate_actions: z.array(z.string()),
  messaging_gaps: z.array(z.string()),
});

export type MLExecutiveSummary = z.infer<typeof MLExecutiveSummarySchema>;
