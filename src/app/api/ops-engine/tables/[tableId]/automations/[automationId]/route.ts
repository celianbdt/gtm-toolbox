import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { updateAutomationSchema } from "@/lib/ops-engine/schemas";
import { updateAutomation, deleteAutomation } from "@/lib/ops-engine/db";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string; automationId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { automationId } = await params;
    const body = await request.json();
    const parsed = updateAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const automation = await updateAutomation(automationId, parsed.data);
    return NextResponse.json({ automation });
  } catch (error) {
    console.error("Failed to update automation:", error);
    return NextResponse.json(
      { error: "Failed to update automation" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string; automationId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { automationId } = await params;
    await deleteAutomation(automationId);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete automation:", error);
    return NextResponse.json(
      { error: "Failed to delete automation" },
      { status: 500 }
    );
  }
}
