import { z } from "zod";

// ── Phase 1: Channel Context (extracted from inputs) ──

export const ChannelContextSchema = z.object({
  company_stage: z.string(),
  revenue_target: z.string(),
  timeline: z.string(),
  total_budget: z.number(),
  currency: z.string(),
  icp_summary: z.string(),
  current_channels: z.array(
    z.object({
      channel: z.string(),
      status: z.string(),
      assessment: z.string(),
      spend: z.number().optional(),
      notes: z.string().optional(),
    })
  ),
  key_constraints: z.array(z.string()),
  opportunities: z.array(z.string()),
});

export type ChannelContext = z.infer<typeof ChannelContextSchema>;

// ── Phase 4: Channel Scorecard ──
// NOTE: No .max() on arrays — Zod + generateObject breaks with array max constraints.

export const ChannelScorecardSchema = z.object({
  channels: z.array(
    z.object({
      channel_name: z.string(),
      fit_score: z.number(),
      cost_efficiency: z.string(),
      scalability: z.string(),
      time_to_impact: z.string(),
      current_status: z.string(),
      recommendation: z.enum(["invest", "optimize", "maintain", "cut", "test"]),
      rationale: z.string(),
    })
  ),
  overall_assessment: z.string(),
});

export type ChannelScorecard = z.infer<typeof ChannelScorecardSchema>;

// ── Phase 4: Budget Allocation ──

export const BudgetAllocationOutputSchema = z.object({
  total_budget: z.number(),
  allocations: z.array(
    z.object({
      channel: z.string(),
      recommended_spend: z.number(),
      percentage: z.number(),
      current_spend: z.number().optional(),
      change_direction: z.enum(["increase", "maintain", "decrease", "new", "cut"]),
      rationale: z.string(),
    })
  ),
  reallocation_summary: z.string(),
});

export type BudgetAllocationOutput = z.infer<typeof BudgetAllocationOutputSchema>;

// ── Phase 4: Channel Playbook ──

export const ChannelPlaybookSchema = z.object({
  channel_name: z.string(),
  objective: z.string(),
  tactics: z.array(
    z.object({
      tactic: z.string(),
      description: z.string(),
      priority: z.enum(["p0", "p1", "p2"]),
      estimated_cost: z.string(),
      expected_outcome: z.string(),
    })
  ),
  kpis: z.array(
    z.object({
      metric: z.string(),
      target: z.string(),
      measurement: z.string(),
    })
  ),
  quick_wins: z.array(z.string()),
  risks: z.array(z.string()),
});

export type ChannelPlaybook = z.infer<typeof ChannelPlaybookSchema>;

// ── Phase 4: Timeline Roadmap ──

export const TimelineRoadmapSchema = z.object({
  phases: z.array(
    z.object({
      phase_name: z.string(),
      duration: z.string(),
      channels: z.array(z.string()),
      milestones: z.array(z.string()),
      budget_allocation: z.string(),
      success_criteria: z.string(),
    })
  ),
  critical_path: z.string(),
});

export type TimelineRoadmap = z.infer<typeof TimelineRoadmapSchema>;

// ── Phase 4: ROI Projections ──

export const ROIProjectionsSchema = z.object({
  projections: z.array(
    z.object({
      channel: z.string(),
      monthly_spend: z.number(),
      expected_leads: z.number(),
      expected_pipeline: z.number(),
      estimated_cac: z.number(),
      roi_assessment: z.string(),
      confidence: z.string(),
      assumptions: z.array(z.string()),
    })
  ),
  total_expected_pipeline: z.number(),
  blended_cac: z.number(),
  key_risks: z.array(z.string()),
});

export type ROIProjections = z.infer<typeof ROIProjectionsSchema>;

// ── Executive Summary ──

export const CPExecutiveSummarySchema = z.object({
  title: z.string(),
  channel_landscape: z.string(),
  key_findings: z.array(
    z.object({
      finding: z.string(),
      impact: z.enum(["critical", "high", "medium", "low"]),
    })
  ),
  budget_recommendation: z.string(),
  immediate_actions: z.array(z.string()),
  channels_to_watch: z.array(z.string()),
});

export type CPExecutiveSummary = z.infer<typeof CPExecutiveSummarySchema>;
