import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { upsertMetricsSchema } from "@/lib/project/schemas";
import { getMetrics, upsertMetrics } from "@/lib/project/db";

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
    const weeksParam = request.nextUrl.searchParams.get("weeks");
    const weeks = weeksParam ? parseInt(weeksParam, 10) : 4;

    const metrics = await getMetrics(workspaceId, weeks);
    return NextResponse.json({ metrics });
  } catch (error) {
    console.error("Failed to get metrics:", error);
    return NextResponse.json(
      { error: "Failed to get metrics" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = upsertMetricsSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await upsertMetrics(
      parsed.data.workspace_id,
      parsed.data.week_date,
      parsed.data.metrics
    );
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to upsert metrics:", error);
    return NextResponse.json(
      { error: "Failed to upsert metrics" },
      { status: 500 }
    );
  }
}
