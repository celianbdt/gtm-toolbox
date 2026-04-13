import { createAdminClient } from "@/lib/supabase/admin";
import { getToolById, tools } from "./registry";

type PrerequisiteResult = {
  met: boolean;
  missing: { toolId: string; toolName: string }[];
  completed: string[];
};

/**
 * Check if a tool's prerequisites are met for a given workspace.
 * A prerequisite is met when there's at least one concluded session for that tool_id.
 */
export async function checkToolPrerequisites(
  workspaceId: string,
  toolId: string
): Promise<PrerequisiteResult> {
  const tool = getToolById(toolId);
  if (!tool || !tool.prerequisites || tool.prerequisites.length === 0) {
    return { met: true, missing: [], completed: [] };
  }

  const supabase = createAdminClient();

  // Fetch concluded tool_ids for this workspace
  const { data: sessions } = await supabase
    .from("tool_sessions")
    .select("tool_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "concluded");

  const concludedToolIds = new Set((sessions ?? []).map((s) => s.tool_id));

  const missing: PrerequisiteResult["missing"] = [];
  const completed: string[] = [];

  for (const prereqId of tool.prerequisites) {
    if (concludedToolIds.has(prereqId)) {
      completed.push(prereqId);
    } else {
      const prereqTool = getToolById(prereqId);
      missing.push({
        toolId: prereqId,
        toolName: prereqTool?.name ?? prereqId,
      });
    }
  }

  return { met: missing.length === 0, missing, completed };
}

/**
 * Check prerequisites for ALL tools in a workspace at once.
 * Returns a map of toolId → PrerequisiteResult.
 */
export async function checkAllPrerequisites(
  workspaceId: string
): Promise<Record<string, PrerequisiteResult>> {
  const supabase = createAdminClient();

  const { data: sessions } = await supabase
    .from("tool_sessions")
    .select("tool_id")
    .eq("workspace_id", workspaceId)
    .eq("status", "concluded");

  const concludedToolIds = new Set((sessions ?? []).map((s) => s.tool_id));

  const result: Record<string, PrerequisiteResult> = {};

  for (const tool of tools) {
    if (!tool.prerequisites || tool.prerequisites.length === 0) {
      result[tool.id] = { met: true, missing: [], completed: [] };
      continue;
    }

    const missing: PrerequisiteResult["missing"] = [];
    const completed: string[] = [];

    for (const prereqId of tool.prerequisites) {
      if (concludedToolIds.has(prereqId)) {
        completed.push(prereqId);
      } else {
        const prereqTool = getToolById(prereqId);
        missing.push({
          toolId: prereqId,
          toolName: prereqTool?.name ?? prereqId,
        });
      }
    }

    result[tool.id] = { met: missing.length === 0, missing, completed };
  }

  return result;
}
