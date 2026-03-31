import { generateObject } from "ai";
import { anthropic } from "@ai-sdk/anthropic";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  getTable,
  updateRow,
  insertScoreHistory,
} from "./db";
import type {
  ScoringRule,
  ScoringConfig,
  ThresholdTier,
  ThresholdConfig,
  OpsRow,
} from "./types";

// ── Evaluate a single rule against row data (sync, non-AI only) ──

export function evaluateRule(
  rule: ScoringRule,
  rowData: Record<string, unknown>
): boolean {
  // AI rules cannot be evaluated synchronously
  if (rule.operator === "ai_evaluation") return false;

  const value = rowData[rule.column_key];

  switch (rule.operator) {
    case "equals":
      return value === rule.value;

    case "not_equals":
      return value !== rule.value;

    case "contains":
      return String(value ?? "")
        .toLowerCase()
        .includes(String(rule.value).toLowerCase());

    case "not_contains":
      return !String(value ?? "")
        .toLowerCase()
        .includes(String(rule.value).toLowerCase());

    case "greater_than":
      return Number(value) > Number(rule.value);

    case "less_than":
      return Number(value) < Number(rule.value);

    case "within_days": {
      if (value === null || value === undefined || value === "") return false;
      const dateValue = new Date(String(value)).getTime();
      if (isNaN(dateValue)) return false;
      const diffDays =
        Math.abs(Date.now() - dateValue) / (1000 * 60 * 60 * 24);
      return diffDays <= Number(rule.value);
    }

    case "matches_list": {
      if (!Array.isArray(rule.value)) return false;
      const strValue = String(value ?? "").toLowerCase();
      return rule.value.some((v) => strValue.includes(v.toLowerCase()));
    }

    case "is_empty":
      return value === null || value === undefined || value === "";

    case "is_not_empty":
      return value !== null && value !== undefined && value !== "";

    default:
      return false;
  }
}

// ── Calculate total score from all rules ──

export function calculateScore(
  rules: ScoringRule[],
  rowData: Record<string, unknown>
): {
  total: number;
  matched_rules: { rule_id: string; label: string; impact: number }[];
} {
  const matched_rules: { rule_id: string; label: string; impact: number }[] =
    [];
  let total = 0;

  for (const rule of rules) {
    // Skip AI rules — they are handled separately in scoreRow
    if (rule.operator === "ai_evaluation") continue;

    if (evaluateRule(rule, rowData)) {
      total += rule.score_impact;
      matched_rules.push({
        rule_id: rule.id,
        label: rule.label,
        impact: rule.score_impact,
      });
    }
  }

  return { total, matched_rules };
}

// ── Determine tier from score ──

export function determineTier(
  score: number,
  thresholds: ThresholdConfig
): ThresholdTier {
  if (score >= thresholds.priority) return "priority";
  if (score >= thresholds.hot) return "hot";
  if (score >= thresholds.warm) return "warm";
  if (score >= thresholds.cold) return "cold";
  return "ignored";
}

// ── Evaluate an AI rule (calls LLM) ──

export async function evaluateAIRule(
  rule: ScoringRule,
  rowData: Record<string, unknown>
): Promise<boolean> {
  const prompt =
    rule.ai_prompt ||
    `Evaluate if this data matches the condition: ${rule.label}`;

  const result = await generateObject({
    model: anthropic("claude-haiku-4-5"),
    schema: z.object({ matches: z.boolean(), reasoning: z.string() }),
    prompt: `${prompt}\n\nData:\n${JSON.stringify(rowData, null, 2)}`,
  });

  return result.object.matches;
}

// ── Score a single row (full pipeline) ──

export async function scoreRow(
  row: OpsRow,
  scoringConfig: ScoringConfig
): Promise<{
  score: number;
  tier: ThresholdTier;
  changed: boolean;
  matched_rules: { rule_id: string; label: string; impact: number }[];
}> {
  const { rules, thresholds } = scoringConfig;

  // Separate AI rules from non-AI rules
  const aiRules = rules.filter((r) => r.operator === "ai_evaluation");
  const nonAiRules = rules.filter((r) => r.operator !== "ai_evaluation");

  // Evaluate all non-AI rules synchronously
  const { total: nonAiTotal, matched_rules } = calculateScore(
    nonAiRules,
    row.data
  );

  // Evaluate AI rules (rate limit: max 3 per row)
  let aiTotal = 0;
  const aiRulesToEvaluate = aiRules.slice(0, 3);

  for (const rule of aiRulesToEvaluate) {
    try {
      const matches = await evaluateAIRule(rule, row.data);
      if (matches) {
        aiTotal += rule.score_impact;
        matched_rules.push({
          rule_id: rule.id,
          label: rule.label,
          impact: rule.score_impact,
        });
      }
    } catch (error) {
      console.error(`AI rule evaluation failed for rule ${rule.id}:`, error);
      // Skip failed AI rules silently
    }
  }

  const score = nonAiTotal + aiTotal;
  const tier = determineTier(score, thresholds);
  const changed = score !== row.score_total || tier !== row.score_tier;

  // Persist changes if score or tier changed
  if (changed) {
    await updateRow(row.id, {
      score_total: score,
      score_tier: tier,
      status: "scored",
    } as Partial<OpsRow>);

    await insertScoreHistory({
      row_id: row.id,
      previous_score: row.score_total,
      new_score: score,
      previous_tier: row.score_tier,
      new_tier: tier,
      reason: `Recalculated: ${matched_rules.length} rules matched`,
      rule_snapshot: { matched_rules },
    });
  }

  return { score, tier, changed, matched_rules };
}

// ── Recalculate all rows in a table ──

export async function recalculateTable(
  tableId: string
): Promise<{
  processed: number;
  changed: number;
  tier_counts: Record<ThresholdTier, number>;
}> {
  const table = await getTable(tableId);
  const scoringConfig = table.scoring_config;

  const supabase = createAdminClient();
  const tier_counts: Record<ThresholdTier, number> = {
    ignored: 0,
    cold: 0,
    warm: 0,
    hot: 0,
    priority: 0,
  };

  let processed = 0;
  let changed = 0;
  let page = 0;
  const batchSize = 100;

  // Fetch rows in batches
  while (true) {
    const from = page * batchSize;
    const to = from + batchSize - 1;

    const { data: rows, error } = await supabase
      .from("ops_rows")
      .select("*")
      .eq("table_id", tableId)
      .range(from, to);

    if (error) throw error;
    if (!rows || rows.length === 0) break;

    for (const row of rows) {
      const result = await scoreRow(row as OpsRow, scoringConfig);
      processed++;
      if (result.changed) changed++;
      tier_counts[result.tier]++;
    }

    if (rows.length < batchSize) break;
    page++;
  }

  return { processed, changed, tier_counts };
}
