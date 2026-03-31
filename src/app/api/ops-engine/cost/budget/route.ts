import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const DEFAULT_BUDGET = {
  monthly_enrichment_limit: 500,
  alert_threshold_pct: 80,
};

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

  try {
    const supabase = createAdminClient();
    const { data: workspace, error } = await supabase
      .from("workspaces")
      .select("api_keys")
      .eq("id", workspaceId)
      .single();

    if (error || !workspace) {
      return NextResponse.json(
        { error: "Workspace not found" },
        { status: 404 }
      );
    }

    const apiKeys = (workspace.api_keys ?? {}) as Record<string, unknown>;
    const budgetConfig = (apiKeys.ops_budget ?? DEFAULT_BUDGET) as Record<
      string,
      number
    >;

    return NextResponse.json({
      monthly_enrichment_limit:
        budgetConfig.monthly_enrichment_limit ??
        DEFAULT_BUDGET.monthly_enrichment_limit,
      alert_threshold_pct:
        budgetConfig.alert_threshold_pct ??
        DEFAULT_BUDGET.alert_threshold_pct,
    });
  } catch (error) {
    console.error("Failed to fetch budget config:", error);
    return NextResponse.json(
      { error: "Failed to fetch budget config" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { workspace_id, monthly_enrichment_limit, alert_threshold_pct } =
      body;

    if (!workspace_id) {
      return NextResponse.json(
        { error: "workspace_id is required" },
        { status: 400 }
      );
    }

    if (
      typeof monthly_enrichment_limit !== "number" ||
      monthly_enrichment_limit < 0
    ) {
      return NextResponse.json(
        { error: "monthly_enrichment_limit must be a positive number" },
        { status: 400 }
      );
    }

    if (
      typeof alert_threshold_pct !== "number" ||
      alert_threshold_pct < 0 ||
      alert_threshold_pct > 100
    ) {
      return NextResponse.json(
        { error: "alert_threshold_pct must be between 0 and 100" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();

    // Read current api_keys
    const { data: workspace } = await supabase
      .from("workspaces")
      .select("api_keys")
      .eq("id", workspace_id)
      .single();

    const currentKeys = (workspace?.api_keys ?? {}) as Record<string, unknown>;

    const updatedKeys = {
      ...currentKeys,
      ops_budget: {
        monthly_enrichment_limit,
        alert_threshold_pct,
      },
    };

    const { error } = await supabase
      .from("workspaces")
      .update({ api_keys: updatedKeys })
      .eq("id", workspace_id);

    if (error) {
      console.error("Failed to update budget config:", error);
      return NextResponse.json(
        { error: "Failed to update budget config" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      monthly_enrichment_limit,
      alert_threshold_pct,
    });
  } catch (error) {
    console.error("Failed to update budget config:", error);
    return NextResponse.json(
      { error: "Failed to update budget config" },
      { status: 500 }
    );
  }
}
