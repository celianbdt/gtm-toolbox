import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

// ── Session Config ──

export type CompetitorDataSource = {
  type: "url" | "document" | "manual";
  title: string;
  content: string;
};

export type CompetitorEntry = {
  id: string;
  name: string;
  website?: string;
  data_sources: CompetitorDataSource[];
};

export type AnalysisFocus =
  | "positioning"
  | "product"
  | "pricing"
  | "icp-overlap"
  | "sales-motion"
  | "content";

export const ANALYSIS_FOCUS_LABELS: Record<AnalysisFocus, string> = {
  positioning: "Positioning & Messaging",
  product: "Product / Features",
  pricing: "Pricing & Packaging",
  "icp-overlap": "Target Market / ICP Overlap",
  "sales-motion": "Sales Motion & Process",
  content: "Content & Thought Leadership",
};

export type AnalysisPhase =
  | "data-processing"
  | "analyst-assessment"
  | "debate"
  | "synthesis"
  | "complete";

export type CISessionConfig = {
  competitors: CompetitorEntry[];
  focus_dimensions: AnalysisFocus[];
  custom_question?: string;
  analyst_agent_ids: string[];
  current_phase: AnalysisPhase;
  phase_config: {
    debate_rounds: number;
  };
};

export type CISession = {
  id: string;
  workspace_id: string;
  tool_id: "competitive-intel";
  title: string;
  status: "active" | "paused" | "concluded";
  config: CISessionConfig;
  created_at: string;
};

// ── SSE Events ──

export type CISSEEvent =
  | { type: "phase_start"; phase: AnalysisPhase; phaseNumber: number }
  | { type: "phase_done"; phase: AnalysisPhase }
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      phase: AnalysisPhase;
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

export type CIOutputType =
  | "intel-brief"
  | "battle-card"
  | "positioning-matrix"
  | "objection-playbook"
  | "threat-assessment"
  | "executive-summary";

export type CISessionOutput = {
  id: string;
  session_id: string;
  output_type: CIOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// Re-export for convenience
export type { AgentConfig, DebateMessage };
