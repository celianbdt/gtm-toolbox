// ── Strat → Ops Bridge ──
// Analyzes completed strategy sessions and proposes an ops table configuration.

import { generateObject } from "ai";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropicForWorkspace } from "@/lib/ai/provider";
import { getBridgePrompt } from "./prompts";
import type { BridgeProposal } from "./types";

// Zod schema matching BridgeProposal type
const waterfallStepSchema = z.object({
  provider: z.enum([
    "apollo", "icypeas", "fullenrich", "dropcontact", "datagma",
    "hunter", "clearbit", "proxycurl", "brandfetch", "builtwith",
    "wappalyzer", "firecrawl", "serper",
  ]),
  fields: z.array(z.string()),
  timeout_ms: z.number().optional(),
});

const columnConfigSchema = z.union([
  z.object({
    source: z.enum([
      "crunchbase", "proxycurl", "linkedin_jobs", "snitcher", "newsapi",
      "csv_import", "crm_import", "manual", "strat_bridge",
    ]),
    filters: z.record(z.string(), z.unknown()).default({}),
    schedule: z.string().optional(),
  }),
  z.object({
    waterfall: z.array(waterfallStepSchema).min(1),
    cache_ttl_days: z.number().default(30),
    min_score_threshold: z.number().optional(),
  }),
  z.object({
    prompt: z.string(),
    model: z.string().default("claude-haiku-4-5"),
    output_type: z.enum(["text", "number", "boolean", "json"]),
    max_tokens: z.number().optional(),
  }),
  z.object({
    expression: z.string(),
    output_type: z.enum(["number", "text", "boolean"]),
  }),
  z.record(z.string(), z.unknown()),
]);

const templateColumnSchema = z.object({
  name: z.string(),
  key: z.string().regex(/^[a-z0-9_]+$/),
  column_type: z.enum(["signal_input", "enricher", "ai_column", "formula", "static"]),
  position: z.number().int().min(0),
  config: columnConfigSchema,
  is_visible: z.boolean().default(true),
});

const scoringRuleSchema = z.object({
  id: z.string(),
  label: z.string(),
  column_key: z.string(),
  operator: z.enum([
    "equals", "not_equals", "contains", "not_contains",
    "greater_than", "less_than", "within_days",
    "matches_list", "is_empty", "is_not_empty", "ai_evaluation",
  ]),
  value: z.union([z.string(), z.number(), z.array(z.string())]),
  score_impact: z.number(),
  ai_prompt: z.string().optional(),
});

const bridgeProposalSchema = z.object({
  source_session_id: z.string(),
  source_tool_id: z.string(),
  proposed_table_name: z.string().min(1).max(200),
  proposed_columns: z.array(templateColumnSchema).min(1),
  proposed_scoring: z.object({
    rules: z.array(scoringRuleSchema),
    thresholds: z.object({
      ignored: z.number(),
      cold: z.number(),
      warm: z.number(),
      hot: z.number(),
      priority: z.number(),
    }),
  }),
  proposed_settings: z.object({
    enrichment_threshold: z.number(),
    daily_signal_limit: z.number(),
    auto_enrich: z.boolean(),
  }),
  rationale: z.string(),
});

export async function generateBridgeProposal(
  sessionId: string,
  workspaceId: string
): Promise<BridgeProposal> {
  const supabase = createAdminClient();

  // 1. Fetch the tool session
  const { data: session, error: sessionError } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (sessionError) throw sessionError;

  const toolId: string = session.tool_id;

  // 2. Fetch session outputs
  const { data: outputs, error: outputsError } = await supabase
    .from("session_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (outputsError) throw outputsError;

  if (!outputs || outputs.length === 0) {
    throw new Error("No session outputs found — cannot generate bridge proposal");
  }

  // 3. Build the prompt
  const prompt = getBridgePrompt(toolId, outputs);

  // 4. Generate structured proposal
  const anthropic = await getAnthropicForWorkspace(workspaceId);
  const { object } = await generateObject({
    model: anthropic("claude-sonnet-4-5") as Parameters<typeof generateObject>[0]["model"],
    schema: bridgeProposalSchema,
    prompt: `${prompt}

IMPORTANT: You must return a valid ops table configuration. Use these exact values:
- source_session_id: "${sessionId}"
- source_tool_id: "${toolId}"

Generate a table name, columns (with proper column_type and config), scoring rules with unique IDs, thresholds, settings, and a brief rationale explaining why this table configuration will help operationalize the strategy insights.

Each column key must be lowercase with underscores only. Each scoring rule ID must be a unique slug like "industry-match" or "funding-high".`,
  });

  return object as BridgeProposal;
}
