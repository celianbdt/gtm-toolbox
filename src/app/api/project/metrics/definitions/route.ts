import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createMetricDefinitionSchema } from "@/lib/project/schemas";
import {
  listMetricDefinitions,
  createMetricDefinition,
  deleteMetricDefinition,
} from "@/lib/project/db";

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
    const definitions = await listMetricDefinitions(workspaceId);
    return NextResponse.json({ definitions });
  } catch (error) {
    console.error("Failed to list metric definitions:", error);
    return NextResponse.json(
      { error: "Failed to list metric definitions" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createMetricDefinitionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const definition = await createMetricDefinition(parsed.data);
    return NextResponse.json({ definition }, { status: 201 });
  } catch (error) {
    console.error("Failed to create metric definition:", error);
    return NextResponse.json(
      { error: "Failed to create metric definition" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json(
      { error: "id is required" },
      { status: 400 }
    );
  }

  try {
    await deleteMetricDefinition(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to delete metric definition:", error);
    return NextResponse.json(
      { error: "Failed to delete metric definition" },
      { status: 500 }
    );
  }
}
