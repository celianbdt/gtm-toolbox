import { NextRequest, NextResponse } from "next/server";
import { requireAuth } from "@/lib/supabase/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTable, getColumns } from "@/lib/ops-engine/db";
import type { TemplateColumn } from "@/lib/ops-engine/types";
import { z } from "zod";

const saveTemplateSchema = z.object({
  table_id: z.string().uuid(),
  name: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
});

export async function POST(request: NextRequest) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const parsed = saveTemplateSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Validation error", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { table_id, name, description } = parsed.data;

    // Read the source table and its columns
    const table = await getTable(table_id);
    const columns = await getColumns(table_id);

    // Build columns_config from existing columns
    const columnsConfig: TemplateColumn[] = columns.map((col) => ({
      name: col.name,
      key: col.key,
      column_type: col.column_type,
      position: col.position,
      config: col.config,
      is_visible: col.is_visible,
    }));

    // Generate a slug from the name
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    // Insert as user template (workspace-scoped, not native)
    const supabase = createAdminClient();
    const { data: template, error } = await supabase
      .from("ops_templates")
      .insert({
        workspace_id: table.workspace_id,
        name,
        description: description ?? null,
        slug: `${slug}-${Date.now()}`,
        icon: "Table",
        is_native: false,
        columns_config: columnsConfig,
        scoring_config: table.scoring_config,
        settings: table.settings,
        automations_config: [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ template }, { status: 201 });
  } catch (error) {
    console.error("Failed to save template:", error);
    return NextResponse.json(
      { error: "Failed to save template" },
      { status: 500 }
    );
  }
}
