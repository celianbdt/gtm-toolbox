import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createRowSchema, rowsQuerySchema } from "@/lib/ops-engine/schemas";
import { createRow, getRows } from "@/lib/ops-engine/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const sp = request.nextUrl.searchParams;
    const queryParams = {
      page: sp.get("page") ?? undefined,
      limit: sp.get("limit") ?? undefined,
      sort: sp.get("sort") ?? undefined,
      order: sp.get("order") ?? undefined,
      tier: sp.get("tier") ?? undefined,
      search: sp.get("search") ?? undefined,
      status: sp.get("status") ?? undefined,
    };

    const parsed = rowsQuerySchema.safeParse(queryParams);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const result = await getRows(tableId, parsed.data);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Failed to get rows:", error);
    return NextResponse.json(
      { error: "Failed to get rows" },
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
    const parsed = createRowSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const row = await createRow(tableId, parsed.data);
    return NextResponse.json({ row }, { status: 201 });
  } catch (error) {
    console.error("Failed to create row:", error);
    return NextResponse.json(
      { error: "Failed to create row" },
      { status: 500 }
    );
  }
}
