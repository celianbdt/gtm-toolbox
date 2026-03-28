export type InsightSession = {
  id: string;
  tool_id: string;
  title: string;
  status: string;
  created_at: string;
  output_count: number;
  output_types: string[];
};

export type SessionOutputRecord = {
  id: string;
  session_id: string;
  output_type: string;
  title: string;
  description: string;
  confidence_score: number | null;
  tags: string[];
  metadata: Record<string, unknown>;
  created_at: string;
};

export type InsightSessionWithOutputs = InsightSession & {
  outputs: SessionOutputRecord[];
};
