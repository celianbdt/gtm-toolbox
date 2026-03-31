import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getMonthlyUsage, checkBudget, getProviderCosts } from "@/lib/ops-engine/cost";
import type { EnricherProvider } from "@/lib/ops-engine/types";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  const monthParam = request.nextUrl.searchParams.get("month");

  try {
    const monthDate = monthParam ? new Date(`${monthParam}-01`) : new Date();
    const monthStr = monthDate.toISOString().slice(0, 7);

    // Fetch data in parallel
    const [providers, budget, cacheSavings] = await Promise.all([
      getMonthlyUsage(workspaceId, monthDate),
      checkBudget(workspaceId),
      estimateCacheSavings(workspaceId, monthStr),
    ]);

    const totalCost = providers.reduce((s, p) => s + p.estimated_cost, 0);
    const totalCalls = providers.reduce((s, p) => s + p.api_calls, 0);

    return NextResponse.json({
      workspace_id: workspaceId,
      month: monthStr,
      budget: {
        within_budget: budget.within_budget,
        used: budget.used,
        limit: budget.limit,
        remaining: budget.remaining,
        usage_pct: budget.limit > 0
          ? Math.round((budget.used / budget.limit) * 1000) / 10
          : 0,
      },
      providers: providers.map((p) => ({
        provider: p.provider,
        api_calls: p.api_calls,
        estimated_cost: p.estimated_cost,
      })),
      total_cost: Math.round(totalCost * 100) / 100,
      total_calls: totalCalls,
      cache_savings_estimate: cacheSavings,
    });
  } catch (error) {
    console.error("Failed to fetch cost data:", error);
    return NextResponse.json(
      { error: "Failed to fetch cost data" },
      { status: 500 }
    );
  }
}

async function estimateCacheSavings(
  workspaceId: string,
  monthStr: string
): Promise<number> {
  const supabase = createAdminClient();
  const providerCosts = getProviderCosts();

  // Count cache hits this month
  const startOfMonth = `${monthStr}-01T00:00:00Z`;
  const endDate = new Date(`${monthStr}-01`);
  endDate.setMonth(endDate.getMonth() + 1);
  const endOfMonth = endDate.toISOString();

  const { count, error } = await supabase
    .from("ops_enrichment_cache")
    .select("*", { count: "exact", head: true })
    .eq("workspace_id", workspaceId)
    .gte("fetched_at", startOfMonth)
    .lt("fetched_at", endOfMonth);

  if (error || count === null) return 0;

  // Average cost across all providers
  const costs = Object.values(providerCosts);
  const avgCost =
    costs.reduce((s, c) => s + c, 0) / costs.filter((c) => c > 0).length;

  return Math.round(count * avgCost * 100) / 100;
}
