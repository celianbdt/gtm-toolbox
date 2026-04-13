import { describe, it, expect } from "vitest";
import { estimateToolCost } from "@/lib/ai/cost-estimator";

const KNOWN_TOOLS = [
  "copywriting",
  "icp-audit",
  "messaging-lab",
  "competitive-intel",
  "channel-planner",
  "outbound-builder",
  "strategy-debate",
] as const;

describe("Cost estimator", () => {
  it("estimateToolCost('copywriting') returns a valid CostEstimate with breakdown", () => {
    const estimate = estimateToolCost("copywriting");
    expect(estimate).toHaveProperty("totalEstimatedCost");
    expect(estimate).toHaveProperty("breakdown");
    expect(Array.isArray(estimate.breakdown)).toBe(true);
    expect(estimate.breakdown.length).toBeGreaterThan(0);
  });

  it("estimateToolCost('icp-audit') returns cost > 0", () => {
    const estimate = estimateToolCost("icp-audit");
    expect(estimate.totalEstimatedCost).toBeGreaterThan(0);
  });

  it("estimateToolCost('unknown-tool') returns totalEstimatedCost === 0", () => {
    const estimate = estimateToolCost("unknown-tool");
    expect(estimate.totalEstimatedCost).toBe(0);
    expect(estimate.breakdown).toHaveLength(0);
  });

  it.each(KNOWN_TOOLS)(
    "known tool '%s' returns a positive cost",
    (toolId) => {
      const estimate = estimateToolCost(toolId);
      expect(estimate.totalEstimatedCost).toBeGreaterThan(0);
    }
  );

  it("breakdown items have required fields with valid values", () => {
    for (const toolId of KNOWN_TOOLS) {
      const estimate = estimateToolCost(toolId);
      for (const item of estimate.breakdown) {
        expect(item).toHaveProperty("phase");
        expect(item).toHaveProperty("model");
        expect(typeof item.phase).toBe("string");
        expect(typeof item.model).toBe("string");
        expect(item.estimatedInputTokens).toBeGreaterThan(0);
        expect(item.estimatedOutputTokens).toBeGreaterThan(0);
        expect(item.cost).toBeGreaterThanOrEqual(0);
      }
    }
  });
});
