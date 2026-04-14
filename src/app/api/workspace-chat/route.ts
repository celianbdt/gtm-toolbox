import { NextRequest } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getWorkspaceAPIKeys, resolveModelForUseCase } from "@/lib/ai/provider";
import { loadInsightsForTool } from "@/lib/insights/auto-load";
import { streamText } from "ai";

async function buildWorkspaceContext(workspaceId: string): Promise<string> {
  const supabase = createAdminClient();

  // Fetch workspace info, context docs, tasks, metrics, integrations in parallel
  const [wsResult, docsResult, tasksResult, integrationsResult, insightsResult] =
    await Promise.all([
      supabase.from("workspaces").select("name, description, status, priority, mission_stage").eq("id", workspaceId).single(),
      supabase.from("context_documents").select("title, content, doc_type").eq("workspace_id", workspaceId).order("doc_type"),
      supabase.from("tasks").select("title, status, priority, tag, due_date").eq("workspace_id", workspaceId),
      supabase.from("integrations").select("provider, status, last_sync_at").eq("workspace_id", workspaceId).eq("status", "connected"),
      loadInsightsForTool(workspaceId, "__chat__"),
    ]);

  const ws = wsResult.data;
  const docs = docsResult.data ?? [];
  const tasks = tasksResult.data ?? [];
  const integrations = integrationsResult.data ?? [];

  const sections: string[] = [];

  // Workspace info
  if (ws) {
    sections.push(`## Workspace: ${ws.name}\nDescription: ${ws.description ?? "Aucune"}\nStatut: ${ws.status}\nPriorite: ${ws.priority}\nPhase: ${ws.mission_stage ?? "discovery"}`);
  }

  // Context documents
  if (docs.length > 0) {
    const docsText = docs.map((d) => `### ${d.title} (${d.doc_type})\n${d.content}`).join("\n\n");
    sections.push(`## Documents de contexte\n${docsText}`);
  }

  // Tasks summary
  if (tasks.length > 0) {
    const byStatus: Record<string, string[]> = {};
    for (const t of tasks) {
      const s = t.status as string;
      if (!byStatus[s]) byStatus[s] = [];
      byStatus[s].push(`- ${t.title}${t.due_date ? ` (echeance: ${t.due_date})` : ""}${t.tag ? ` [${t.tag}]` : ""}`);
    }
    const tasksText = Object.entries(byStatus).map(([s, items]) => `### ${s}\n${items.join("\n")}`).join("\n\n");
    sections.push(`## Taches (${tasks.length} total)\n${tasksText}`);
  }

  // Integrations
  if (integrations.length > 0) {
    const intText = integrations.map((i) => `- ${i.provider} (connecte, derniere sync: ${i.last_sync_at ?? "jamais"})`).join("\n");
    sections.push(`## Integrations connectees\n${intText}`);
  }

  // Prior tool session insights
  if (insightsResult) {
    sections.push(`## Insights des sessions d'outils precedentes\n${insightsResult}`);
  }

  return sections.join("\n\n---\n\n");
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { messages, workspace_id } = await request.json();

    if (!workspace_id || !messages) {
      return new Response(JSON.stringify({ error: "workspace_id and messages required" }), { status: 400 });
    }

    const keys = await getWorkspaceAPIKeys(workspace_id);
    const model = resolveModelForUseCase("agent", keys);

    // Build full workspace context
    const context = await buildWorkspaceContext(workspace_id);

    const systemPrompt = `Tu es un assistant GTM expert integre dans un outil de gestion GTM multi-workspace.

Tu as acces a toutes les donnees du workspace courant. Reponds en francais, sois concis et actionable.

${context}

## Regles
- Reponds toujours en francais
- Sois direct et concis
- Base-toi uniquement sur les donnees fournies, ne fabrique pas d'informations
- Si on te demande des stats, utilise les donnees des taches et metriques
- Tu peux suggerer des actions (creer une tache, lancer un tool, etc.) mais tu ne peux pas les executer
- Formate en markdown quand c'est pertinent`;

    const result = streamText({
      model,
      system: systemPrompt,
      messages,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error("Workspace chat error:", error);
    return new Response(JSON.stringify({ error: "Chat failed" }), { status: 500 });
  }
}
