export type DocType = "icp" | "product" | "competitor" | "general";

export const DOC_TYPES: { value: DocType; label: string; color: string }[] = [
  { value: "icp", label: "ICP", color: "#8b5cf6" },
  { value: "product", label: "Product", color: "#06b6d4" },
  { value: "competitor", label: "Competitor", color: "#ef4444" },
  { value: "general", label: "General", color: "#6b7280" },
];

export type ContextDocument = {
  id: string;
  workspace_id: string;
  title: string;
  content: string;
  doc_type: DocType;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
};
