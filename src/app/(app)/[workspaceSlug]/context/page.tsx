import { TopBar } from "@/components/layout/top-bar";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";
import type { ContextDocument } from "@/lib/context/types";
import { ContextManager } from "@/components/context/context-manager";

export default async function ContextPage({
  params,
}: {
  params: Promise<{ workspaceSlug: string }>;
}) {
  const { workspaceSlug } = await params;
  const supabase = await createClient();

  const { data: workspace } = await supabase
    .from("workspaces")
    .select("id, name")
    .eq("slug", workspaceSlug)
    .single();

  if (!workspace) notFound();

  const { data: docs } = await supabase
    .from("context_documents")
    .select("*")
    .eq("workspace_id", workspace.id)
    .order("updated_at", { ascending: false });

  return (
    <>
      <TopBar>
        <h1 className="text-sm font-medium">Context</h1>
      </TopBar>
      <div className="flex-1 overflow-y-auto p-6">
        <ContextManager
          workspaceId={workspace.id}
          initialDocs={(docs ?? []) as ContextDocument[]}
        />
      </div>
    </>
  );
}
