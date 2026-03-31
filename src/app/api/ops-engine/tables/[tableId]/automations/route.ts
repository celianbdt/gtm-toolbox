import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAutomationSchema } from "@/lib/ops-engine/schemas";
import { createAutomation, listAutomations } from "@/lib/ops-engine/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const automations = await listAutomations(tableId);
    return NextResponse.json({ automations });
  } catch (error) {
    console.error("Failed to list automations:", error);
    return NextResponse.json(
      { error: "Failed to list automations" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const body = await request.json();
    const parsed = createAutomationSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const automation = await createAutomation(tableId, parsed.data);
    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    console.error("Failed to create automation:", error);
    return NextResponse.json(
      { error: "Failed to create automation" },
      { status: 500 }
    );
  }
}
