import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentConfig, DebateMessage, DebateSession, DebateSessionConfig } from "./types";

export async function getAgentTemplates(): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("is_template", true)
    .order("created_at");
  if (error) throw error;
  return data as AgentConfig[];
}

export async function getAgentsByIds(ids: string[]): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("*")
    .in("id", ids);
  if (error) throw error;
  return data as AgentConfig[];
}

export async function insertAgentConfigs(
  agents: Omit<AgentConfig, "id">[]
): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .insert(agents)
    .select();
  if (error) throw error;
  return data as AgentConfig[];
}

export async function createSession(payload: {
  workspace_id: string;
  mission: string;
  max_turns: number;
  agent_ids: string[];
}): Promise<DebateSession> {
  const supabase = createAdminClient();
  const config: DebateSessionConfig = {
    mission: payload.mission,
    max_turns: payload.max_turns,
    agent_ids: payload.agent_ids,
    current_turn: 0,
  };
  const { data, error } = await supabase
    .from("tool_sessions")
    .insert({
      workspace_id: payload.workspace_id,
      tool_id: "strategy-debate",
      title: payload.mission.slice(0, 80),
      status: "active",
      config,
    })
    .select()
    .single();
  if (error) throw error;
  return data as DebateSession;
}

export async function getSession(sessionId: string): Promise<DebateSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as DebateSession;
}

export async function incrementTurn(sessionId: string, currentTurn: number): Promise<void> {
  const supabase = createAdminClient();
  const { data: session, error: fetchError } = await supabase
    .from("tool_sessions")
    .select("config")
    .eq("id", sessionId)
    .single();
  if (fetchError) throw fetchError;

  const newConfig = { ...(session.config as DebateSessionConfig), current_turn: currentTurn + 1 };
  const { error } = await supabase
    .from("tool_sessions")
    .update({ config: newConfig })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function insertMessage(
  msg: Omit<DebateMessage, "id" | "created_at">
): Promise<DebateMessage> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .insert(msg)
    .select()
    .single();
  if (error) throw error;
  return data as DebateMessage;
}

export async function getSessionMessages(sessionId: string): Promise<DebateMessage[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("messages")
    .select("*")
    .eq("session_id", sessionId)
    .order("step_number")
    .order("sequence_in_step");
  if (error) throw error;
  return data as DebateMessage[];
}

export async function getWorkspaceContext(workspaceId: string): Promise<string> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("context_documents")
    .select("title, content, doc_type")
    .eq("workspace_id", workspaceId)
    .order("doc_type");
  if (error) throw error;
  if (!data || data.length === 0) return "";

  return data
    .map((doc) => `## ${doc.title} (${doc.doc_type})\n${doc.content}`)
    .join("\n\n");
}
