import { getAvailableInsightSessions, getToolInsights } from "./index";

/**
 * Load all available insights from prior tool sessions for injection into prompts.
 * Excludes sessions from the current tool to avoid circular references.
 */
export async function loadInsightsForTool(
  workspaceId: string,
  currentToolId: string
): Promise<string> {
  const sessions = await getAvailableInsightSessions(workspaceId, currentToolId);
  if (sessions.length === 0) return "";
  const allSessionIds = sessions.map((s) => s.id);
  return getToolInsights(allSessionIds);
}
