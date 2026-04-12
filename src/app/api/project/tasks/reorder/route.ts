import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { reorderTasksSchema } from "@/lib/project/schemas";
import { reorderTasks } from "@/lib/project/db";

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = reorderTasksSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    await reorderTasks(parsed.data.tasks);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to reorder tasks:", error);
    return NextResponse.json(
      { error: "Failed to reorder tasks" },
      { status: 500 }
    );
  }
}
