import { describe, it, expect } from "vitest";
import {
  createTableSchema,
  updateTableSchema,
  createColumnSchema,
  updateColumnSchema,
  createRowSchema,
  updateRowSchema,
  bulkImportSchema,
  scoringRuleSchema,
  scoringConfigSchema,
  thresholdConfigSchema,
  tableSettingsSchema,
  createAutomationSchema,
  updateAutomationSchema,
  triggerEnrichmentSchema,
  rowsQuerySchema,
  signalInputConfigSchema,
  enricherColumnConfigSchema,
  aiColumnConfigSchema,
  formulaColumnConfigSchema,
  waterfallStepSchema,
} from "@/lib/ops-engine/schemas";

describe("Ops Engine Schemas — Table CRUD", () => {
  it("validates a correct createTable payload", () => {
    const result = createTableSchema.safeParse({
      workspace_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Funding Targets Q1",
      description: "Track recent Series A companies in France",
    });
    expect(result.success).toBe(true);
  });

  it("rejects createTable without workspace_id", () => {
    const result = createTableSchema.safeParse({ name: "Test" });
    expect(result.success).toBe(false);
  });

  it("rejects createTable with empty name", () => {
    const result = createTableSchema.safeParse({
      workspace_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "",
    });
    expect(result.success).toBe(false);
  });

  it("validates createTable with scoring config", () => {
    const result = createTableSchema.safeParse({
      workspace_id: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test Table",
      scoring_config: {
        rules: [{
          id: "rule-1",
          label: "Industry match",
          column_key: "industry",
          operator: "matches_list",
          value: ["SaaS", "Fintech"],
          score_impact: 20,
        }],
        thresholds: { ignored: 0, cold: 20, warm: 40, hot: 70, priority: 85 },
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates updateTable with partial fields", () => {
    const result = updateTableSchema.safeParse({
      name: "Updated Name",
      is_active: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Columns", () => {
  it("validates a static column", () => {
    const result = createColumnSchema.safeParse({
      name: "Company Name",
      key: "company_name",
      column_type: "static",
    });
    expect(result.success).toBe(true);
  });

  it("validates an enricher column", () => {
    const result = createColumnSchema.safeParse({
      name: "Contact Email",
      key: "contact_email",
      column_type: "enricher",
      config: {
        waterfall: [
          { provider: "apollo", fields: ["email"] },
          { provider: "hunter", fields: ["email"] },
        ],
        cache_ttl_days: 30,
      },
    });
    expect(result.success).toBe(true);
  });

  it("rejects column with invalid key format", () => {
    const result = createColumnSchema.safeParse({
      name: "Bad Key",
      key: "Bad-Key-Here",
      column_type: "static",
    });
    expect(result.success).toBe(false);
  });

  it("rejects column with uppercase key", () => {
    const result = createColumnSchema.safeParse({
      name: "Bad Key",
      key: "BadKey",
      column_type: "static",
    });
    expect(result.success).toBe(false);
  });

  it("validates column key with underscores", () => {
    const result = createColumnSchema.safeParse({
      name: "Funding Amount",
      key: "funding_amount",
      column_type: "static",
    });
    expect(result.success).toBe(true);
  });

  it("validates update with partial fields", () => {
    const result = updateColumnSchema.safeParse({
      name: "Renamed Column",
      is_visible: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Rows", () => {
  it("validates a minimal row", () => {
    const result = createRowSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  it("validates a full row", () => {
    const result = createRowSchema.safeParse({
      domain: "acme.com",
      data: { company_name: "Acme Inc", industry: "SaaS", employee_count: 50 },
      source: "crunchbase",
      source_meta: { round_type: "series_a", funding_amount: 5000000 },
    });
    expect(result.success).toBe(true);
  });

  it("rejects row with invalid source", () => {
    const result = createRowSchema.safeParse({
      source: "invalid_source",
    });
    expect(result.success).toBe(false);
  });

  it("validates bulk import", () => {
    const result = bulkImportSchema.safeParse({
      rows: [
        { company_name: "Acme", domain: "acme.com" },
        { company_name: "Beta", domain: "beta.io" },
      ],
      source: "csv_import",
      domain_column: "domain",
    });
    expect(result.success).toBe(true);
  });

  it("rejects bulk import with empty rows", () => {
    const result = bulkImportSchema.safeParse({ rows: [] });
    expect(result.success).toBe(false);
  });

  it("validates update row", () => {
    const result = updateRowSchema.safeParse({
      data: { company_name: "Updated Name" },
      status: "scored",
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Scoring", () => {
  it("validates a scoring rule", () => {
    const result = scoringRuleSchema.safeParse({
      id: "rule-funding",
      label: "Recent funding",
      column_key: "funding_date",
      operator: "within_days",
      value: 90,
      score_impact: 25,
    });
    expect(result.success).toBe(true);
  });

  it("validates scoring rule with ai_evaluation", () => {
    const result = scoringRuleSchema.safeParse({
      id: "rule-ai",
      label: "AI ICP match",
      column_key: "company_description",
      operator: "ai_evaluation",
      value: "",
      score_impact: 30,
      ai_prompt: "Does this company match our ICP for B2B SaaS?",
    });
    expect(result.success).toBe(true);
  });

  it("validates full scoring config", () => {
    const result = scoringConfigSchema.safeParse({
      rules: [
        { id: "r1", label: "Industry", column_key: "industry", operator: "matches_list", value: ["SaaS"], score_impact: 20 },
        { id: "r2", label: "Size", column_key: "employee_count", operator: "greater_than", value: 10, score_impact: 15 },
      ],
      thresholds: { ignored: 0, cold: 20, warm: 40, hot: 70, priority: 85 },
    });
    expect(result.success).toBe(true);
  });

  it("applies defaults when no rules provided", () => {
    const result = scoringConfigSchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.rules).toEqual([]);
      expect(result.data.thresholds.hot).toBe(70);
    }
  });

  it("validates threshold config", () => {
    const result = thresholdConfigSchema.safeParse({
      ignored: 0,
      cold: 15,
      warm: 35,
      hot: 60,
      priority: 80,
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Column Configs", () => {
  it("validates signal input config", () => {
    const result = signalInputConfigSchema.safeParse({
      source: "crunchbase",
      filters: { country: "FR", round_type: "series_a" },
    });
    expect(result.success).toBe(true);
  });

  it("validates waterfall step", () => {
    const result = waterfallStepSchema.safeParse({
      provider: "apollo",
      fields: ["email", "phone"],
      timeout_ms: 10000,
    });
    expect(result.success).toBe(true);
  });

  it("validates enricher column config", () => {
    const result = enricherColumnConfigSchema.safeParse({
      waterfall: [
        { provider: "apollo", fields: ["email"] },
        { provider: "hunter", fields: ["email"] },
      ],
      cache_ttl_days: 30,
    });
    expect(result.success).toBe(true);
  });

  it("rejects enricher with empty waterfall", () => {
    const result = enricherColumnConfigSchema.safeParse({
      waterfall: [],
      cache_ttl_days: 30,
    });
    expect(result.success).toBe(false);
  });

  it("validates AI column config", () => {
    const result = aiColumnConfigSchema.safeParse({
      prompt: "Score ICP fit from 0-100 for {company_name}",
      model: "claude-haiku-4-5",
      output_type: "number",
    });
    expect(result.success).toBe(true);
  });

  it("rejects AI column with empty prompt", () => {
    const result = aiColumnConfigSchema.safeParse({
      prompt: "",
      output_type: "text",
    });
    expect(result.success).toBe(false);
  });

  it("validates formula config", () => {
    const result = formulaColumnConfigSchema.safeParse({
      expression: "funding_score + activity_score",
      output_type: "number",
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Automations", () => {
  it("validates slack automation", () => {
    const result = createAutomationSchema.safeParse({
      name: "Slack Hot Alert",
      automation_type: "slack_webhook",
      trigger_tier: "hot",
      config: {
        webhook_url: "https://hooks.slack.com/services/xxx",
        message_template: "New hot lead: {{company_name}}",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates hubspot push automation", () => {
    const result = createAutomationSchema.safeParse({
      name: "HubSpot Push Priority",
      automation_type: "hubspot_push",
      trigger_tier: "priority",
      config: {
        access_token: "pat-xxx",
        pipeline_id: "p1",
        stage_id: "s1",
      },
    });
    expect(result.success).toBe(true);
  });

  it("validates update automation", () => {
    const result = updateAutomationSchema.safeParse({
      is_active: false,
    });
    expect(result.success).toBe(true);
  });
});

describe("Ops Engine Schemas — Enrichment & Query", () => {
  it("validates enrichment trigger by IDs", () => {
    const result = triggerEnrichmentSchema.safeParse({
      row_ids: ["123e4567-e89b-12d3-a456-426614174000"],
    });
    expect(result.success).toBe(true);
  });

  it("validates enrichment trigger for all rows", () => {
    const result = triggerEnrichmentSchema.safeParse({
      all: true,
      tier_filter: "warm",
    });
    expect(result.success).toBe(true);
  });

  it("validates rows query params", () => {
    const result = rowsQuerySchema.safeParse({
      page: "2",
      limit: "25",
      sort: "score_total",
      order: "desc",
      tier: "hot",
    });
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(2);
      expect(result.data.limit).toBe(25);
    }
  });

  it("applies defaults for rows query", () => {
    const result = rowsQuerySchema.safeParse({});
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.page).toBe(1);
      expect(result.data.limit).toBe(50);
      expect(result.data.order).toBe("desc");
    }
  });

  it("rejects invalid tier filter", () => {
    const result = rowsQuerySchema.safeParse({ tier: "invalid" });
    expect(result.success).toBe(false);
  });
});
