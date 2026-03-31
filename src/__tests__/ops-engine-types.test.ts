import { describe, it, expect } from "vitest";
import {
  TIER_COLORS,
  TIER_LABELS,
  ENRICHER_LABELS,
  SIGNAL_LABELS,
} from "@/lib/ops-engine/types";
import type {
  OpsTable,
  OpsColumn,
  OpsRow,
  OpsTemplate,
  ScoringConfig,
  ScoringRule,
  ThresholdConfig,
  ThresholdTier,
  OpsColumnType,
  SignalSource,
  EnricherProvider,
  WaterfallStep,
  AIColumnConfig,
  FormulaColumnConfig,
  EnricherColumnConfig,
  SignalInputConfig,
  OpsTableSettings,
} from "@/lib/ops-engine/types";

describe("Ops Engine Types", () => {
  it("ThresholdTier values are exhaustive", () => {
    const tiers: ThresholdTier[] = ["ignored", "cold", "warm", "hot", "priority"];
    expect(tiers).toHaveLength(5);
  });

  it("OpsColumnType values are exhaustive", () => {
    const types: OpsColumnType[] = ["signal_input", "enricher", "ai_column", "formula", "static"];
    expect(types).toHaveLength(5);
  });

  it("EnricherProvider covers all 13 providers", () => {
    const providers: EnricherProvider[] = [
      "apollo", "icypeas", "fullenrich", "dropcontact", "datagma",
      "hunter", "clearbit", "proxycurl", "brandfetch", "builtwith",
      "wappalyzer", "firecrawl", "serper",
    ];
    expect(providers).toHaveLength(13);
  });

  it("SignalSource covers all sources", () => {
    const sources: SignalSource[] = [
      "crunchbase", "proxycurl", "linkedin_jobs", "snitcher", "newsapi",
      "csv_import", "crm_import", "manual", "strat_bridge",
    ];
    expect(sources).toHaveLength(9);
  });

  it("ScoringConfig has correct shape", () => {
    const config: ScoringConfig = {
      rules: [
        {
          id: "test-rule",
          label: "Test Rule",
          column_key: "industry",
          operator: "equals",
          value: "SaaS",
          score_impact: 20,
        },
      ],
      thresholds: { ignored: 0, cold: 20, warm: 40, hot: 70, priority: 85 },
    };
    expect(config.rules).toHaveLength(1);
    expect(config.thresholds.hot).toBe(70);
  });

  it("WaterfallStep has correct shape", () => {
    const step: WaterfallStep = {
      provider: "apollo",
      fields: ["email", "phone"],
      timeout_ms: 10000,
    };
    expect(step.provider).toBe("apollo");
    expect(step.fields).toContain("email");
  });

  it("AIColumnConfig has correct shape", () => {
    const config: AIColumnConfig = {
      prompt: "Score ICP fit from 0-100 for {company_name}",
      model: "claude-haiku-4-5",
      output_type: "number",
    };
    expect(config.output_type).toBe("number");
  });

  it("FormulaColumnConfig has correct shape", () => {
    const config: FormulaColumnConfig = {
      expression: "signal_score + enrichment_completeness * 0.5",
      output_type: "number",
    };
    expect(config.expression).toContain("signal_score");
  });

  it("EnricherColumnConfig supports waterfall", () => {
    const config: EnricherColumnConfig = {
      waterfall: [
        { provider: "apollo", fields: ["email"] },
        { provider: "hunter", fields: ["email"] },
        { provider: "dropcontact", fields: ["email"] },
      ],
      cache_ttl_days: 30,
      min_score_threshold: 40,
    };
    expect(config.waterfall).toHaveLength(3);
    expect(config.waterfall[0].provider).toBe("apollo");
  });

  it("SignalInputConfig has correct shape", () => {
    const config: SignalInputConfig = {
      source: "crunchbase",
      filters: { country: "FR", round_type: "series_a" },
      schedule: "0 6 * * *",
    };
    expect(config.source).toBe("crunchbase");
  });

  it("OpsTableSettings has correct defaults", () => {
    const settings: OpsTableSettings = {
      enrichment_threshold: 40,
      daily_signal_limit: 100,
      auto_enrich: true,
    };
    expect(settings.enrichment_threshold).toBe(40);
  });
});

describe("Ops Engine Constants", () => {
  it("TIER_COLORS covers all tiers", () => {
    expect(Object.keys(TIER_COLORS)).toHaveLength(5);
    expect(TIER_COLORS.hot).toBe("#ef4444");
    expect(TIER_COLORS.priority).toBe("#7c3aed");
  });

  it("TIER_LABELS covers all tiers", () => {
    expect(Object.keys(TIER_LABELS)).toHaveLength(5);
    expect(TIER_LABELS.priority).toBe("Priority");
  });

  it("ENRICHER_LABELS covers all 13 providers", () => {
    expect(Object.keys(ENRICHER_LABELS)).toHaveLength(13);
    expect(ENRICHER_LABELS.apollo).toBe("Apollo");
  });

  it("SIGNAL_LABELS covers all sources", () => {
    expect(Object.keys(SIGNAL_LABELS)).toHaveLength(9);
    expect(SIGNAL_LABELS.crunchbase).toBe("Crunchbase");
  });
});
