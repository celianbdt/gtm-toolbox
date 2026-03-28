import { z } from "zod";

// ── Mode 1: Campaign KPI Summary ──

export const CampaignKPISummarySchema = z.object({
  total_campaigns_analyzed: z.number(),
  overall_metrics: z.object({
    avg_open_rate: z.number(),
    avg_reply_rate: z.number(),
    avg_meetings_rate: z.number(),
    total_sent: z.number(),
  }),
  top_performing_campaign: z.object({
    name: z.string(),
    why: z.string(),
  }),
  worst_performing_campaign: z.object({
    name: z.string(),
    why: z.string(),
  }),
});

export type CampaignKPISummary = z.infer<typeof CampaignKPISummarySchema>;

// ── Mode 1: Strategic Playbook ──

export const StrategicPlaybookSchema = z.object({
  executive_summary: z.string(),
  segments: z.array(
    z.object({
      name: z.string(),
      performance_rating: z.enum(["strong", "moderate", "weak"]),
      key_metrics: z.object({
        avg_open_rate: z.number().optional(),
        avg_reply_rate: z.number().optional(),
        avg_conversion_rate: z.number().optional(),
      }),
      insights: z.array(z.string()),
      recommendations: z.array(z.string()),
    })
  ),
  channel_analysis: z.array(
    z.object({
      channel: z.string(),
      effectiveness: z.enum(["high", "medium", "low"]),
      best_use_case: z.string(),
      optimization_tips: z.array(z.string()),
    })
  ),
  cadence_insights: z.object({
    optimal_touchpoints: z.string(),
    best_days: z.array(z.string()),
    best_times: z.array(z.string()),
    spacing_recommendation: z.string(),
  }),
  kpi_benchmarks: z.array(
    z.object({
      metric: z.string(),
      current_value: z.string(),
      benchmark: z.string(),
      gap_assessment: z.string(),
    })
  ),
  lessons_learned: z.array(
    z.object({
      lesson: z.string(),
      evidence: z.string(),
      action: z.string(),
    })
  ),
  top_recommendations: z.array(z.string()),
});

export type StrategicPlaybook = z.infer<typeof StrategicPlaybookSchema>;

// ── Mode 2: Outbound Sequence ──

export const OutboundSequenceSchema = z.object({
  sequence_name: z.string(),
  target_icp: z.string(),
  total_touchpoints: z.number(),
  total_duration_days: z.number(),
  steps: z.array(
    z.object({
      step_number: z.number(),
      day: z.number(),
      channel: z.enum(["email", "linkedin", "call"]),
      action_type: z.string(),
      subject: z.string().optional(),
      body: z.string(),
      call_script: z.string().optional(),
      notes: z.string(),
      goal: z.string(),
    })
  ),
  strategy_rationale: z.string(),
});

export type OutboundSequence = z.infer<typeof OutboundSequenceSchema>;

// ── Mode 2: A/B Variants ──

export const ABVariantSchema = z.object({
  step_number: z.number(),
  variant_a: z.object({
    subject: z.string().optional(),
    body: z.string(),
    hypothesis: z.string(),
  }),
  variant_b: z.object({
    subject: z.string().optional(),
    body: z.string(),
    hypothesis: z.string(),
  }),
  what_to_measure: z.string(),
});

export type ABVariant = z.infer<typeof ABVariantSchema>;

// ── Mode 2: Sequence Package ──

export const SequencePackageSchema = z.object({
  sequences: z.array(OutboundSequenceSchema),
  ab_variants: z.array(ABVariantSchema).optional(),
  overall_strategy: z.string(),
  expected_metrics: z.object({
    target_open_rate: z.string(),
    target_reply_rate: z.string(),
    target_meeting_rate: z.string(),
  }),
});

export type SequencePackage = z.infer<typeof SequencePackageSchema>;
