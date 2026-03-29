import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentConfig, DebateMessage } from "@/lib/debate/types";
import type { MLSession, MLSessionConfig, MLSessionOutput, MLOutputType } from "./types";
import { ML_AGENT_SLUGS } from "./agents";

export async function getMLAgentTemplates(): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("is_template", true)
    .in("slug", [...ML_AGENT_SLUGS])
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

export async function createMLSession(payload: {
  workspace_id: string;
  config: MLSessionConfig;
  title: string;
}): Promise<MLSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .insert({
      workspace_id: payload.workspace_id,
      tool_id: "messaging-lab",
      title: payload.title,
      status: "active",
      config: payload.config,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MLSession;
}

export async function getMLSession(sessionId: string): Promise<MLSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as MLSession;
}

export async function updateSessionPhase(
  sessionId: string,
  phase: MLSessionConfig["current_phase"]
): Promise<void> {
  const supabase = createAdminClient();
  const { data: session, error: fetchError } = await supabase
    .from("tool_sessions")
    .select("config")
    .eq("id", sessionId)
    .single();
  if (fetchError) throw fetchError;

  const newConfig = {
    ...(session.config as MLSessionConfig),
    current_phase: phase,
  };
  const { error } = await supabase
    .from("tool_sessions")
    .update({ config: newConfig, status: phase === "complete" ? "concluded" : "active" })
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

export async function getSessionMessages(
  sessionId: string
): Promise<DebateMessage[]> {
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

export async function insertSessionOutput(output: {
  session_id: string;
  output_type: MLOutputType;
  title: string;
  description: string;
  confidence_score?: number;
  tags?: string[];
  metadata: Record<string, unknown>;
}): Promise<MLSessionOutput> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_outputs")
    .insert({
      session_id: output.session_id,
      output_type: output.output_type,
      title: output.title,
      description: output.description,
      confidence_score: output.confidence_score ?? null,
      tags: output.tags ?? [],
      metadata: output.metadata,
    })
    .select()
    .single();
  if (error) throw error;
  return data as MLSessionOutput;
}

export async function getSessionOutputs(
  sessionId: string
): Promise<MLSessionOutput[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) throw error;
  return data as MLSessionOutput[];
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

export async function listMLSessions(
  workspaceId: string
): Promise<MLSession[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("tool_id", "messaging-lab")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as MLSession[];
}
