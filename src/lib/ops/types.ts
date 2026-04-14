export type NoteSource =
  | "manual"
  | "debate"
  | "icp-audit"
  | "messaging-lab"
  | "competitive-intel"
  | "outbound-builder"
  | "copywriting";

export type OpsNote = {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  source: NoteSource;
  source_session_id: string | null;
  tags: string[];
  is_pinned: boolean;
  created_at: string;
  updated_at: string;
};

export const SOURCE_LABELS: Record<NoteSource, string> = {
  manual: "Manuel",
  debate: "Debat",
  "icp-audit": "ICP Audit",
  "messaging-lab": "Messaging Lab",
  "competitive-intel": "Competitive Intel",
  "outbound-builder": "Outbound Builder",
  copywriting: "Copywriting",
};

export const SOURCE_COLORS: Record<NoteSource, string> = {
  manual: "#6b7280",
  debate: "#8a6e4e",
  "icp-audit": "#ef4444",
  "messaging-lab": "#f59e0b",
  "competitive-intel": "#3b82f6",
  "outbound-builder": "#10b981",
  copywriting: "#ec4899",
};
