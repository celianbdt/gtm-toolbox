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

describe("Copywriting Insight Formatters", () => {
  describe("TOOL_DISPLAY_NAMES", () => {
    it("copywriting display name is correct", () => {
      expect(TOOL_DISPLAY_NAMES["copywriting"]).toBe("Copywriting");
    });
  });

  describe("sequence formatter", () => {
    it("formats sequence output with channel and steps", () => {
      const output = makeOutput({
        output_type: "sequence",
        title: "LinkedIn Sequence",
        description: "5-step LinkedIn outreach for SaaS founders",
        metadata: {
          channel: "linkedin",
          steps: [
            { step: 1, content: "Connection request" },
            { step: 2, content: "Follow-up message" },
            { step: 3, content: "Value share" },
          ],
        },
      });

      const result = formatOutput("copywriting", output);
      expect(result).toContain("LinkedIn Sequence");
      expect(result).toContain("Channel: linkedin");
      expect(result).toContain("Steps: 3");
      expect(result).toContain("5-step LinkedIn outreach for SaaS founders");
    });

    it("handles missing channel gracefully", () => {
      const output = makeOutput({
        output_type: "sequence",
        title: "Email Sequence",
        description: "Cold email outreach",
        metadata: {
          steps: [{ step: 1, content: "Intro email" }],
        },
      });

      const result = formatOutput("copywriting", output);
      expect(result).toContain("Channel: unknown");
      expect(result).toContain("Steps: 1");
    });

    it("handles missing steps gracefully", () => {
      const output = makeOutput({
        output_type: "sequence",
        title: "Draft Sequence",
        description: "Work in progress",
        metadata: {
          channel: "cold-email",
        },
      });

      const result = formatOutput("copywriting", output);
      expect(result).toContain("Channel: cold-email");
      expect(result).toContain("Steps: ?");
    });
  });

  describe("debate-summary formatter", () => {
    it("formats debate summary with title and description", () => {
      const output = makeOutput({
        output_type: "debate-summary",
        title: "Copy Review Summary",
        description: "Agents agreed on a conversational tone with data-driven hooks",
        metadata: {},
      });

      const result = formatOutput("copywriting", output);
      expect(result).toContain("**Copy Review Summary**");
      expect(result).toContain("Agents agreed on a conversational tone with data-driven hooks");
    });
  });

  describe("fallback to default formatter", () => {
    it("unknown output type falls back to default", () => {
      const output = makeOutput({
        output_type: "totally-unknown-type",
        title: "Mystery Output",
        description: "Should use default formatter",
      });

      const result = formatOutput("copywriting", output);
      expect(result).toBe("**Mystery Output**\nShould use default formatter");
    });

    it("unknown tool falls back to default", () => {
      const output = makeOutput({
        output_type: "sequence",
        title: "Some Output",
        description: "Some description",
      });

      const result = formatOutput("nonexistent-tool", output);
      expect(result).toBe("**Some Output**\nSome description");
    });
  });
});
