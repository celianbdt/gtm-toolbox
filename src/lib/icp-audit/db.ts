import { createAdminClient } from "@/lib/supabase/admin";
import type { AgentConfig, DebateMessage } from "@/lib/debate/types";
import type { ICASession, ICASessionConfig, ICASessionOutput, ICAOutputType } from "./types";
import { ICA_ANALYST_SLUGS } from "./agents";

export async function getICAAnalystTemplates(): Promise<AgentConfig[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("agent_configs")
    .select("*")
    .eq("is_template", true)
    .in("slug", [...ICA_ANALYST_SLUGS])
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

export async function createICASession(payload: {
  workspace_id: string;
  config: ICASessionConfig;
  title: string;
}): Promise<ICASession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .insert({
      workspace_id: payload.workspace_id,
      tool_id: "icp-audit",
      title: payload.title,
      status: "active",
      config: payload.config,
    })
    .select()
    .single();
  if (error) throw error;
  return data as ICASession;
}

export async function getICASession(sessionId: string): Promise<ICASession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as ICASession;
}

export async function updateSessionPhase(
  sessionId: string,
  phase: ICASessionConfig["current_phase"]
): Promise<void> {
  const supabase = createAdminClient();
  const { data: session, error: fetchError } = await supabase
    .from("tool_sessions")
    .select("config")
    .eq("id", sessionId)
    .single();
  if (fetchError) throw fetchError;

  const newConfig = {
    ...(session.config as ICASessionConfig),
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
  output_type: ICAOutputType;
  title: string;
  description: string;
  confidence_score?: number;
  tags?: string[];
  metadata: Record<string, unknown>;
}): Promise<ICASessionOutput> {
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
  return data as ICASessionOutput;
}

export async function getSessionOutputs(
  sessionId: string
): Promise<ICASessionOutput[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) throw error;
  return data as ICASessionOutput[];
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

export async function listICASessions(
  workspaceId: string
): Promise<ICASession[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("tool_id", "icp-audit")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ICASession[];
}
