import { createAdminClient } from "@/lib/supabase/admin";
import type { CWSession, CWSessionConfig, CWSessionOutput, CWOutputType } from "./types";

export async function createCWSession(payload: {
  workspace_id: string;
  config: CWSessionConfig;
  title: string;
}): Promise<CWSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .insert({
      workspace_id: payload.workspace_id,
      tool_id: "copywriting",
      title: payload.title,
      status: "active",
      config: payload.config,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CWSession;
}

export async function getCWSession(sessionId: string): Promise<CWSession> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();
  if (error) throw error;
  return data as CWSession;
}

export async function updateSessionPhase(
  sessionId: string,
  phase: CWSessionConfig["current_phase"]
): Promise<void> {
  const supabase = createAdminClient();
  const { data: session, error: fetchError } = await supabase
    .from("tool_sessions")
    .select("config")
    .eq("id", sessionId)
    .single();
  if (fetchError) throw fetchError;

  const newConfig = {
    ...(session.config as CWSessionConfig),
    current_phase: phase,
  };
  const { error } = await supabase
    .from("tool_sessions")
    .update({ config: newConfig, status: phase === "complete" ? "concluded" : "active" })
    .eq("id", sessionId);
  if (error) throw error;
}

export async function insertSessionOutput(output: {
  session_id: string;
  output_type: CWOutputType;
  title: string;
  description: string;
  metadata: Record<string, unknown>;
}): Promise<CWSessionOutput> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_outputs")
    .insert({
      session_id: output.session_id,
      output_type: output.output_type,
      title: output.title,
      description: output.description,
      tags: [],
      metadata: output.metadata,
    })
    .select()
    .single();
  if (error) throw error;
  return data as CWSessionOutput;
}

export async function getSessionOutputs(sessionId: string): Promise<CWSessionOutput[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("session_outputs")
    .select("*")
    .eq("session_id", sessionId)
    .order("created_at");
  if (error) throw error;
  return data as CWSessionOutput[];
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

export async function listCWSessions(workspaceId: string): Promise<CWSession[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("tool_sessions")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("tool_id", "copywriting")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as CWSession[];
}
