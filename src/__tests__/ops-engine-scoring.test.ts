import { describe, it, expect } from "vitest";
import {
  evaluateRule,
  calculateScore,
  determineTier,
} from "@/lib/ops-engine/scoring";
import type { ScoringRule, ThresholdConfig } from "@/lib/ops-engine/types";

const makeRule = (overrides: Partial<ScoringRule>): ScoringRule => ({
  id: "test-rule",
  label: "Test",
  column_key: "industry",
  operator: "equals",
  value: "SaaS",
  score_impact: 20,
  ...overrides,
});

describe("evaluateRule", () => {
  it("equals — matches", () => {
    const rule = makeRule({ operator: "equals", column_key: "industry", value: "SaaS" });
    expect(evaluateRule(rule, { industry: "SaaS" })).toBe(true);
  });

  it("equals — no match", () => {
    const rule = makeRule({ operator: "equals", column_key: "industry", value: "SaaS" });
    expect(evaluateRule(rule, { industry: "Fintech" })).toBe(false);
  });

  it("not_equals — matches when different", () => {
    const rule = makeRule({ operator: "not_equals", column_key: "industry", value: "SaaS" });
    expect(evaluateRule(rule, { industry: "Fintech" })).toBe(true);
  });

  it("contains — substring match", () => {
    const rule = makeRule({ operator: "contains", column_key: "description", value: "saas" });
    expect(evaluateRule(rule, { description: "We build SaaS tools for sales teams" })).toBe(true);
  });

  it("contains — no match", () => {
    const rule = makeRule({ operator: "contains", column_key: "description", value: "blockchain" });
    expect(evaluateRule(rule, { description: "SaaS platform" })).toBe(false);
  });

  it("not_contains — matches when absent", () => {
    const rule = makeRule({ operator: "not_contains", column_key: "industry", value: "crypto" });
    expect(evaluateRule(rule, { industry: "SaaS" })).toBe(true);
  });

  it("greater_than — numeric comparison", () => {
    const rule = makeRule({ operator: "greater_than", column_key: "employee_count", value: 50 });
    expect(evaluateRule(rule, { employee_count: 100 })).toBe(true);
    expect(evaluateRule(rule, { employee_count: 30 })).toBe(false);
  });

  it("less_than — numeric comparison", () => {
    const rule = makeRule({ operator: "less_than", column_key: "employee_count", value: 500 });
    expect(evaluateRule(rule, { employee_count: 100 })).toBe(true);
    expect(evaluateRule(rule, { employee_count: 600 })).toBe(false);
  });

  it("within_days — recent date", () => {
    const recent = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const rule = makeRule({ operator: "within_days", column_key: "funding_date", value: 90 });
    expect(evaluateRule(rule, { funding_date: recent })).toBe(true);
  });

  it("within_days — old date", () => {
    const old = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();
    const rule = makeRule({ operator: "within_days", column_key: "funding_date", value: 90 });
    expect(evaluateRule(rule, { funding_date: old })).toBe(false);
  });

  it("matches_list — value in list", () => {
    const rule = makeRule({
      operator: "matches_list",
      column_key: "industry",
      value: ["SaaS", "Fintech", "AI"],
    });
    expect(evaluateRule(rule, { industry: "SaaS" })).toBe(true);
    expect(evaluateRule(rule, { industry: "Healthcare" })).toBe(false);
  });

  it("is_empty — null value", () => {
    const rule = makeRule({ operator: "is_empty", column_key: "email" });
    expect(evaluateRule(rule, { email: null })).toBe(true);
    expect(evaluateRule(rule, { email: undefined })).toBe(true);
    expect(evaluateRule(rule, { email: "" })).toBe(true);
    expect(evaluateRule(rule, {})).toBe(true);
  });

  it("is_not_empty — has value", () => {
    const rule = makeRule({ operator: "is_not_empty", column_key: "email" });
    expect(evaluateRule(rule, { email: "test@acme.com" })).toBe(true);
    expect(evaluateRule(rule, { email: "" })).toBe(false);
    expect(evaluateRule(rule, {})).toBe(false);
  });

  it("handles missing column key gracefully", () => {
    const rule = makeRule({ operator: "equals", column_key: "missing_field", value: "test" });
    expect(evaluateRule(rule, { other_field: "value" })).toBe(false);
  });
});

describe("calculateScore", () => {
  it("sums matched rule impacts", () => {
    const rules: ScoringRule[] = [
      makeRule({ id: "r1", operator: "equals", column_key: "industry", value: "SaaS", score_impact: 20 }),
      makeRule({ id: "r2", operator: "greater_than", column_key: "employee_count", value: 10, score_impact: 15 }),
      makeRule({ id: "r3", operator: "equals", column_key: "country", value: "FR", score_impact: 10 }),
    ];

    const result = calculateScore(rules, { industry: "SaaS", employee_count: 50, country: "US" });
    expect(result.total).toBe(35); // r1 (20) + r2 (15), r3 doesn't match
    expect(result.matched_rules).toHaveLength(2);
  });

  it("handles negative impacts", () => {
    const rules: ScoringRule[] = [
      makeRule({ id: "r1", operator: "equals", column_key: "is_competitor", value: "true", score_impact: -50 }),
      makeRule({ id: "r2", operator: "equals", column_key: "industry", value: "SaaS", score_impact: 20 }),
    ];

    const result = calculateScore(rules, { is_competitor: "true", industry: "SaaS" });
    expect(result.total).toBe(-30); // -50 + 20
  });

  it("returns 0 when no rules match", () => {
    const rules: ScoringRule[] = [
      makeRule({ id: "r1", operator: "equals", column_key: "industry", value: "SaaS", score_impact: 20 }),
    ];

    const result = calculateScore(rules, { industry: "Fintech" });
    expect(result.total).toBe(0);
    expect(result.matched_rules).toHaveLength(0);
  });

  it("returns 0 for empty rules", () => {
    const result = calculateScore([], { industry: "SaaS" });
    expect(result.total).toBe(0);
  });

  it("skips ai_evaluation rules (async)", () => {
    const rules: ScoringRule[] = [
      makeRule({ id: "r1", operator: "equals", column_key: "industry", value: "SaaS", score_impact: 20 }),
      makeRule({ id: "r2", operator: "ai_evaluation", column_key: "description", value: "", score_impact: 30 }),
    ];

    const result = calculateScore(rules, { industry: "SaaS", description: "Some company" });
    // ai_evaluation should be skipped in sync calculateScore
    expect(result.total).toBe(20);
  });
});

describe("determineTier", () => {
  const thresholds: ThresholdConfig = {
    ignored: 0,
    cold: 20,
    warm: 40,
    hot: 70,
    priority: 85,
  };

  it("returns ignored for score 0", () => {
    expect(determineTier(0, thresholds)).toBe("ignored");
  });

  it("returns ignored for score below cold", () => {
    expect(determineTier(15, thresholds)).toBe("ignored");
  });

  it("returns cold for score at cold threshold", () => {
    expect(determineTier(20, thresholds)).toBe("cold");
  });

  it("returns cold for score between cold and warm", () => {
    expect(determineTier(35, thresholds)).toBe("cold");
  });

  it("returns warm for score at warm threshold", () => {
    expect(determineTier(40, thresholds)).toBe("warm");
  });

  it("returns warm for score between warm and hot", () => {
    expect(determineTier(60, thresholds)).toBe("warm");
  });

  it("returns hot for score at hot threshold", () => {
    expect(determineTier(70, thresholds)).toBe("hot");
  });

  it("returns hot for score between hot and priority", () => {
    expect(determineTier(80, thresholds)).toBe("hot");
  });

  it("returns priority for score at priority threshold", () => {
    expect(determineTier(85, thresholds)).toBe("priority");
  });

  it("returns priority for score above priority", () => {
    expect(determineTier(100, thresholds)).toBe("priority");
  });

  it("handles negative scores", () => {
    expect(determineTier(-10, thresholds)).toBe("ignored");
  });

  it("handles custom thresholds", () => {
    const custom: ThresholdConfig = {
      ignored: 0,
      cold: 10,
      warm: 30,
      hot: 50,
      priority: 75,
    };
    expect(determineTier(45, custom)).toBe("warm");
    expect(determineTier(50, custom)).toBe("hot");
    expect(determineTier(76, custom)).toBe("priority");
  });
});
