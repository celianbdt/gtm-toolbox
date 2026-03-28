import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentConfig } from "@/lib/debate/types";

export async function getWorkspaceAgents(workspaceId: string): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_template", false)
    .order("created_at");
  if (error) throw error;
  return data as AgentConfig[];
}

export async function cloneAgentToWorkspace(
  agentId: string,
  workspaceId: string
): Promise<AgentConfig> {
  const supabase = createAdminClient();

  const { data: source, error: fetchError } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("id", agentId)
    .single();

  if (fetchError || !source) throw fetchError ?? new Error("Agent not found");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { id, ...rest } = source as AgentConfig;
  const { data, error } = await supabase
    .from("agent_configs")
    .insert({ ...rest, workspace_id: workspaceId, is_template: false })
    .select()
    .single();

  if (error) throw error;
  return data as AgentConfig;
}

export async function createAgent(
  agent: Omit<AgentConfig, "id">
): Promise<AgentConfig> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .insert(agent)
    .select()
    .single();
  if (error) throw error;
  return data as AgentConfig;
}

export async function updateAgent(
  id: string,
  patch: Partial<Omit<AgentConfig, "id" | "workspace_id" | "is_template">>
): Promise<AgentConfig> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .update(patch)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as AgentConfig;
}

export async function deleteAgent(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("agent_configs").delete().eq("id", id);
  if (error) throw error;
}
