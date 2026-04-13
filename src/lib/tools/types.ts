export type ToolCategory = "strategy" | "messaging" | "analysis" | "outbound" | "ops" | "dev";
export type ToolStatus = "active" | "coming-soon";
export type ToolStage = "discovery" | "foundation" | "optimization" | "scaling";

export type GTMTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  category: ToolCategory;
  status: ToolStatus;
  prerequisites?: string[];
  recommended_after?: string[];
  stage?: ToolStage;
  sequence_order?: number;
};
