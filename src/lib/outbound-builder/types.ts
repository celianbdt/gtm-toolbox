import type { AgentConfig, DebateMessage } from "@/lib/debate/types";

// ── Campaign Data ──

export type CampaignChannel = "email" | "linkedin" | "call" | "other";

export type CampaignRow = {
  campaign_name: string;
  channel: CampaignChannel;
  segment?: string;
  sent?: number;
  opened?: number;
  open_rate?: number;
  replied?: number;
  reply_rate?: number;
  clicked?: number;
  meetings_booked?: number;
  conversion_rate?: number;
  period?: string;
  notes?: string;
  extras?: Record<string, string | number>;
};

export type CampaignDataSourceType =
  | "csv"
  | "manual"
  | "lemlist"
  | "instantly"
  | "plusvibe"
  | "smartlead";

export type CampaignDataSource = {
  type: CampaignDataSourceType;
  filename?: string;
  rows: CampaignRow[];
};

// ── Analyzer (Mode 1) ──

export type AnalyzerFocus =
  | "segment-performance"
  | "channel-effectiveness"
  | "timing-cadence"
  | "messaging-patterns"
  | "conversion-funnel";

export const ANALYZER_FOCUS_LABELS: Record<AnalyzerFocus, string> = {
  "segment-performance": "Segment Performance",
  "channel-effectiveness": "Channel Effectiveness",
  "timing-cadence": "Timing & Cadence",
  "messaging-patterns": "Messaging Patterns",
  "conversion-funnel": "Conversion Funnel",
};

export type AnalyzerPhase =
  | "data-processing"
  | "analyst-assessment"
  | "debate"
  | "synthesis"
  | "complete";

export type AnalyzerSessionConfig = {
  mode: "analyzer";
  campaign_data: CampaignDataSource[];
  focus_dimensions: AnalyzerFocus[];
  custom_question?: string;
  analyst_agent_ids: string[];
  current_phase: AnalyzerPhase;
  phase_config: { debate_rounds: number };
  insight_session_ids?: string[];
};

// ── Builder (Mode 2) ──

export type ICPDefinition = {
  title: string;
  persona_role: string;
  industry?: string;
  company_size?: string;
  pain_points: string[];
  value_props: string[];
};

export type ChannelConfig = {
  email: boolean;
  linkedin: boolean;
  call: boolean;
};

export type SequenceTone = "formal" | "conversational" | "bold";
export type SequenceLanguage = "en" | "fr";

export type SequenceParams = {
  sequence_length: number;
  total_duration_days: number;
  ab_variants: boolean;
  tone: SequenceTone;
  language: SequenceLanguage;
};

export type BuilderPhase =
  | "context-loading"
  | "strategy-generation"
  | "sequence-drafting"
  | "complete";

export type BuilderSessionConfig = {
  mode: "builder";
  icp: ICPDefinition;
  channels: ChannelConfig;
  sequence_params: SequenceParams;
  playbook_session_id?: string;
  analyst_agent_ids: string[];
  current_phase: BuilderPhase;
  insight_session_ids?: string[];
};

// ── Import (Library) ──

export type ImportSessionConfig = {
  mode: "import";
  campaign_data: CampaignDataSource[];
  total_campaigns: number;
};

// ── Union ──

export type OBSessionConfig = AnalyzerSessionConfig | BuilderSessionConfig | ImportSessionConfig;

export type OBSession = {
  id: string;
  workspace_id: string;
  tool_id: "outbound-builder";
  title: string;
  status: "active" | "paused" | "concluded";
  config: OBSessionConfig;
  created_at: string;
};

// ── Output Types ──

export type OBOutputType =
  | "strategic-playbook"
  | "campaign-kpi-summary"
  | "segment-analysis"
  | "outbound-sequence"
  | "ab-variants"
  | "sequence-package";

export type OBSessionOutput = {
  id: string;
  session_id: string;
  output_type: OBOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// ── SSE Events ──

export type OBSSEEvent =
  | { type: "phase_start"; phase: string; phaseNumber: number }
  | { type: "phase_done"; phase: string }
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      phase: string;
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

// Re-export
export type { AgentConfig, DebateMessage };
