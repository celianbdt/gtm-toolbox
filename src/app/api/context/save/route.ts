import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: NextRequest) {
  try {
    const { workspaceId, title, content, docType } = await request.json() as {
      workspaceId: string;
      title: string;
      content: string;
      docType: string;
    };

    if (!workspaceId || !title || !content) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("context_documents")
      .insert({
        workspace_id: workspaceId,
        title,
        content,
        doc_type: docType || "competitor",
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ doc: data });
  } catch (error) {
    console.error("Save to context failed:", error);
    return NextResponse.json({ error: "Failed to save" }, { status: 500 });
  }
}
