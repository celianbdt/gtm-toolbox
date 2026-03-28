import { createClient } from "@/lib/supabase/server";
import { WorkspaceCards } from "@/components/workspace/workspace-cards";
import { CreateWorkspaceDialog } from "@/components/workspace/create-workspace-dialog";

export default async function WorkspacesPage() {
  const supabase = await createClient();
  let workspaces: { id: string; name: string; slug: string; description: string | null; color: string }[] = [];

  try {
    const { data } = await supabase
      .from("workspaces")
      .select("*")
      .order("created_at", { ascending: true });
    workspaces = data ?? [];
  } catch {
    // Tables not yet created — run the migration
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
    </div>
  );
}
