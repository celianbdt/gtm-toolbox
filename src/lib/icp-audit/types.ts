import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

// ── Session Config ──

export type ICPSegment = {
  id: string;
  name: string;
  description: string;
  industry?: string;
  company_size?: string;
  revenue_range?: string;
};

export type ICPPersona = {
  id: string;
  title: string;
  role: string;
  pain_points: string[];
  goals: string[];
  decision_criteria: string[];
};

export type CustomerDataSource = {
  type: "csv" | "manual" | "crm-export";
  title: string;
  content: string;
};

export type WinLossEntry = {
  type: "win" | "loss";
  account_name?: string;
  segment?: string;
  reason: string;
  deal_size?: string;
  notes?: string;
};

export type AuditFocus =
  | "segment-fit"
  | "persona-accuracy"
  | "tam-sam"
  | "win-loss-patterns"
  | "expansion-signals"
  | "churn-risk";

export const AUDIT_FOCUS_LABELS: Record<AuditFocus, string> = {
  "segment-fit": "Segment Fit Analysis",
  "persona-accuracy": "Persona Accuracy",
  "tam-sam": "TAM / SAM / SOM",
  "win-loss-patterns": "Win/Loss Patterns",
  "expansion-signals": "Expansion Signals",
  "churn-risk": "Churn Risk Indicators",
};

export type AuditPhase =
  | "data-processing"
  | "analyst-assessment"
  | "debate"
  | "synthesis"
  | "complete";

export type ICASessionConfig = {
  icp_definition: string;
  segments: ICPSegment[];
  personas: ICPPersona[];
  customer_data: CustomerDataSource[];
  win_loss_data: WinLossEntry[];
  focus_dimensions: AuditFocus[];
  custom_question?: string;
  analyst_agent_ids: string[];
  current_phase: AuditPhase;
  phase_config: {
    debate_rounds: number;
  };
  insight_session_ids?: string[];
};

export type ICASession = {
  id: string;
  workspace_id: string;
  tool_id: "icp-audit";
  title: string;
  status: "active" | "paused" | "concluded";
  config: ICASessionConfig;
  created_at: string;
};

// ── SSE Events ──

export type ICASSEEvent =
  | { type: "phase_start"; phase: AuditPhase; phaseNumber: number }
  | { type: "phase_done"; phase: AuditPhase }
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      phase: AuditPhase;
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

export type ICAOutputType =
  | "icp-scorecard"
  | "segment-analysis"
  | "persona-card"
  | "tam-sam-analysis"
  | "prioritization-matrix"
  | "executive-summary";

export type ICASessionOutput = {
  id: string;
  session_id: string;
  output_type: ICAOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// Re-export for convenience
export type { AgentConfig, DebateMessage };
