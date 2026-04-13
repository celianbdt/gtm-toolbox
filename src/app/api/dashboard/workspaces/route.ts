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

    // Compute start of current week (Monday)
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = day === 0 ? 6 : day - 1;
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - diffToMonday);
    weekStart.setHours(0, 0, 0, 0);
    const weekStartISO = weekStart.toISOString();

    // Batch: fetch all data in parallel (4 queries total instead of N×6)
    const [wsResult, tasksResult, metricsResult, defsResult] =
      await Promise.all([
        admin
          .from("workspaces")
          .select(
            "id, name, slug, description, color, logo_url, mission_stage, status, priority, created_at, updated_at"
          )
          .in("id", workspaceIds),
        admin
          .from("tasks")
          .select("id, workspace_id, status, title, due_date, position, updated_at")
          .in("workspace_id", workspaceIds),
        admin
          .from("workspace_metrics")
          .select("workspace_id, metric_name, metric_value, week_date")
          .in("workspace_id", workspaceIds)
          .order("week_date", { ascending: false }),
        admin
          .from("workspace_metric_definitions")
          .select("workspace_id, metric_name, label, unit")
          .in("workspace_id", workspaceIds),
      ]);

    if (wsResult.error) {
      console.error("Failed to fetch workspaces:", wsResult.error);
      return NextResponse.json(
        { error: "Failed to fetch workspaces" },
        { status: 500 }
      );
    }

    const workspaces = wsResult.data ?? [];
    if (workspaces.length === 0) {
      return NextResponse.json({ workspaces: [] });
    }

    const allTasks = tasksResult.data ?? [];
    const allMetrics = metricsResult.data ?? [];
    const allDefs = defsResult.data ?? [];

    // Group tasks by workspace
    const tasksByWs = new Map<string, typeof allTasks>();
    for (const t of allTasks) {
      const arr = tasksByWs.get(t.workspace_id) ?? [];
      arr.push(t);
      tasksByWs.set(t.workspace_id, arr);
    }

    // Group metric definitions by workspace
    const defsByWs = new Map<
      string,
      Map<string, { label: string; unit: string }>
    >();
    for (const d of allDefs) {
      if (!defsByWs.has(d.workspace_id))
        defsByWs.set(d.workspace_id, new Map());
      defsByWs.get(d.workspace_id)!.set(d.metric_name, {
        label: d.label,
        unit: d.unit || "",
      });
    }

    // Group metrics by workspace, keeping only latest week per workspace
    const latestMetricsByWs = new Map<
      string,
      { metric_name: string; metric_value: number }[]
    >();
    const latestWeekByWs = new Map<string, string>();
    for (const m of allMetrics) {
      const existingWeek = latestWeekByWs.get(m.workspace_id);
      if (!existingWeek) {
        latestWeekByWs.set(m.workspace_id, m.week_date);
      }
      // Only keep metrics from the latest week for each workspace
      if (m.week_date === (latestWeekByWs.get(m.workspace_id) ?? m.week_date)) {
        const arr = latestMetricsByWs.get(m.workspace_id) ?? [];
        arr.push({
          metric_name: m.metric_name,
          metric_value: Number(m.metric_value),
        });
        latestMetricsByWs.set(m.workspace_id, arr);
      }
    }

    // Build enriched workspaces
    const enrichedWorkspaces: WorkspaceWithMeta[] = workspaces.map((ws) => {
      // Metrics
      const wsDefs = defsByWs.get(ws.id);
      const wsMetrics = latestMetricsByWs.get(ws.id) ?? [];
      const metrics = wsMetrics
        .filter((m) => wsDefs?.has(m.metric_name))
        .map((m) => ({
          metric_name: m.metric_name,
          label: wsDefs!.get(m.metric_name)!.label,
          value: m.metric_value,
          unit: wsDefs!.get(m.metric_name)!.unit,
        }));

      // Tasks
      const wsTasks = tasksByWs.get(ws.id) ?? [];
      const total = wsTasks.length;
      const blocked = wsTasks.filter((t) => t.status === "blocked").length;
      const doneThisWeek = wsTasks.filter(
        (t) =>
          t.status === "done" &&
          new Date(t.updated_at) >= new Date(weekStartISO)
      ).length;

      // Next task
      const todoTasks = wsTasks
        .filter((t) => t.status === "todo")
        .sort((a, b) => a.position - b.position);
      const next =
        todoTasks.length > 0
          ? {
              title: todoTasks[0].title,
              due_date: todoTasks[0].due_date,
            }
          : null;

      return {
        id: ws.id,
        name: ws.name,
        slug: ws.slug,
        description: ws.description,
        color: ws.color,
        logo_url: ws.logo_url,
        mission_stage: ws.mission_stage ?? "discovery",
        status: ws.status,
        priority: ws.priority,
        created_at: ws.created_at,
        updated_at: ws.updated_at,
        metrics,
        task_summary: { total, blocked, done_this_week: doneThisWeek },
        next_task: next,
      };
    });

    return NextResponse.json({ workspaces: enrichedWorkspaces });
  } catch (error) {
    console.error("Failed to fetch dashboard workspaces:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard workspaces" },
      { status: 500 }
    );
  }
}
