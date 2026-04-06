import { createAdminClient } from "@/lib/supabase/admin";
import type {
  OpsTable,
  OpsColumn,
  OpsRow,
  OpsCellValue,
  OpsTemplate,
  OpsAutomation,
  OpsScoreHistoryEntry,
  ThresholdTier,
  RowStatus,
} from "./types";

// ── Tables ──

export async function createTable(payload: {
  workspace_id: string;
  name: string;
  description?: string;
  template_id?: string;
  scoring_config?: OpsTable["scoring_config"];
  settings?: OpsTable["settings"];
}): Promise<OpsTable> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_tables")
    .insert(payload)
    .select()
    .single();
  if (error) throw error;
  return data as OpsTable;
}

export async function getTable(tableId: string): Promise<OpsTable> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_tables")
    .select("*")
    .eq("id", tableId)
    .single();
  if (error) throw error;
  return data as OpsTable;
}

export async function listTables(workspaceId: string): Promise<OpsTable[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_tables")
    .select("*")
    .eq("workspace_id", workspaceId)
    .eq("is_active", true)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpsTable[];
}

export async function updateTable(
  tableId: string,
  updates: Partial<OpsTable>
): Promise<OpsTable> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_tables")
    .update(updates)
    .eq("id", tableId)
    .select()
    .single();
  if (error) throw error;
  return data as OpsTable;
}

export async function deleteTable(tableId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ops_tables")
    .update({ is_active: false })
    .eq("id", tableId);
  if (error) throw error;
}

// ── Columns ──

export async function createColumn(
  tableId: string,
  payload: {
    name: string;
    key: string;
    column_type: OpsColumn["column_type"];
    position?: number;
    config?: OpsColumn["config"];
    is_visible?: boolean;
  }
): Promise<OpsColumn> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_columns")
    .insert({ table_id: tableId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as OpsColumn;
}

export async function getColumns(tableId: string): Promise<OpsColumn[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_columns")
    .select("*")
    .eq("table_id", tableId)
    .order("position");
  if (error) throw error;
  return (data ?? []) as OpsColumn[];
}

export async function updateColumn(
  columnId: string,
  updates: Partial<OpsColumn>
): Promise<OpsColumn> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_columns")
    .update(updates)
    .eq("id", columnId)
    .select()
    .single();
  if (error) throw error;
  return data as OpsColumn;
}

export async function deleteColumn(columnId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ops_columns")
    .delete()
    .eq("id", columnId);
  if (error) throw error;
}

// ── Rows ──

export async function getRows(
  tableId: string,
  params: {
    page: number;
    limit: number;
    sort: string;
    order: "asc" | "desc";
    tier?: ThresholdTier;
    search?: string;
    status?: RowStatus;
  }
): Promise<{ rows: OpsRow[]; total: number }> {
  const supabase = createAdminClient();
  const { page, limit, sort, order, tier, search, status } = params;
  const from = (page - 1) * limit;
  const to = from + limit - 1;

  // Build count query
  let countQuery = supabase
    .from("ops_rows")
    .select("*", { count: "exact", head: true })
    .eq("table_id", tableId);

  // Build data query
  let dataQuery = supabase
    .from("ops_rows")
    .select("*")
    .eq("table_id", tableId);

  if (tier) {
    countQuery = countQuery.eq("score_tier", tier);
    dataQuery = dataQuery.eq("score_tier", tier);
  }
  if (status) {
    countQuery = countQuery.eq("status", status);
    dataQuery = dataQuery.eq("status", status);
  }
  if (search) {
    const filter = `domain.ilike.%${search}%,data->>company_name.ilike.%${search}%`;
    countQuery = countQuery.or(filter);
    dataQuery = dataQuery.or(filter);
  }

  dataQuery = dataQuery
    .order(sort, { ascending: order === "asc" })
    .range(from, to);

  const [countResult, dataResult] = await Promise.all([countQuery, dataQuery]);
  if (countResult.error) throw countResult.error;
  if (dataResult.error) throw dataResult.error;

  return {
    rows: (dataResult.data ?? []) as OpsRow[],
    total: countResult.count ?? 0,
  };
}

export async function createRow(
  tableId: string,
  payload: {
    domain?: string;
    data: Record<string, unknown>;
    source?: OpsRow["source"];
    source_meta?: Record<string, unknown>;
  }
): Promise<OpsRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_rows")
    .insert({ table_id: tableId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as OpsRow;
}

export async function bulkInsertRows(
  tableId: string,
  rows: Array<{
    domain?: string;
    data: Record<string, unknown>;
    source?: OpsRow["source"];
    source_meta?: Record<string, unknown>;
  }>
): Promise<{ inserted: number }> {
  const supabase = createAdminClient();
  const payload = rows.map((r) => ({ table_id: tableId, ...r }));
  const { data, error } = await supabase
    .from("ops_rows")
    .insert(payload)
    .select("id");
  if (error) throw error;
  return { inserted: data?.length ?? 0 };
}

export async function getRow(rowId: string): Promise<OpsRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_rows")
    .select("*")
    .eq("id", rowId)
    .single();
  if (error) throw error;
  return data as OpsRow;
}

export async function updateRow(
  rowId: string,
  updates: Partial<OpsRow>
): Promise<OpsRow> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_rows")
    .update(updates)
    .eq("id", rowId)
    .select()
    .single();
  if (error) throw error;
  return data as OpsRow;
}

export async function deleteRow(rowId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ops_rows")
    .delete()
    .eq("id", rowId);
  if (error) throw error;
}

// ── Cell Values ──

export async function getCellValues(rowId: string): Promise<OpsCellValue[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_cell_values")
    .select("*")
    .eq("row_id", rowId);
  if (error) throw error;
  return (data ?? []) as OpsCellValue[];
}

export async function upsertCellValue(
  rowId: string,
  columnId: string,
  payload: {
    value?: string | null;
    raw_value?: Record<string, unknown> | null;
    source?: string | null;
    confidence?: number | null;
    cached_until?: string | null;
  }
): Promise<OpsCellValue> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_cell_values")
    .upsert(
      { row_id: rowId, column_id: columnId, ...payload },
      { onConflict: "row_id,column_id" }
    )
    .select()
    .single();
  if (error) throw error;
  return data as OpsCellValue;
}

// ── Templates ──

export async function listTemplates(
  workspaceId?: string
): Promise<OpsTemplate[]> {
  const supabase = createAdminClient();
  let query = supabase.from("ops_templates").select("*");
  if (workspaceId) {
    query = query.or(`is_native.eq.true,workspace_id.eq.${workspaceId}`);
  } else {
    query = query.eq("is_native", true);
  }
  const { data, error } = await query.order("name");
  if (error) throw error;
  return (data ?? []) as OpsTemplate[];
}

export async function getTemplate(
  templateIdOrSlug: string
): Promise<OpsTemplate> {
  const supabase = createAdminClient();
  // Try UUID first, then slug
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(templateIdOrSlug);
  const column = isUuid ? "id" : "slug";
  const { data, error } = await supabase
    .from("ops_templates")
    .select("*")
    .eq(column, templateIdOrSlug)
    .single();
  if (error) throw error;
  return data as OpsTemplate;
}

export async function getTemplateBySlug(
  slug: string
): Promise<OpsTemplate> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_templates")
    .select("*")
    .eq("slug", slug)
    .single();
  if (error) throw error;
  return data as OpsTemplate;
}

export async function instantiateTemplate(
  templateIdOrSlug: string,
  workspaceId: string,
  tableName: string
): Promise<OpsTable> {
  const template = await getTemplate(templateIdOrSlug);

  const table = await createTable({
    workspace_id: workspaceId,
    name: tableName,
    template_id: template.id,
    scoring_config: template.scoring_config,
    settings: template.settings,
  });

  // Create columns from template
  const columnPromises = template.columns_config.map((col) =>
    createColumn(table.id, {
      name: col.name,
      key: col.key,
      column_type: col.column_type,
      position: col.position,
      config: col.config,
      is_visible: col.is_visible,
    })
  );
  await Promise.all(columnPromises);

  return table;
}

// ── Automations ──

export async function listAutomations(
  tableId: string
): Promise<OpsAutomation[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_automations")
    .select("*")
    .eq("table_id", tableId)
    .order("created_at");
  if (error) throw error;
  return (data ?? []) as OpsAutomation[];
}

export async function createAutomation(
  tableId: string,
  payload: {
    name: string;
    automation_type: OpsAutomation["automation_type"];
    trigger_tier: OpsAutomation["trigger_tier"];
    config?: Record<string, unknown>;
    is_active?: boolean;
  }
): Promise<OpsAutomation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_automations")
    .insert({ table_id: tableId, ...payload })
    .select()
    .single();
  if (error) throw error;
  return data as OpsAutomation;
}

export async function updateAutomation(
  automationId: string,
  updates: Partial<OpsAutomation>
): Promise<OpsAutomation> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_automations")
    .update(updates)
    .eq("id", automationId)
    .select()
    .single();
  if (error) throw error;
  return data as OpsAutomation;
}

export async function deleteAutomation(
  automationId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("ops_automations")
    .delete()
    .eq("id", automationId);
  if (error) throw error;
}

// ── Score History ──

export async function getScoreHistory(
  rowId: string
): Promise<OpsScoreHistoryEntry[]> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_score_history")
    .select("*")
    .eq("row_id", rowId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as OpsScoreHistoryEntry[];
}

export async function insertScoreHistory(
  entry: Omit<OpsScoreHistoryEntry, "id" | "created_at">
): Promise<OpsScoreHistoryEntry> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("ops_score_history")
    .insert(entry)
    .select()
    .single();
  if (error) throw error;
  return data as OpsScoreHistoryEntry;
}
