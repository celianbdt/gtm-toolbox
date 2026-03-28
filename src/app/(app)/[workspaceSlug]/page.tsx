import { createClient } from "@/lib/supabase/server";
import { ToolGrid } from "@/components/workspace/tool-grid";

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
        <h2 className="text-lg font-semibold">GTM Tools</h2>
        <p className="text-sm text-muted-foreground">
          Select a tool to start working on your go-to-market strategy.
        </p>
      </div>
      <ToolGrid workspaceSlug={workspaceSlug} />
    </div>
  );
}
