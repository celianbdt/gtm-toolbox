import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = auth.user!;
  const supabase = auth.supabase!;
  const admin = createAdminClient();

  try {
    // Get workspace IDs the user is a member of
    const { data: memberships, error: memberError } = await supabase
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", user.id);

    if (memberError) {
      console.error("Failed to fetch memberships:", memberError);
      return NextResponse.json(
        { error: "Failed to fetch memberships" },
        { status: 500 }
      );
    }

    if (!memberships || memberships.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const workspaceIds = memberships.map((m) => m.workspace_id);

    // Fetch workspaces with status and priority
    const { data: workspaces, error: wsError } = await admin
      .from("workspaces")
      .select("id, name, slug, description, color, status, priority, created_at, updated_at")
      .in("id", workspaceIds);

    if (wsError) {
      console.error("Failed to fetch workspaces:", wsError);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      );
    }

    if (!workspaces || workspaces.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    // Compute start of current week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartISO = weekStart.toISOString();

    // Enrich each workspace in parallel
    const results = await Promise.allSettled(
      workspaces.map(async (ws): Promise<WorkspaceWithMeta> => {
        // a. Latest week metrics with labels from definitions
        const [metricsResult, taskSummaryResult, nextTaskResult] = await Promise.all([
          // Metrics: join workspace_metrics with workspace_metric_definitions
          (async () => {
            const { data: definitions } = await admin
              .from("workspace_metric_definitions")
              .select("metric_name, label, unit")
              .eq("workspace_id", ws.id);

            if (!definitions || definitions.length === 0) return [];

            // Get latest week_date for this workspace
            const { data: latestMetric } = await admin
              .from("workspace_metrics")
              .select("week_date")
              .eq("workspace_id", ws.id)
              .order("week_date", { ascending: false })
              .limit(1)
              .single();

            if (!latestMetric) return [];

            const { data: metrics } = await admin
              .from("workspace_metrics")
              .select("metric_name, metric_value")
              .eq("workspace_id", ws.id)
              .eq("week_date", latestMetric.week_date);

            if (!metrics) return [];

            const defMap = new Map(
              definitions.map((d) => [d.metric_name, { label: d.label, unit: d.unit || "" }])
            );

            return metrics
              .filter((m) => defMap.has(m.metric_name))
              .map((m) => ({
                metric_name: m.metric_name,
                label: defMap.get(m.metric_name)!.label,
                value: Number(m.metric_value),
                unit: defMap.get(m.metric_name)!.unit,
              }));
          })(),

          // b. Task summary
          (async () => {
            const { count: total } = await admin
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", ws.id);

            const { count: blocked } = await admin
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", ws.id)
              .eq("status", "blocked");

            const { count: doneThisWeek } = await admin
              .from("tasks")
              .select("*", { count: "exact", head: true })
              .eq("workspace_id", ws.id)
              .eq("status", "done")
              .gte("updated_at", weekStartISO);

            return {
              total: total ?? 0,
              blocked: blocked ?? 0,
              done_this_week: doneThisWeek ?? 0,
            };
          })(),

          // c. Next task (first todo by position)
          (async () => {
            const { data: task } = await admin
              .from("tasks")
              .select("title, due_date")
              .eq("workspace_id", ws.id)
              .eq("status", "todo")
              .order("position", { ascending: true })
              .limit(1)
              .single();

            if (!task) return null;
            return { title: task.title, due_date: task.due_date };
          })(),
        ]);

        return {
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description,
          color: ws.color,
          status: ws.status,
          priority: ws.priority,
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          metrics: metricsResult,
          task_summary: taskSummaryResult,
          next_task: nextTaskResult,
        };
      })
    );

    const enrichedWorkspaces: WorkspaceWithMeta[] = results
      .filter(
        (r): r is PromiseFulfilledResult<WorkspaceWithMeta> =>
          r.status === "fulfilled"
      )
      .map((r) => r.value);

    return NextResponse.json({ workspaces: enrichedWorkspaces });
  } catch (error) {
    console.error("Failed to fetch dashboard workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard workspaces" },
      { status: 500 }
    );
  }
}
