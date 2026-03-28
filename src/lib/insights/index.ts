import { createAdminClient } from "@/lib/supabase/admin";
import type { InsightSession, SessionOutputRecord } from "./types";
import { formatOutput, TOOL_DISPLAY_NAMES } from "./formatters";

/**
 * List all concluded sessions with outputs for a workspace.
 * Optionally exclude a tool_id (e.g. don't show debate sessions in debate setup).
 */
export async function getAvailableInsightSessions(
  workspaceId: string,
  excludeToolId?: string
): Promise<InsightSession[]> {
  const supabase = createAdminClient();

  // Step 1: get concluded sessions
  let query = supabase
    .from("tool_sessions")
    .select("id, tool_id, title, status, created_at")
    .eq("workspace_id", workspaceId)
    .eq("status", "concluded")
    .order("created_at", { ascending: false });

  if (excludeToolId) {
    query = query.neq("tool_id", excludeToolId);
  }

  const { data: sessions, error: sessErr } = await query;
  if (sessErr) throw sessErr;
  if (!sessions || sessions.length === 0) return [];

  // Step 2: get output counts per session
  const sessionIds = sessions.map((s) => s.id);
  const { data: outputs, error: outErr } = await supabase
    .from("session_outputs")
    .select("session_id, output_type")
    .in("session_id", sessionIds);
  if (outErr) throw outErr;

  // Aggregate in JS
  const outputMap = new Map<string, string[]>();
  for (const o of outputs ?? []) {
    const list = outputMap.get(o.session_id) ?? [];
    list.push(o.output_type);
    outputMap.set(o.session_id, list);
  }

  // Only return sessions that actually have outputs
  return sessions
    .filter((s) => outputMap.has(s.id))
    .map((s) => ({
      id: s.id,
      tool_id: s.tool_id,
      title: s.title,
      status: s.status,
      created_at: s.created_at,
      output_count: outputMap.get(s.id)!.length,
      output_types: [...new Set(outputMap.get(s.id)!)],
    }));
}

/**
 * Load outputs for given session IDs and format as markdown for prompt injection.
 */
export async function getToolInsights(sessionIds: string[]): Promise<string> {
  if (!sessionIds.length) return "";

  const supabase = createAdminClient();

  // Load sessions
  const { data: sessions, error: sessErr } = await supabase
    .from("tool_sessions")
    .select("id, tool_id, title, created_at")
    .in("id", sessionIds);
  if (sessErr) throw sessErr;
  if (!sessions?.length) return "";

  // Load all outputs for those sessions
  const { data: outputs, error: outErr } = await supabase
    .from("session_outputs")
    .select("*")
    .in("session_id", sessionIds)
    .order("created_at");
  if (outErr) throw outErr;
  if (!outputs?.length) return "";

  // Group outputs by session
  const outputsBySession = new Map<string, SessionOutputRecord[]>();
  for (const o of outputs) {
    const list = outputsBySession.get(o.session_id) ?? [];
    list.push(o as SessionOutputRecord);
    outputsBySession.set(o.session_id, list);
  }

  // Format each session's outputs
  const sections: string[] = [];
  for (const session of sessions) {
    const sessionOutputs = outputsBySession.get(session.id);
    if (!sessionOutputs?.length) continue;

    const toolName = TOOL_DISPLAY_NAMES[session.tool_id] ?? session.tool_id;
    const date = new Date(session.created_at).toLocaleDateString("fr-FR");
    const header = `### ${session.title} (${toolName}, ${date})`;

    // Prioritize high-signal outputs first
    const priority = ["executive-summary", "threat-assessment", "debate-summary", "battle-card"];
    const sorted = [...sessionOutputs].sort((a, b) => {
      const ai = priority.indexOf(a.output_type);
      const bi = priority.indexOf(b.output_type);
      return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi);
    });

    const formatted = sorted.map((o) => formatOutput(session.tool_id, o));
    sections.push(`${header}\n\n${formatted.join("\n\n")}`);
  }

  if (!sections.length) return "";
  return `## Insights from Previous Analyses\n\n${sections.join("\n\n---\n\n")}`;
}

export { TOOL_DISPLAY_NAMES } from "./formatters";
export type { InsightSession, SessionOutputRecord } from "./types";
