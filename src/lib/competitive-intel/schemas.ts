import { z } from "zod";

// ── Phase 1: Intel Brief (per competitor) ──

export const IntelBriefSchema = z.object({
  company_name: z.string(),
  positioning_statement: z.string(),
  target_market: z.string(),
  key_features: z.array(
    z.object({ name: z.string(), description: z.string() })
  ),
  pricing_model: z.string().optional(),
  key_differentiators: z.array(z.string()),
  weaknesses_signals: z.array(z.string()),
  recent_moves: z.array(z.string()),
});

export type IntelBrief = z.infer<typeof IntelBriefSchema>;

// ── Phase 4: Battle Card ──
// NOTE: No .max() on arrays — Zod 4 + generateObject breaks with array max constraints.
// Length is controlled via prompt instructions instead.

export const BattleCardSchema = z.object({
  competitor_name: z.string(),
  one_liner: z.string(),
  target_overlap: z.enum(["high", "medium", "low"]),
  threat_level: z.enum(["critical", "high", "medium", "low"]),
  strengths: z.array(z.object({ point: z.string(), evidence: z.string() })),
  weaknesses: z.array(z.object({ point: z.string(), how_to_exploit: z.string() })),
  landmines: z.array(z.string()),
  traps_to_avoid: z.array(z.string()),
  winning_talk_track: z.string(),
  key_differentiators: z.array(
    z.object({
      our_advantage: z.string(),
      their_claim: z.string(),
      reality: z.string(),
    })
  ),
  pricing_intel: z
    .object({
      their_model: z.string(),
      vs_ours: z.string(),
      negotiation_tips: z.array(z.string()),
    })
    .optional(),
});

export type BattleCard = z.infer<typeof BattleCardSchema>;

// ── Phase 4: Positioning Matrix ──
// NOTE: No .min()/.max() on number fields — controlled via prompt.

export const PositioningMatrixSchema = z.object({
  axes: z.object({
    x: z.object({
      label: z.string(),
      low_label: z.string(),
      high_label: z.string(),
    }),
    y: z.object({
      label: z.string(),
      low_label: z.string(),
      high_label: z.string(),
    }),
  }),
  players: z.array(
    z.object({
      name: z.string(),
      x: z.number(),
      y: z.number(),
      is_us: z.boolean(),
      annotation: z.string(),
    })
  ),
  insight: z.string(),
});

export type PositioningMatrix = z.infer<typeof PositioningMatrixSchema>;

// ── Phase 4: Objection Playbook ──

export const ObjectionPlaybookSchema = z.object({
  competitor_name: z.string(),
  objections: z.array(
    z.object({
      objection: z.string(),
      frequency: z.enum(["very_common", "common", "occasional"]),
      response_strategy: z.string(),
      proof_points: z.array(z.string()),
      follow_up_question: z.string(),
    })
  ),
});

export type ObjectionPlaybook = z.infer<typeof ObjectionPlaybookSchema>;

// ── Phase 4: Threat Assessment ──

export const ThreatAssessmentSchema = z.object({
  threats: z.array(
    z.object({
      competitor: z.string(),
      threat: z.string(),
      severity: z.enum(["critical", "high", "medium", "low"]),
      timeframe: z.enum(["immediate", "near_term", "long_term"]),
      recommended_action: z.string(),
    })
  ),
  opportunities: z.array(
    z.object({
      description: z.string(),
      competitors_affected: z.array(z.string()),
      action: z.string(),
      effort: z.enum(["low", "medium", "high"]),
    })
  ),
  overall_competitive_position: z.string(),
});

export type ThreatAssessment = z.infer<typeof ThreatAssessmentSchema>;

// ── Executive Summary (1-page) ──

export const ExecutiveSummarySchema = z.object({
  title: z.string(),
  competitive_landscape: z.string(),
  key_findings: z.array(z.object({
    finding: z.string(),
    impact: z.enum(["critical", "high", "medium", "low"]),
  })),
  our_position: z.string(),
  immediate_actions: z.array(z.string()),
  watch_list: z.array(z.string()),
});

export type ExecutiveSummary = z.infer<typeof ExecutiveSummarySchema>;
