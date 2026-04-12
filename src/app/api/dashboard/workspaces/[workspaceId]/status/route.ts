import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { z } from "zod";

const updateStatusSchema = z.object({
  status: z.enum(["active", "paused", "completed"]).optional(),
  priority: z.enum(["urgent", "normal", "low"]).optional(),
});

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ workspaceId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { workspaceId } = await params;
    const body = await request.json();
    const parsed = updateStatusSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates = parsed.data;

    if (!updates.status && !updates.priority) {
      return NextResponse.json(
        { error: "At least one of status or priority must be provided" },
        { status: 400 }
      );
    }

    const admin = createAdminClient();

    const { data: workspace, error } = await admin
      .from("workspaces")
      .update(updates)
      .eq("id", workspaceId)
      .select()
      .single();

    if (error) {
      console.error("Failed to update workspace status:", error);
      return NextResponse.json(
        { error: "Failed to update workspace" },
        { status: 500 }
      );
    }

    return NextResponse.json({ workspace });
  } catch (error) {
    console.error("Failed to update workspace status:", error);
    return NextResponse.json(
      { error: "Failed to update workspace status" },
      { status: 500 }
    );
  }
}
