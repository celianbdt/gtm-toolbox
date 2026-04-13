import { createClient } from "@/lib/supabase/server";
import { ToolFlow } from "@/components/workspace/tool-flow";
import { StageBadge } from "@/components/workspace/stage-badge";

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

  return (
    <div className="flex-1 p-6">
      <div className="mb-6">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-semibold">{workspace?.name ?? "GTM Tools"}</h2>
          {workspace?.mission_stage && (
            <StageBadge stage={workspace.mission_stage} />
          )}
        </div>
        {workspace?.description ? (
          <p className="text-sm text-muted-foreground mt-0.5">
            {workspace.description}
          </p>
        ) : (
          <p className="text-sm text-muted-foreground mt-0.5">
            Select a tool to start working on your go-to-market strategy.
          </p>
        )}
      </div>
      <ToolFlow workspaceSlug={workspaceSlug} workspaceId={workspace?.id ?? ""} />
    </div>
  );
}
