import { createAnthropic } from "@ai-sdk/anthropic";
import { createOpenAI } from "@ai-sdk/openai";
import { createAdminClient } from "@/lib/supabase/admin";

export type WorkspaceAPIKeys = {
  anthropic_api_key?: string;
  openai_api_key?: string;
};

/**
 * Load API keys for a workspace from the database.
 * Falls back to environment variables if no workspace keys are set.
 */
export async function getWorkspaceAPIKeys(workspaceId: string): Promise<WorkspaceAPIKeys> {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("workspaces")
    .select("api_keys")
    .eq("id", workspaceId)
    .single();

  return (data?.api_keys as WorkspaceAPIKeys) ?? {};
}

/**
 * Create an Anthropic provider using workspace-specific API key,
 * falling back to the global environment variable.
 */
export function createWorkspaceAnthropic(keys: WorkspaceAPIKeys) {
  const apiKey = keys.anthropic_api_key || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("No Anthropic API key configured. Add one in workspace settings.");
  }
  return createAnthropic({ apiKey });
}

/**
 * Create an OpenAI provider using workspace-specific API key,
 * falling back to the global environment variable.
 */
export function createWorkspaceOpenAI(keys: WorkspaceAPIKeys) {
  const apiKey = keys.openai_api_key || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("No OpenAI API key configured. Add one in workspace settings.");
  }
  return createOpenAI({ apiKey });
}

/**
 * Convenience: load keys + create Anthropic provider in one call.
 */
export async function getAnthropicForWorkspace(workspaceId: string) {
  const keys = await getWorkspaceAPIKeys(workspaceId);
  return createWorkspaceAnthropic(keys);
}
