import { gatherReportData, buildReportPrompt } from "@/lib/project/report-prompt";
import type { ReportContext } from "@/lib/project/report-prompt";

// Re-export for typing
export type { ReportContext };

/**
 * Gathers report data for multiple workspaces and builds
 * a combined client-facing report prompt.
 */
export async function buildClientReportPrompt(
  workspaceIds: string[],
  vocalNotes: string
): Promise<string> {
  // Compute current week start (Monday)
  const now = new Date();
  const day = now.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diff);
  const weekStart = monday.toISOString().slice(0, 10);

  // Gather data for each workspace in parallel
  const results = await Promise.allSettled(
    workspaceIds.map((wsId) => gatherReportData(wsId, weekStart))
  );

  const contexts: ReportContext[] = results
    .filter((r): r is PromiseFulfilledResult<ReportContext> => r.status === "fulfilled")
    .map((r) => r.value);

  if (contexts.length === 0) {
    return "Aucune donnee disponible pour generer le rapport.";
  }

  // Build per-workspace sections
  const workspaceSections = contexts
    .map((ctx) => {
      const completed = ctx.completedTasks.length > 0
        ? ctx.completedTasks.map((t) => `- ${t.title}`).join("\n")
        : "- Aucune tache terminee";

      const blocked = ctx.blockedTasks.length > 0
        ? ctx.blockedTasks.map((t) => `- ${t.title}`).join("\n")
        : "Aucun blocage";

      const inProgress = ctx.inProgressTasks.length > 0
        ? ctx.inProgressTasks.map((t) => `- ${t.title}`).join("\n")
        : "Aucune tache en cours";

      const todo = ctx.todoTasks.length > 0
        ? ctx.todoTasks.map((t) => `- ${t.title}`).join("\n")
        : "Aucune tache planifiee";

      const metrics = ctx.currentMetrics.length > 0
        ? ctx.currentMetrics
            .map((m) => {
              const change = m.prev_value !== undefined
                ? ` (prev: ${m.prev_value} ${m.unit})`
                : "";
              return `- ${m.label}: ${m.value} ${m.unit}${change}`;
            })
            .join("\n")
        : "Aucune metrique";

      return `### ${ctx.workspaceName}
**Periode**: ${ctx.weekStart} au ${ctx.weekEnd}

**Termine**:
${completed}

**En cours**:
${inProgress}

**Bloque**:
${blocked}

**A faire**:
${todo}

**Metriques**:
${metrics}`;
    })
    .join("\n\n---\n\n");

  return `Tu es un assistant GTM professionnel. Genere un rapport client hebdomadaire en francais.

## Donnees par workspace

${workspaceSections}

${vocalNotes ? `## Notes de l'operateur\n${vocalNotes}` : ""}

## Instructions

Genere un rapport structure en markdown avec ces sections:

## Resume executif
2-3 phrases de synthese globale de la semaine.

## Accomplissements
Ce qui a ete fait cette semaine, regroupe par theme ou workspace si pertinent.

## Metriques cles
Les chiffres importants avec evolution vs semaine precedente.

## Points de blocage
Ce qui est bloque et ce dont tu as besoin du client.

## Plan semaine prochaine
Les priorites de la semaine suivante basees sur les taches en cours et a faire.

Regles:
- Sois concis (400-600 mots)
- Markdown propre et structure
- Ton professionnel mais direct
- Integre les notes de l'operateur naturellement
- N'invente aucune donnee`;
}
