import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const body = await request.json();
    const { name, description, color } = body as {
      name?: string;
      description?: string;
      color?: string;
    };

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("workspaces")
      .update({ name, description, color })
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
