import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { bulkImportSchema } from "@/lib/ops-engine/schemas";
import { bulkInsertRows } from "@/lib/ops-engine/db";
import Papa from "papaparse";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tableId: string }> }
) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const { tableId } = await params;
    const contentType = request.headers.get("content-type") ?? "";

    let parsedBody: { rows: Record<string, unknown>[]; source?: string; domain_column?: string };

    if (contentType.includes("text/csv")) {
      const csvText = await request.text();
      const result = Papa.parse<Record<string, string>>(csvText, {
        header: true,
        skipEmptyLines: true,
      });

      if (result.errors.length > 0) {
        return NextResponse.json(
          { error: "CSV parse error", details: result.errors },
          { status: 400 }
        );
      }

      parsedBody = {
        rows: result.data,
        source: "csv_import",
      };
    } else {
      parsedBody = await request.json();
    }

    const parsed = bulkImportSchema.safeParse(parsedBody);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { rows, source, domain_column } = parsed.data;
    const mappedRows = rows.map((row) => ({
      domain: domain_column ? String(row[domain_column] ?? "") || undefined : undefined,
      data: row,
      source: source as "csv_import" | undefined,
      source_meta: {},
    }));

    const result = await bulkInsertRows(tableId, mappedRows);
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Failed to bulk insert rows:", error);
    return NextResponse.json(
      { error: "Failed to bulk insert rows" },
      { status: 500 }
    );
  }
}
