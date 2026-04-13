import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { WorkspaceProvider } from "@/components/workspace/workspace-provider";
import { OpsLibrary } from "@/components/ops/ops-library";
import { BookmarkCheck } from "lucide-react";

export default async function OpsPage({
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
      <div className="flex-1 p-6">
        <div className="flex items-center gap-2 mb-6">
          <BookmarkCheck className="size-5 text-violet-400" />
          <div>
            <h1 className="text-lg font-semibold">Ops Notes</h1>
            <p className="text-sm text-muted-foreground">
              Signaux, insights et learnings operationnels.
            </p>
          </div>
        </div>

        <OpsLibrary />
      </div>
    </WorkspaceProvider>
  );
}
