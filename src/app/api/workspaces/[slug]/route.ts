import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/supabase/auth";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { slug } = await params;
    const body = await request.json();
    const { name, description, color, logo_url, api_keys } = body as {
      name?: string;
      description?: string;
      color?: string;
      logo_url?: string | null;
      api_keys?: { anthropic_api_key?: string; openai_api_key?: string };
    };

    // Build update payload — only include fields that were sent
    const update: Record<string, unknown> = {};
    if (name !== undefined) update.name = name;
    if (description !== undefined) update.description = description;
    if (color !== undefined) update.color = color;
    if (logo_url !== undefined) update.logo_url = logo_url;
    if (api_keys !== undefined) update.api_keys = api_keys;

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("workspaces")
      .update(update)
      .eq("slug", slug)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ workspace: data });
  } catch (error) {
    console.error("Failed to update workspace:", error);
    return NextResponse.json({ error: "Failed to update workspace" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const auth = await requireAuth();
    if (auth.error) return auth.error;
    const { slug } = await params;
    const supabase = createAdminClient();

    // Fetch workspace id first
    const { data: workspace, error: fetchError } = await supabase
      .from("workspaces")
      .select("id")
      .eq("slug", slug)
      .single();

    if (fetchError || !workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const { error } = await supabase
      .from("workspaces")
      .delete()
      .eq("id", workspace.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete workspace:", error);
    return NextResponse.json({ error: "Failed to delete workspace" }, { status: 500 });
  }
}
