import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WhitelistPanel } from "@/components/workspace/whitelist-panel";
import { DashboardContent } from "@/components/dashboard/dashboard-content";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";

/** Return the Monday of the current week (ISO) as YYYY-MM-DD */
function currentMonday(): string {
  const now = new Date();
  const day = now.getDay(); // 0=Sun
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  return monday.toISOString().slice(0, 10);
}

export default async function WorkspacesPage() {
  const supabase = await createClient();
  let enrichedWorkspaces: WorkspaceWithMeta[] = [];
  let isSuperAdmin = false;

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // 1. Get workspace IDs the user belongs to
      const { data: members } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      const wsIds = members?.map((m) => m.workspace_id) ?? [];

      if (wsIds.length > 0) {
        const weekDate = currentMonday();

        // 2. Batch: fetch workspaces + all tasks + all metrics in parallel
        const [wsResult, tasksResult, metricsResult, defsResult, adminResult] =
          await Promise.all([
            supabase
              .from("workspaces")
              .select("*")
              .in("id", wsIds)
              .order("created_at", { ascending: true }),
            supabase
              .from("tasks")
              .select("id, workspace_id, status, title, due_date, position")
              .in("workspace_id", wsIds),
            supabase
              .from("workspace_metrics")
              .select("workspace_id, metric_name, metric_value")
              .in("workspace_id", wsIds)
              .eq("week_date", weekDate),
            supabase
              .from("workspace_metric_definitions")
              .select("workspace_id, metric_name, label, unit")
              .in("workspace_id", wsIds),
            // Check superadmin in parallel
            (async () => {
              const admin = createAdminClient();
              const { data: profile } = await admin
                .from("user_profiles")
                .select("app_role")
                .eq("id", user.id)
                .single();
              return profile?.app_role === "superadmin";
            })(),
          ]);

        isSuperAdmin = adminResult;
        const workspaces = wsResult.data ?? [];
        const allTasks = tasksResult.data ?? [];
        const allMetrics = metricsResult.data ?? [];
        const allDefs = defsResult.data ?? [];

        // 3. Group data by workspace in memory (no more N×3 queries)
        const tasksByWs = new Map<string, typeof allTasks>();
        for (const t of allTasks) {
          const arr = tasksByWs.get(t.workspace_id) ?? [];
          arr.push(t);
          tasksByWs.set(t.workspace_id, arr);
        }

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

        const metricsByWs = new Map<string, typeof allMetrics>();
        for (const m of allMetrics) {
          const arr = metricsByWs.get(m.workspace_id) ?? [];
          arr.push(m);
          metricsByWs.set(m.workspace_id, arr);
        }

        enrichedWorkspaces = workspaces.map((ws) => {
          // Metrics
          const wsDefs = defsByWs.get(ws.id);
          const wsMetrics = metricsByWs.get(ws.id) ?? [];
          const metrics = wsMetrics
            .filter((m) => wsDefs?.has(m.metric_name))
            .map((m) => ({
              metric_name: m.metric_name,
              label: wsDefs!.get(m.metric_name)!.label,
              value: Number(m.metric_value),
              unit: wsDefs!.get(m.metric_name)!.unit,
            }));

          // Tasks
          const wsTasks = tasksByWs.get(ws.id) ?? [];
          const total = wsTasks.length;
          const blocked = wsTasks.filter((t) => t.status === "blocked").length;
          const doneThisWeek = wsTasks.filter(
            (t) => t.status === "done"
          ).length;

          // Next task
          const todoTasks = wsTasks
            .filter((t) => t.status === "todo")
            .sort((a, b) => a.position - b.position);
          const next =
            todoTasks.length > 0
              ? {
                  title: todoTasks[0].title,
                  due_date: todoTasks[0].due_date ?? null,
                }
              : null;

          return {
            id: ws.id,
            name: ws.name,
            slug: ws.slug,
            description: ws.description ?? null,
            color: ws.color ?? "#7C3AED",
            logo_url: ws.logo_url ?? null,
            mission_stage: ws.mission_stage ?? "discovery",
            status: ws.status ?? "active",
            priority: ws.priority ?? "normal",
            created_at: ws.created_at,
            updated_at: ws.updated_at,
            metrics,
            task_summary: { total, blocked, done_this_week: doneThisWeek },
            next_task: next,
          } satisfies WorkspaceWithMeta;
        });
      } else {
        // No workspaces, still check superadmin
        const admin = createAdminClient();
        const { data: profile } = await admin
          .from("user_profiles")
          .select("app_role")
          .eq("id", user.id)
          .single();
        isSuperAdmin = profile?.app_role === "superadmin";
      }
    }
  } catch {
    // Tables not yet created — graceful fallback
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Dashboard</h2>
          <p className="text-sm text-muted-foreground">
            Vue d&apos;ensemble de vos workspaces et taches.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>

      <DashboardContent workspaces={enrichedWorkspaces} />

      {isSuperAdmin && (
        <div className="mt-10">
          <WhitelistPanel />
        </div>
      )}
    </div>
  );
}
