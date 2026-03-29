export type AgentPersonality = {
  traits: Record<string, number>;
  speaking_style: string;
  biases: string[];
  trigger_topics: string[];
};

export type EngagementWeights = {
  contradiction: number;
  new_data: number;
  customer_mention: number;
  strategy_shift: number;
};

export type AgentConfig = {
  id: string;
  workspace_id: string | null;
  name: string;
  slug: string;
  avatar_emoji: string;
  color: string;
  role: string;
  personality: AgentPersonality;
  system_prompt: string;
  engagement_weights: EngagementWeights;
  is_template: boolean;
};

export type DebateSessionConfig = {
  mission: string;
  max_turns: number;
  agent_ids: string[];
  current_turn: number;
  insight_session_ids?: string[];
  models?: string[];
};

export type DebateSession = {
  id: string;
  workspace_id: string;
  tool_id: string;
  title: string;
  status: "active" | "paused" | "concluded";
  config: DebateSessionConfig;
  created_at: string;
};

export type MessageMetadata = {
  engagement_score?: number;
  phase?: string;
  round?: number;
  [key: string]: unknown;
};

export type DebateMessage = {
  id: string;
  session_id: string;
  agent_config_id: string | null;
  role: "user" | "agent" | "system";
  content: string;
  step_number: number;
  sequence_in_step: number;
  metadata: MessageMetadata;
  created_at: string;
};

export type SSEEvent =
  | {
      type: "agent_start";
      agentId: string;
      agentName: string;
      emoji: string;
      color: string;
      stepNumber: number;
      sequenceInStep: number;
    }
  | { type: "agent_delta"; agentId: string; delta: string }
  | {
      type: "agent_done";
      agentId: string;
      messageId: string;
      fullContent: string;
    }
  | { type: "step_done"; stepNumber: number; respondingCount: number }
  | { type: "error"; message: string };
