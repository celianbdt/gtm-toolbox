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
        // 2. Fetch workspaces with status/priority
        const { data: workspaces } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", wsIds)
          .order("created_at", { ascending: true });

        const weekDate = currentMonday();

        // 3. Enrich each workspace with metrics + tasks
        enrichedWorkspaces = await Promise.all(
          (workspaces ?? []).map(async (ws) => {
            // Metrics for current week
            const { data: metricsData } = await supabase
              .from("workspace_metrics")
              .select(
                "value, workspace_metric_definitions(name, label, unit)"
              )
              .eq("workspace_id", ws.id)
              .eq("week_date", weekDate);

            const metrics = (metricsData ?? []).map((m: Record<string, unknown>) => {
              const def = m.workspace_metric_definitions as
                | { name: string; label: string; unit: string }
                | null;
              return {
                metric_name: def?.name ?? "unknown",
                label: def?.label ?? "",
                value: m.value as number,
                unit: def?.unit ?? "",
              };
            });

            // Task summary: count by status
            const { data: tasks } = await supabase
              .from("tasks")
              .select("id, status")
              .eq("workspace_id", ws.id);

            const allTasks = tasks ?? [];
            const total = allTasks.length;
            const blocked = allTasks.filter(
              (t) => t.status === "blocked"
            ).length;
            // Done this week = tasks whose status is "done" (rough proxy — ideal would be done_at filter)
            const doneThisWeek = allTasks.filter(
              (t) => t.status === "done"
            ).length;

            // Next task: first "todo" by position
            const { data: nextTasks } = await supabase
              .from("tasks")
              .select("title, due_date")
              .eq("workspace_id", ws.id)
              .eq("status", "todo")
              .order("position", { ascending: true })
              .limit(1);

            const next =
              nextTasks && nextTasks.length > 0
                ? {
                    title: nextTasks[0].title,
                    due_date: nextTasks[0].due_date ?? null,
                  }
                : null;

            return {
              id: ws.id,
              name: ws.name,
              slug: ws.slug,
              description: ws.description ?? null,
              color: ws.color ?? "#7C3AED",
              status: ws.status ?? "active",
              priority: ws.priority ?? "normal",
              created_at: ws.created_at,
              updated_at: ws.updated_at,
              metrics,
              task_summary: { total, blocked, done_this_week: doneThisWeek },
              next_task: next,
            } satisfies WorkspaceWithMeta;
          })
        );
      }

      // Check superadmin
      const admin = createAdminClient();
      const { data: profile } = await admin
        .from("user_profiles")
        .select("app_role")
        .eq("id", user.id)
        .single();
      isSuperAdmin = profile?.app_role === "superadmin";
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
