import type { SignalSourceHandler, SignalResult } from "./types";

/**
 * CSV Import Signal Source
 *
 * Handles pre-parsed CSV data passed via the filters object.
 * The CSV is expected to be already parsed into an array of row objects
 * before reaching this handler (parsing happens in the upload route).
 *
 * Filters:
 * - rows: Array of parsed CSV row objects (Record<string, string>[])
 * - domain_column: key used for the domain field (default: "domain")
 * - company_name_column: key used for company name (default: "company_name")
 *
 * Each row is mapped to a SignalResult with the raw CSV data preserved.
 */
export const csvImportHandler: SignalSourceHandler = {
  source: "csv_import",

  async harvest(
    filters: Record<string, unknown>,
    _apiKey?: string
  ): Promise<SignalResult[]> {
    const rows = (filters.rows as Record<string, string>[]) ?? [];
    const domainColumn = (filters.domain_column as string) ?? "domain";
    const companyNameColumn =
      (filters.company_name_column as string) ?? "company_name";

    if (rows.length === 0) {
      console.warn("[csv-import] No rows provided in filters");
      return [];
    }

    console.log(`[csv-import] Processing ${rows.length} rows`);

    const results: SignalResult[] = rows
      .filter((row) => row[domainColumn]) // Skip rows without a domain
      .map((row, index) => ({
        domain: row[domainColumn],
        data: {
          ...row,
          company_name: row[companyNameColumn] ?? row[domainColumn],
        },
        source_meta: {
          csv_row_index: index,
          imported_at: new Date().toISOString(),
          column_mapping: {
            domain: domainColumn,
            company_name: companyNameColumn,
          },
        },
      }));

    return results;
  },
};
