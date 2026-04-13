import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(_request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = auth.user!;
  const supabase = createAdminClient();

  try {
    const { data, error } = await supabase
      .from("client_reports")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return NextResponse.json({ reports: data ?? [] });
  } catch (error) {
    console.error("Failed to list client reports:", error);
    return NextResponse.json({ error: "Failed to list reports" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const user = auth.user!;
  const supabase = createAdminClient();

  try {
    const body = await request.json();
    const { title, workspace_ids, vocal_notes, raw_markdown } = body;

    const { data, error } = await supabase
      .from("client_reports")
      .insert({
        user_id: user.id,
        title: title ?? "Rapport client",
        workspace_ids: workspace_ids ?? [],
        vocal_notes: vocal_notes ?? "",
        raw_markdown: raw_markdown ?? "",
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ report: data }, { status: 201 });
  } catch (error) {
    console.error("Failed to save client report:", error);
    return NextResponse.json({ error: "Failed to save report" }, { status: 500 });
  }
}
