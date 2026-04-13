export type CopywritingChannel = "linkedin" | "cold-email" | "cold-calling";
export type CopywritingTone = "professional" | "conversational" | "provocative" | "educational";
export type CopywritingMode = "quick" | "deep";

export const CHANNEL_LABELS: Record<CopywritingChannel, string> = {
  linkedin: "LinkedIn",
  "cold-email": "Cold Email",
  "cold-calling": "Cold Calling",
};

export const CHANNEL_DESCRIPTIONS: Record<CopywritingChannel, string> = {
  linkedin: "Messages LinkedIn (InMail, connexion, follow-up)",
  "cold-email": "Emails de prospection (sujet, corps, CTA)",
  "cold-calling": "Scripts d'appel (intro, pitch, objections)",
};

export const TONE_LABELS: Record<CopywritingTone, string> = {
  professional: "Professionnel",
  conversational: "Conversationnel",
  provocative: "Provocateur",
  educational: "Educatif",
};

export const MODE_LABELS: Record<CopywritingMode, string> = {
  quick: "Quick — Generation directe",
  deep: "Deep — Debat agents + generation",
};

export type CopywritingPhase =
  | "context-loading"
  | "debate"
  | "generation"
  | "complete";

export type CWSessionConfig = {
  channel: CopywritingChannel;
  tone: CopywritingTone;
  mode: CopywritingMode;
  sequence_length: number;
  brief: string;
  current_phase: CopywritingPhase;
};

export type CWSession = {
  id: string;
  workspace_id: string;
  tool_id: "copywriting";
  title: string;
  status: "active" | "paused" | "concluded";
  config: CWSessionConfig;
  created_at: string;
};

export type CWOutputType = "sequence" | "debate-summary";

export type CWSessionOutput = {
  id: string;
  session_id: string;
  output_type: CWOutputType;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

// SSE Events
export type CWSSEEvent =
  | { type: "phase_start"; phase: CopywritingPhase }
  | { type: "phase_done"; phase: CopywritingPhase }
  | { type: "agent_start"; agentId: string; agentName: string; emoji: string; color: string }
  | { type: "agent_delta"; agentId: string; delta: string }
  | { type: "agent_done"; agentId: string; fullContent: string }
  | { type: "output_ready"; outputType: CWOutputType; outputId: string }
  | { type: "generation_complete" }
  | { type: "error"; message: string };

// Sequence output shape
export type SequenceStep = {
  step_number: number;
  subject?: string; // cold-email only
  body: string;
  cta?: string;
  notes?: string; // cold-calling: objection handling notes
};

export type SequenceOutput = {
  channel: CopywritingChannel;
  tone: CopywritingTone;
  steps: SequenceStep[];
};
