import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { notFound } from "next/navigation";
import { AgentsClient } from "@/components/agents/agents-client";

export default async function AgentsPage({
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

  const admin = createAdminClient();

  const [{ data: templates }, { data: workspaceAgents }] = await Promise.all([
    admin.from("agent_configs").select("*").eq("is_template", true).order("created_at"),
    admin
      .from("agent_configs")
      .select("*")
      .eq("workspace_id", workspace.id)
      .eq("is_template", false)
      .order("created_at"),
  ]);

  return (
    <AgentsClient
      workspaceId={workspace.id}
      workspaceName={workspace.name}
      initialTemplates={templates ?? []}
      initialAgents={workspaceAgents ?? []}
    />
  );
}
