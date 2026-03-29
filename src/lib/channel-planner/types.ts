import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

// ── Session Config ──

export type GoalsInfo = {
  revenue_target: string;
  timeline_months: number;
  growth_stage: GrowthStage;
  primary_objective: string;
};

export type GrowthStage =
  | "pre-seed"
  | "seed"
  | "series-a"
  | "series-b-plus"
  | "growth"
  | "enterprise";

export const GROWTH_STAGE_LABELS: Record<GrowthStage, string> = {
  "pre-seed": "Pre-Seed",
  seed: "Seed",
  "series-a": "Series A",
  "series-b-plus": "Series B+",
  growth: "Growth",
  enterprise: "Enterprise",
};

export type BudgetAllocationEntry = {
  channel: string;
  spend: number;
};

export type BudgetInfo = {
  total_monthly: number;
  currency: string;
  current_allocation: BudgetAllocationEntry[];
};

export type ChannelStatus = "active" | "tested" | "planned" | "abandoned";
export type ChannelAssessment = "working" | "underperforming" | "unknown";

export type CurrentChannelPerformance = {
  channel: string;
  status: ChannelStatus;
  monthly_spend?: number;
  metrics?: string;
  assessment: ChannelAssessment;
  notes?: string;
};

export type ICPContext = {
  summary: string;
  segments: string[];
  buying_behavior?: string;
};

export type ChannelFocus =
  | "paid-acquisition"
  | "organic-content"
  | "outbound-sales"
  | "partnerships"
  | "events-community"
  | "product-led";

export const CHANNEL_FOCUS_LABELS: Record<ChannelFocus, string> = {
  "paid-acquisition": "Paid Acquisition",
  "organic-content": "Organic & Content",
  "outbound-sales": "Outbound Sales",
  partnerships: "Partnerships",
  "events-community": "Events & Community",
  "product-led": "Product-Led Growth",
};

export type PlanningPhase =
  | "context-loading"
  | "channel-assessment"
  | "strategy-debate"
  | "synthesis"
  | "complete";

export type CPSessionConfig = {
  goals: GoalsInfo;
  budget: BudgetInfo;
  current_channels: CurrentChannelPerformance[];
  icp_context: ICPContext;
  focus_dimensions: ChannelFocus[];
  custom_question?: string;
  analyst_agent_ids: string[];
  current_phase: PlanningPhase;
  phase_config: { debate_rounds: number };
  insight_session_ids?: string[];
};

export type CPSession = {
  id: string;
  workspace_id: string;
  tool_id: "channel-planner";
  title: string;
  status: "active" | "paused" | "concluded";
  config: CPSessionConfig;
  created_at: string;
};

// ── SSE Events ──

export type CPSSEEvent =
  | { type: "phase_start"; phase: PlanningPhase; phaseNumber: number }
  | { type: "phase_done"; phase: PlanningPhase }
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      phase: PlanningPhase;
    }
  | { type: "agent_delta"; agentId: string; delta: string }
  | {
      type: "agent_done";
      agentId: string;
      messageId: string;
      fullContent: string;
    }
  | { type: "output_ready"; outputType: string; outputId: string }
  | { type: "analysis_complete" }
  | { type: "error"; message: string };

// ── Output Types ──

export type CPOutputType =
  | "channel-scorecard"
  | "budget-allocation"
  | "channel-playbook"
  | "timeline-roadmap"
  | "roi-projections"
  | "executive-summary";

export type CPSessionOutput = {
  id: string;
  session_id: string;
  output_type: CPOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// Re-export for convenience
export type { AgentConfig, DebateMessage };
