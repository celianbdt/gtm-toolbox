import { createAdminClient } from "@/lib/supabase/admin";
import { listTasks, getMetrics, listMetricDefinitions } from "@/lib/project/db";
import type { Task } from "@/lib/types/project";

export type ReportContext = {
  workspaceName: string;
  weekStart: string;
  weekEnd: string;
  completedTasks: Task[];
  blockedTasks: Task[];
  inProgressTasks: Task[];
  todoTasks: Task[];
  currentMetrics: Array<{
    metric_name: string;
    label: string;
    value: number;
    unit: string;
    prev_value?: number;
  }>;
};

export async function gatherReportData(
  workspaceId: string,
  weekStart: string
): Promise<ReportContext> {
  const supabase = createAdminClient();

  // 1. Fetch workspace name
  const { data: workspace, error: wsError } = await supabase
    .from("workspaces")
    .select("name")
    .eq("id", workspaceId)
    .single();
  if (wsError) throw wsError;

  // 2. Compute weekEnd (weekStart + 6 days)
  const start = new Date(weekStart);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const weekEnd = end.toISOString().split("T")[0];

  // 3. Fetch all tasks
  const allTasks = await listTasks(workspaceId);

  // Completed this week = status "done" and updated_at >= weekStart
  const completedTasks = allTasks.filter(
    (t) => t.status === "done" && t.updated_at >= weekStart
  );
  const blockedTasks = allTasks.filter((t) => t.status === "blocked");
  const inProgressTasks = allTasks.filter((t) => t.status === "in_progress");
  const todoTasks = allTasks.filter((t) => t.status === "todo");

  // 4. Fetch metric definitions
  const definitions = await listMetricDefinitions(workspaceId);

  // 5. Fetch recent metrics (2 weeks worth)
  const metrics = await getMetrics(workspaceId, 2);

  // Build current week metrics with previous week comparison
  const currentMetrics = definitions.map((def) => {
    const current = metrics.find(
      (m) => m.metric_name === def.metric_name && m.week_date === weekStart
    );

    // Previous week
    const prevStart = new Date(start);
    prevStart.setDate(prevStart.getDate() - 7);
    const prevWeekDate = prevStart.toISOString().split("T")[0];
    const prev = metrics.find(
      (m) => m.metric_name === def.metric_name && m.week_date === prevWeekDate
    );

    return {
      metric_name: def.metric_name,
      label: def.label,
      value: current?.metric_value ?? 0,
      unit: def.unit,
      prev_value: prev?.metric_value,
    };
  });

  return {
    workspaceName: workspace.name,
    weekStart,
    weekEnd,
    completedTasks,
    blockedTasks,
    inProgressTasks,
    todoTasks,
    currentMetrics,
  };
}

export function buildReportPrompt(ctx: ReportContext): string {
  const completedList =
    ctx.completedTasks.length > 0
      ? ctx.completedTasks.map((t) => `- ${t.title}`).join("\n")
      : "- Aucune tache terminee cette semaine";

  const blockedList =
    ctx.blockedTasks.length > 0
      ? ctx.blockedTasks.map((t) => `- ${t.title}`).join("\n")
      : "Aucun blocage";

  const inProgressList =
    ctx.inProgressTasks.length > 0
      ? ctx.inProgressTasks.map((t) => `- ${t.title}`).join("\n")
      : "Aucune tache en cours";

  const todoList =
    ctx.todoTasks.length > 0
      ? ctx.todoTasks.map((t) => `- ${t.title}`).join("\n")
      : "Aucune tache planifiee";

  const metricsSection =
    ctx.currentMetrics.length > 0
      ? ctx.currentMetrics
          .map((m) => {
            const change =
              m.prev_value !== undefined
                ? ` (semaine precedente: ${m.prev_value} ${m.unit})`
                : "";
            return `- ${m.label}: ${m.value} ${m.unit}${change}`;
          })
          .join("\n")
      : "Aucune metrique configuree";

  return `Tu es un assistant GTM. Genere un rapport hebdomadaire concis en francais pour le workspace "${ctx.workspaceName}".

Periode: ${ctx.weekStart} au ${ctx.weekEnd}

## Donnees

### Taches terminees cette semaine
${completedList}

### Taches bloquees
${blockedList}

### Taches en cours
${inProgressList}

### Taches a faire
${todoList}

### Metriques de la semaine
${metricsSection}

## Instructions

Genere un rapport structure en markdown avec ces sections exactes:

## Ce qui a ete fait
Resume les taches terminees de maniere claire et impactante. Regroupe par theme si pertinent.

## Metriques
Presente les metriques avec la comparaison semaine precedente (hausse/baisse en %). Si pas de donnee precedente, indique juste la valeur actuelle.

## Semaine prochaine
Base-toi sur les taches en cours et a faire pour indiquer les priorites de la semaine suivante.

## Ce dont j'ai besoin de toi
Si des taches sont bloquees, formule des demandes claires au destinataire. Si aucun blocage, indique que tout avance bien.

Regles:
- Sois concis (300-500 mots max)
- Utilise du markdown propre
- Sois specifique sur les chiffres
- Ton professionnel mais direct
- N'invente aucune donnee, utilise uniquement ce qui est fourni`;
}
