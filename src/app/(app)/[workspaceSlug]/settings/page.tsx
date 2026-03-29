import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSettingsForm } from "@/components/workspace/workspace-settings-form";
import { APIKeysForm } from "@/components/workspace/api-keys-form";

export default async function SettingsPage({
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

  if (!workspace) notFound();

  // Extract API keys (masked for display — only show if present)
  const apiKeys = (workspace as Record<string, unknown>).api_keys as {
    anthropic_api_key?: string;
    openai_api_key?: string;
  } | null;

  return (
    <div className="flex-1 p-6 md:p-8">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-white">Paramètres</h1>
        <p className="text-sm text-zinc-400 mt-1">Gérer le workspace {workspace.name}</p>
      </div>
      <div className="max-w-xl space-y-10">
        <WorkspaceSettingsForm workspace={workspace} />
        <div className="border-t border-zinc-800 pt-10">
          <APIKeysForm
            workspaceSlug={workspace.slug}
            initialKeys={apiKeys ?? {}}
          />
        </div>
      </div>
    </div>
  );
}
