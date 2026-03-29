import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function requireAuth() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return {
      user: null,
      error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  return { user, error: null, supabase };
}

export async function requireWorkspaceMember(workspaceId: string) {
  const auth = await requireAuth();
  if (auth.error) return auth;

  const { data: member } = await auth.supabase!
    .from("workspace_members")
    .select("role")
    .eq("workspace_id", workspaceId)
    .eq("user_id", auth.user!.id)
    .single();

  if (!member) {
    return {
      ...auth,
      error: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
    };
  }

  return { ...auth, role: member.role };
}
