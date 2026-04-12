import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createTaskSchema } from "@/lib/project/schemas";
import { listTasks, createTask } from "@/lib/project/db";
import type { TaskStatus, TaskTag, TaskPriority } from "@/lib/types/project";

export async function GET(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const workspaceId = request.nextUrl.searchParams.get("workspace_id");
  if (!workspaceId) {
    return NextResponse.json(
      { error: "workspace_id is required" },
      { status: 400 }
    );
  }

  try {
    const statusParam = request.nextUrl.searchParams.get("status");
    const tag = request.nextUrl.searchParams.get("tag") as TaskTag | null;
    const priority = request.nextUrl.searchParams.get("priority") as TaskPriority | null;

    const filters: { status?: TaskStatus[]; tag?: TaskTag; priority?: TaskPriority } = {};
    if (statusParam) {
      filters.status = statusParam.split(",") as TaskStatus[];
    }
    if (tag) filters.tag = tag;
    if (priority) filters.priority = priority;

    const tasks = await listTasks(workspaceId, filters);
    return NextResponse.json({ tasks });
  } catch (error) {
    console.error("Failed to list tasks:", error);
    return NextResponse.json(
      { error: "Failed to list tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const task = await createTask(parsed.data);
    return NextResponse.json({ task }, { status: 201 });
  } catch (error) {
    console.error("Failed to create task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
