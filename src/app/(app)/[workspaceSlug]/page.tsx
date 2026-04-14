import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { StageBadge } from "@/components/workspace/stage-badge";
import { WorkspaceChat } from "@/components/workspace-chat/workspace-chat";

export default async function WorkspaceDashboard({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("*")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) redirect("/workspaces");

  return (
    <WorkspaceProvider workspace={workspace}>
      <div className="flex-1 p-6 flex flex-col">
        <div className="mb-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold">{workspace.name}</h2>
            {workspace.mission_stage && (
              <StageBadge stage={workspace.mission_stage} />
            )}
          </div>
          {workspace.description && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {workspace.description}
            </p>
          )}
        </div>

        <div className="flex-1">
          <WorkspaceChat
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          />
        </div>
      </div>
    </WorkspaceProvider>
  );
}
