import { z } from "zod";

// ── Phase 1: Structured Data Extract (per customer data source) ──

export const CustomerDataExtractSchema = z.object({
  source_title: z.string(),
  total_customers: z.number().optional(),
  segments_detected: z.array(z.object({
    name: z.string(),
    count: z.number().optional(),
    avg_deal_size: z.string().optional(),
    notable_patterns: z.array(z.string()),
  })),
  key_metrics: z.object({
    avg_revenue: z.string().optional(),
    avg_deal_size: z.string().optional(),
    top_industries: z.array(z.string()),
    top_company_sizes: z.array(z.string()),
  }),
  signals: z.array(z.string()),
});

export type CustomerDataExtract = z.infer<typeof CustomerDataExtractSchema>;

// ── Phase 4: ICP Scorecard ──
// NOTE: No .max() on arrays — Zod + generateObject breaks with array max constraints.

export const ICPScorecardSchema = z.object({
  overall_score: z.number(),
  dimensions: z.array(z.object({
    name: z.string(),
    score: z.number(),
    assessment: z.string(),
  })),
  top_strengths: z.array(z.string()),
  critical_gaps: z.array(z.string()),
  overall_assessment: z.string(),
});

export type ICPScorecard = z.infer<typeof ICPScorecardSchema>;

// ── Phase 4: Segment Analysis ──

export const SegmentAnalysisSchema = z.object({
  segment_name: z.string(),
  fit_score: z.number(),
  current_performance: z.object({
    win_rate: z.string().optional(),
    avg_deal_size: z.string().optional(),
    retention_rate: z.string().optional(),
    nrr: z.string().optional(),
  }),
  strengths: z.array(z.string()),
  weaknesses: z.array(z.string()),
  recommendation: z.enum(["double-down", "optimize", "deprioritize", "exit"]),
  rationale: z.string(),
});

export type SegmentAnalysis = z.infer<typeof SegmentAnalysisSchema>;

// ── Phase 4: Persona Card ──

export const PersonaCardSchema = z.object({
  persona_title: z.string(),
  role: z.string(),
  refined_pain_points: z.array(z.string()),
  buying_triggers: z.array(z.string()),
  objections: z.array(z.string()),
  messaging_angle: z.string(),
  confidence: z.number(),
  refinement_notes: z.string(),
});

export type PersonaCard = z.infer<typeof PersonaCardSchema>;

// ── Phase 4: TAM/SAM Analysis ──

export const TAMSAMAnalysisSchema = z.object({
  tam_estimate: z.string(),
  sam_estimate: z.string(),
  som_estimate: z.string(),
  methodology: z.string(),
  segments: z.array(z.object({
    name: z.string(),
    tam_share: z.string(),
    sam_share: z.string(),
    growth_rate: z.string().optional(),
    notes: z.string(),
  })),
  key_assumptions: z.array(z.string()),
});

export type TAMSAMAnalysis = z.infer<typeof TAMSAMAnalysisSchema>;

// ── Phase 4: Prioritization Matrix ──

export const PrioritizationMatrixSchema = z.object({
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
  segments: z.array(z.object({
    name: z.string(),
    x: z.number(),
    y: z.number(),
    priority: z.enum(["high", "medium", "low"]),
    annotation: z.string(),
  })),
  recommendation: z.string(),
});

export type PrioritizationMatrix = z.infer<typeof PrioritizationMatrixSchema>;

// ── Phase 4: Executive Summary ──

export const ICAExecutiveSummarySchema = z.object({
  title: z.string(),
  icp_health: z.enum(["strong", "moderate", "weak", "critical"]),
  key_findings: z.array(z.object({
    finding: z.string(),
    impact: z.enum(["critical", "high", "medium", "low"]),
  })),
  top_segments: z.array(z.string()),
  segments_to_deprioritize: z.array(z.string()),
  immediate_actions: z.array(z.string()),
  long_term_recommendations: z.array(z.string()),
});

export type ICAExecutiveSummary = z.infer<typeof ICAExecutiveSummarySchema>;
