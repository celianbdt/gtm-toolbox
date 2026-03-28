import { describe, it, expect } from "vitest";
import { formatOutput, TOOL_DISPLAY_NAMES } from "@/lib/insights/formatters";
import type { SessionOutputRecord } from "@/lib/insights/types";

function makeOutput(overrides: Partial<SessionOutputRecord>): SessionOutputRecord {
  return {
    id: "test-id",
    session_id: "session-1",
    output_type: "unknown",
    title: "Test Output",
    description: "Test description",
    confidence_score: null,
    tags: [],
    metadata: {},
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

describe("Insight Formatters", () => {
  describe("TOOL_DISPLAY_NAMES", () => {
    it("has all tool names", () => {
      expect(TOOL_DISPLAY_NAMES["strategy-debate"]).toBe("Strategy Debate");
      expect(TOOL_DISPLAY_NAMES["competitive-intel"]).toBe("Competitive Intelligence");
      expect(TOOL_DISPLAY_NAMES["outbound-builder"]).toBe("Outbound Builder");
    });
  });

  describe("CI formatters", () => {
    it("formats battle card with threat level", () => {
      const output = makeOutput({
        output_type: "battle-card",
        title: "Battle Card: Acme",
        description: "Direct competitor in enterprise",
        metadata: {
          threat_level: "high",
          winning_talk_track: "We offer better integrations",
          key_differentiators: [
            { our_advantage: "Native API" },
            { our_advantage: "Self-serve onboarding" },
          ],
        },
      });

      const result = formatOutput("competitive-intel", output);
      expect(result).toContain("Threat: high");
      expect(result).toContain("Talk track: We offer better integrations");
      expect(result).toContain("Native API");
      expect(result).toContain("Self-serve onboarding");
    });

    it("formats executive summary", () => {
      const output = makeOutput({
        output_type: "executive-summary",
        title: "Q1 Competitive Overview",
        metadata: {
          competitive_landscape: "Market is consolidating",
          our_position: "Strong in SMB, weak in enterprise",
          immediate_actions: ["Hire enterprise AE", "Launch enterprise plan"],
        },
      });

      const result = formatOutput("competitive-intel", output);
      expect(result).toContain("Market is consolidating");
      expect(result).toContain("Strong in SMB");
      expect(result).toContain("Hire enterprise AE");
    });
  });

  describe("Debate formatter", () => {
    it("formats debate summary with takeaways", () => {
      const output = makeOutput({
        output_type: "debate-summary",
        title: "Strategy Discussion Summary",
        description: "Key decisions made",
        metadata: {
          key_takeaways: ["Focus on PLG motion", "Pricing needs rework"],
          strategic_recommendations: ["Launch free tier", "Hire PMM"],
        },
      });

      const result = formatOutput("strategy-debate", output);
      expect(result).toContain("Focus on PLG motion");
      expect(result).toContain("Launch free tier");
    });
  });

  describe("Outbound formatters", () => {
    it("formats strategic playbook", () => {
      const output = makeOutput({
        output_type: "strategic-playbook",
        title: "Outbound Playbook",
        metadata: {
          executive_summary: "Multi-channel approach recommended",
          top_recommendations: ["Lead with email", "Add LinkedIn day 3"],
        },
      });

      const result = formatOutput("outbound-builder", output);
      expect(result).toContain("Multi-channel approach recommended");
      expect(result).toContain("Lead with email");
    });

    it("formats campaign KPIs", () => {
      const output = makeOutput({
        output_type: "campaign-kpi-summary",
        title: "KPI Summary",
        metadata: {
          overall_metrics: { avg_open_rate: 48, avg_reply_rate: 9 },
        },
      });

      const result = formatOutput("outbound-builder", output);
      expect(result).toContain("Open: 48%");
      expect(result).toContain("Reply: 9%");
    });
  });

  describe("Default formatter", () => {
    it("falls back for unknown tool/type", () => {
      const output = makeOutput({
        output_type: "unknown-type",
        title: "Some Output",
        description: "Some description",
      });

      const result = formatOutput("unknown-tool", output);
      expect(result).toBe("**Some Output**\nSome description");
    });
  });
});
