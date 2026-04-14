import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ClientReportBuilder } from "@/components/dashboard/reports/client-report-builder";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";
import { FileBarChart } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default async function ReportsPage() {
  const supabase = await createClient();
  let workspaces: WorkspaceWithMeta[] = [];

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const { data: members } = await supabase
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", user.id);

      const wsIds = members?.map((m) => m.workspace_id) ?? [];
      if (wsIds.length > 0) {
        const { data } = await supabase
          .from("workspaces")
          .select("*")
          .in("id", wsIds)
          .order("created_at", { ascending: true });

        workspaces = (data ?? []).map((ws) => ({
          id: ws.id,
          name: ws.name,
          slug: ws.slug,
          description: ws.description ?? null,
          color: ws.color ?? "#8a6e4e",
          logo_url: ws.logo_url ?? null,
          mission_stage: ws.mission_stage ?? "discovery",
          status: ws.status ?? "active",
          priority: ws.priority ?? "normal",
          created_at: ws.created_at,
          updated_at: ws.updated_at,
          metrics: [],
          task_summary: { total: 0, blocked: 0, done_this_week: 0 },
          next_task: null,
        }));
      }
    }
  } catch {
    // graceful fallback
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center gap-3 mb-6">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/workspaces">
            <ArrowLeft className="size-4 mr-1" />
            Dashboard
          </Link>
        </Button>
        <FileBarChart className="size-5 text-primary" />
        <div>
          <h1 className="text-lg font-semibold">Client Reporting</h1>
          <p className="text-sm text-muted-foreground">
            Genere des rapports client a partir des donnees de tes workspaces.
          </p>
        </div>
      </div>

      <ClientReportBuilder workspaces={workspaces} />
    </div>
  );
}
