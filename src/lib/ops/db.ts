import { createAdminClient } from "@/lib/supabase/admin";
import type { OpsNote } from "./types";

export async function listOpsNotes(
  workspaceId: string,
  filters?: { search?: string; tag?: string; source?: string; pinned?: boolean }
): Promise<OpsNote[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("ops_notes")
    .select("*")
    .eq("workspace_id", workspaceId)
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false });

  if (filters?.tag) {
    query = query.contains("tags", [filters.tag]);
  }
  if (filters?.source) {
    query = query.eq("source", filters.source);
  }
  if (filters?.pinned !== undefined) {
    query = query.eq("is_pinned", filters.pinned);
  }
  if (filters?.search) {
    query = query.or(`title.ilike.%${filters.search}%,content.ilike.%${filters.search}%`);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data as OpsNote[];
}

export async function createOpsNote(payload: {
  workspace_id: string;
  title: string;
  content: string;
  source?: string;
  source_session_id?: string;
  tags?: string[];
}): Promise<OpsNote> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_notes")
    .insert({
      workspace_id: payload.workspace_id,
      title: payload.title,
      content: payload.content,
      source: payload.source ?? "manual",
      source_session_id: payload.source_session_id ?? null,
      tags: payload.tags ?? [],
    })
    .select()
    .single();
  if (error) throw error;
  return data as OpsNote;
}

export async function updateOpsNote(
  noteId: string,
  update: Partial<Pick<OpsNote, "title" | "content" | "tags" | "is_pinned">>
): Promise<OpsNote> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_notes")
    .update(update)
    .eq("id", noteId)
    .select()
    .single();
  if (error) throw error;
  return data as OpsNote;
}

export async function deleteOpsNote(noteId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("ops_notes").delete().eq("id", noteId);
  if (error) throw error;
}
