import type { OpsRow } from "../types";

/**
 * Replace {{variable}} placeholders in a template string with values from
 * the row's data, plus top-level row fields (domain, score_total, score_tier,
 * source, status).
 */
export function replaceTemplateVars(template: string, row: OpsRow): string {
  const flatData: Record<string, string> = {
    domain: row.domain ?? "",
    score: String(row.score_total),
    score_total: String(row.score_total),
    tier: row.score_tier,
    score_tier: row.score_tier,
    source: row.source ?? "",
    status: row.status,
  };

  // Merge row.data — flatten to strings
  for (const [key, value] of Object.entries(row.data)) {
    if (value !== null && value !== undefined) {
      flatData[key] =
        typeof value === "object" ? JSON.stringify(value) : String(value);
    }
  }

  return template.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    return flatData[key] ?? "";
  });
}

/**
 * Map row data to a provider-specific payload using a field mapping.
 * field_mapping: { providerField: "row_data_key" }
 */
export function mapFields(
  row: OpsRow,
  fieldMapping: Record<string, string>,
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const flatData: Record<string, unknown> = {
    domain: row.domain,
    score_total: row.score_total,
    score_tier: row.score_tier,
    source: row.source,
    ...row.data,
  };

  for (const [providerField, rowKey] of Object.entries(fieldMapping)) {
    if (rowKey in flatData) {
      result[providerField] = flatData[rowKey];
    }
  }

  return result;
}
