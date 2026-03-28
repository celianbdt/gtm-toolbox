export type ToolCategory = "strategy" | "messaging" | "analysis" | "outbound";
export type ToolStatus = "active" | "coming-soon";

export type GTMTool = {
  id: string;
  name: string;
  description: string;
  icon: string;
  href: string;
  category: ToolCategory;
  status: ToolStatus;
};
