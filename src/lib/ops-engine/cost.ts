import { createAdminClient } from "@/lib/supabase/admin";
import type { EnricherProvider, OpsCostEntry } from "./types";

// ── Track an API call ──

export async function trackApiCall(
  workspaceId: string,
  provider: EnricherProvider,
  estimatedCost: number
): Promise<void> {
  const supabase = createAdminClient();
  const month = new Date().toISOString().slice(0, 7); // "YYYY-MM"

  // Try to increment existing row first
  const { data: existing } = await supabase
    .from("ops_cost_tracking")
    .select("id, api_calls, estimated_cost")
    .eq("workspace_id", workspaceId)
    .eq("provider", provider)
    .eq("month", month)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("ops_cost_tracking")
      .update({
        api_calls: existing.api_calls + 1,
        estimated_cost: existing.estimated_cost + estimatedCost,
      })
      .eq("id", existing.id);

    if (error) {
      console.error("[cost] Failed to update cost tracking:", error);
    }
  } else {
    const { error } = await supabase.from("ops_cost_tracking").insert({
      workspace_id: workspaceId,
      month,
      provider,
      api_calls: 1,
      estimated_cost: estimatedCost,
    });

    if (error) {
      console.error("[cost] Failed to insert cost tracking:", error);
    }
  }
}

// ── Get monthly usage ──

export async function getMonthlyUsage(
  workspaceId: string,
  month?: Date
): Promise<OpsCostEntry[]> {
  const supabase = createAdminClient();
  const monthStr = (month ?? new Date()).toISOString().slice(0, 7);

  const { data, error } = await supabase
    .from("ops_cost_tracking")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("month", monthStr)
    .order("estimated_cost", { ascending: false });

  if (error) {
    console.error("[cost] Failed to fetch monthly usage:", error);
    return [];
  }

  return data as OpsCostEntry[];
}

// ── Check budget ──

export async function checkBudget(
  workspaceId: string
): Promise<{
  within_budget: boolean;
  used: number;
  limit: number;
  remaining: number;
}> {
  const supabase = createAdminClient();
  const month = new Date().toISOString().slice(0, 7);

  // Get workspace budget config from api_keys
  const { data: workspace } = await supabase
    .from("workspaces")
    .select("api_keys")
    .eq("id", workspaceId)
    .single();

  const budgetConfig = (workspace?.api_keys as Record<string, unknown>)
    ?.ops_budget as Record<string, number> | undefined;
  const monthlyLimit = budgetConfig?.monthly_enrichment_limit ?? 1000;

  // Sum API calls for current month
  const { data: costs } = await supabase
    .from("ops_cost_tracking")
    .select("api_calls")
    .eq("workspace_id", workspaceId)
    .eq("month", month);

  const totalCalls =
    costs?.reduce((sum, row) => sum + (row.api_calls ?? 0), 0) ?? 0;

  return {
    within_budget: totalCalls < monthlyLimit,
    used: totalCalls,
    limit: monthlyLimit,
    remaining: Math.max(0, monthlyLimit - totalCalls),
  };
}

// ── Get estimated cost per provider ──

export function getProviderCosts(): Record<EnricherProvider, number> {
  return {
    apollo: 0.01,
    icypeas: 0.01,
    fullenrich: 0.01,
    dropcontact: 0.01,
    datagma: 0.02,
    hunter: 0.005,
    clearbit: 0.02,
    proxycurl: 0.01,
    brandfetch: 0,
    builtwith: 0.01,
    wappalyzer: 0,
    firecrawl: 0.001,
    serper: 0.001,
  };
}
