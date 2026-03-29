import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

// ── Session Config ──

export type ProductInfo = {
  name: string;
  description: string;
  category: string;
  key_features: string[];
  pricing_model?: string;
};

export type AudienceInfo = {
  icp_summary: string;
  primary_pain_points: string[];
  decision_criteria: string[];
  buying_stage?: string;
};

export type CompetitorMessaging = {
  name: string;
  tagline?: string;
  key_claims: string[];
  positioning?: string;
};

export type CurrentMessaging = {
  tagline?: string;
  value_props: string[];
  elevator_pitch?: string;
  what_to_improve?: string;
};

export type MessagingFocus =
  | "positioning"
  | "differentiation"
  | "emotional-resonance"
  | "objection-handling"
  | "sales-enablement"
  | "content-messaging";

export const MESSAGING_FOCUS_LABELS: Record<MessagingFocus, string> = {
  positioning: "Positioning & Category",
  differentiation: "Differentiation & Uniqueness",
  "emotional-resonance": "Emotional Resonance",
  "objection-handling": "Objection Handling",
  "sales-enablement": "Sales Enablement",
  "content-messaging": "Content & Messaging",
};

export type WorkshopPhase =
  | "context-loading"
  | "messaging-workshop"
  | "critique-debate"
  | "synthesis"
  | "complete";

export type MLSessionConfig = {
  product: ProductInfo;
  audience: AudienceInfo;
  competitors: CompetitorMessaging[];
  current_messaging: CurrentMessaging;
  focus_dimensions: MessagingFocus[];
  custom_question?: string;
  analyst_agent_ids: string[];
  current_phase: WorkshopPhase;
  phase_config: { debate_rounds: number };
  insight_session_ids?: string[];
};

export type MLSession = {
  id: string;
  workspace_id: string;
  tool_id: "messaging-lab";
  title: string;
  status: "active" | "paused" | "concluded";
  config: MLSessionConfig;
  created_at: string;
};

// ── SSE Events ──

export type MLSSEEvent =
  | { type: "phase_start"; phase: WorkshopPhase; phaseNumber: number }
  | { type: "phase_done"; phase: WorkshopPhase }
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      phase: WorkshopPhase;
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

export type MLOutputType =
  | "messaging-framework"
  | "value-propositions"
  | "tagline-options"
  | "objection-responses"
  | "elevator-pitch"
  | "executive-summary";

export type MLSessionOutput = {
  id: string;
  session_id: string;
  output_type: MLOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// Re-export for convenience
export type { AgentConfig, DebateMessage };
