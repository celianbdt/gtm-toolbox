import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createTableSchema } from "@/lib/ops-engine/schemas";
import { createTable, listTables } from "@/lib/ops-engine/db";

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
    const tables = await listTables(workspaceId);
    return NextResponse.json({ tables });
  } catch (error) {
    console.error("Failed to list tables:", error);
    return NextResponse.json(
      { error: "Failed to list tables" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = createTableSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const table = await createTable(parsed.data);
    return NextResponse.json({ table }, { status: 201 });
  } catch (error) {
    console.error("Failed to create table:", error);
    return NextResponse.json(
      { error: "Failed to create table" },
      { status: 500 }
    );
  }
}
