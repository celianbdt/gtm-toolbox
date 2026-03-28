import type { GTMTool } from "./types";

export const tools: GTMTool[] = [
  {
    id: "strategy-debate",
    name: "Strategy Debate",
    description:
      "Multi-agent debate to challenge and refine your GTM strategy with structured insights.",
    icon: "Swords",
    href: "strategy-debate",
    category: "strategy",
    status: "active",
  },
  {
    id: "icp-audit",
    name: "ICP Audit",
    description:
      "Deep-dive analysis of your Ideal Customer Profile with data-driven recommendations.",
    icon: "Target",
    href: "icp-audit",
    category: "analysis",
    status: "coming-soon",
  },
  {
    id: "messaging-lab",
    name: "Messaging Lab",
    description:
      "Craft and test your value propositions, taglines, and messaging frameworks.",
    icon: "MessageSquareText",
    href: "messaging-lab",
    category: "messaging",
    status: "coming-soon",
  },
  {
    id: "channel-planner",
    name: "Channel Planner",
    description:
      "Map and prioritize your go-to-market channels based on ICP and budget.",
    icon: "Route",
    href: "channel-planner",
    category: "strategy",
    status: "coming-soon",
  },
  {
    id: "competitive-intel",
    name: "Competitive Intel",
    description:
      "Multi-agent competitive analysis with battle cards, objection playbooks, and positioning matrix.",
    icon: "Radar",
    href: "competitive-intel",
    category: "analysis",
    status: "active",
  },
  {
    id: "outbound-builder",
    name: "Outbound Builder",
    description:
      "Analyze past campaigns and generate multi-channel outbound sequences with AI-powered insights.",
    icon: "Send",
    href: "outbound-builder",
    category: "outbound",
    status: "active",
  },
];

export function getToolById(id: string) {
  return tools.find((t) => t.id === id);
}

export function getActiveTools() {
  return tools.filter((t) => t.status === "active");
}

export function getToolsByCategory(category: string) {
  return tools.filter((t) => t.category === category);
}
