import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { WorkspaceCards } from "@/components/workspace/workspace-cards";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";
import { WhitelistPanel } from "@/components/workspace/whitelist-panel";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  let workspaces: { id: string; name: string; slug: string; description: string | null; color: string }[] = [];
  let isSuperAdmin = false;

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
        workspaces = data ?? [];
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
    // Tables not yet created
  }

  return (
    <div className="flex-1 p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Your workspaces</h2>
          <p className="text-sm text-muted-foreground">
            Select a workspace or create a new one to get started.
          </p>
        </div>
        <CreateWorkspaceDialog />
      </div>
      <WorkspaceCards workspaces={workspaces} />

      {isSuperAdmin && (
        <div className="mt-10">
          <WhitelistPanel />
        </div>
      )}
    </div>
  );
}
