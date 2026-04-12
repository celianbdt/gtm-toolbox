import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { WorkspaceSettingsForm } from "@/components/workspace/workspace-settings-form";
import { APIKeysForm } from "@/components/workspace/api-keys-form";
import { IntegrationList } from "@/components/integrations/integration-list";
import { Plug } from "lucide-react";

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
      <div className="border-t border-zinc-800 mt-10 pt-10 max-w-4xl">
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Plug className="h-4 w-4 text-blue-400" />
            <h2 className="text-base font-semibold text-white">Intégrations</h2>
          </div>
          <p className="text-sm text-zinc-400 mb-6">
            Connectez vos outils externes pour synchroniser les données automatiquement.
          </p>
          <IntegrationList />
        </section>
      </div>
    </div>
  );
}
