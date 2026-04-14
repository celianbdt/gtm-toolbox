import type { GTMTool } from "./types";

export const tools: GTMTool[] = [
  {
    id: "icp-audit",
    name: "ICP Audit",
    description:
      "Deep-dive analysis of your Ideal Customer Profile with data-driven recommendations.",
    icon: "Target",
    href: "icp-audit",
    category: "analysis",
    status: "active",
    stage: "discovery",
    prerequisites: [],
    sequence_order: 1,
  },
  {
    id: "strategy-debate",
    name: "Strategy Debate",
    description:
      "Multi-agent debate to challenge and refine your GTM strategy with structured insights.",
    icon: "Swords",
    href: "strategy-debate",
    category: "strategy",
    status: "active",
    stage: "discovery",
    prerequisites: ["icp-audit"],
    recommended_after: ["icp-audit"],
    sequence_order: 2,
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
    stage: "foundation",
    prerequisites: ["icp-audit"],
    recommended_after: ["strategy-debate"],
    sequence_order: 3,
  },
  {
    id: "messaging-lab",
    name: "Messaging Lab",
    description:
      "Craft and test your value propositions, taglines, and messaging frameworks.",
    icon: "MessageSquareText",
    href: "messaging-lab",
    category: "messaging",
    status: "active",
    stage: "foundation",
    prerequisites: ["icp-audit"],
    recommended_after: ["strategy-debate", "competitive-intel"],
    sequence_order: 4,
  },
  {
    id: "channel-planner",
    name: "Channel Planner",
    description:
      "Map and prioritize your go-to-market channels based on ICP and budget.",
    icon: "Route",
    href: "channel-planner",
    category: "strategy",
    status: "active",
    stage: "foundation",
    prerequisites: ["icp-audit"],
    recommended_after: ["messaging-lab"],
    sequence_order: 5,
  },
  {
    id: "copywriting",
    name: "Copywriting",
    description:
      "Generate multi-step copy sequences for LinkedIn, Cold Email, and Cold Calling.",
    icon: "PenLine",
    href: "copywriting",
    category: "messaging",
    status: "active",
    stage: "optimization",
    prerequisites: ["messaging-lab"],
    recommended_after: ["channel-planner"],
    sequence_order: 6,
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
    stage: "optimization",
    prerequisites: ["messaging-lab"],
    recommended_after: ["copywriting"],
    sequence_order: 7,
  },
  {
    id: "ops-engine",
    name: "Ops Engine",
    description:
      "Prospect database with signals, enrichment waterfalls, scoring, and automations — like Clay, built-in.",
    icon: "Database",
    href: "ops-engine",
    category: "ops",
    status: "active",
    stage: "scaling",
    prerequisites: [],
    sequence_order: 8,
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

export function getToolsByStage(stage: string) {
  return tools.filter((t) => t.stage === stage).sort((a, b) => (a.sequence_order ?? 99) - (b.sequence_order ?? 99));
}
