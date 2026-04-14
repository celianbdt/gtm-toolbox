"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
  type RowSelectionState,
} from "@tanstack/react-table";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  Sparkles,
  Calculator,
  Radio,
  Database,
  Settings,
} from "lucide-react";
import type {
  OpsRow,
  OpsColumn,
  OpsTable,
  ThresholdTier,
  OpsColumnType,
} from "@/lib/ops-engine/types";
import { ScoreBadge } from "../scoring/score-badge";
import { GridToolbar } from "./grid-toolbar";
import { AddColumnDialog } from "./add-column-dialog";
import { RowDetailSheet } from "./row-detail-sheet";
import { CsvMappingDialog } from "./csv-mapping-dialog";

const TYPE_ICONS: Record<OpsColumnType, React.ComponentType<{ className?: string }>> = {
  enricher: Database,
  ai_column: Sparkles,
  formula: Calculator,
  signal_input: Radio,
  static: Settings,
};

export function OpsGrid({
  tableId,
  onBack,
  onOpenConfig,
}: {
  tableId: string;
  onBack: () => void;
  onOpenConfig: () => void;
}) {
  // Data state
  const [table, setTable] = useState<OpsTable | null>(null);
  const [columns, setColumns] = useState<OpsColumn[]>([]);
  const [rows, setRows] = useState<OpsRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  // Pagination
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);

  // Search & filters
  const [search, setSearch] = useState("");
  const [activeTiers, setActiveTiers] = useState<Set<ThresholdTier>>(new Set());

  // Table features
  const [sorting, setSorting] = useState<SortingState>([]);
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});

  // Dialogs
  const [addColumnOpen, setAddColumnOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<OpsRow | null>(null);
  const [csvMappingOpen, setCsvMappingOpen] = useState(false);
  const [csvParsedData, setCsvParsedData] = useState<Record<string, string>[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);

  // Data fetching
  const fetchTable = useCallback(async () => {
    try {
      const res = await fetch(`/api/ops-engine/tables/${tableId}`);
      if (res.ok) {
        const data = await res.json();
        setTable(data.table);
      }
    } catch {
      // ignore
    }
  }, [tableId]);

  const fetchColumns = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/ops-engine/tables/${tableId}/columns`
      );
      if (res.ok) {
        const data = await res.json();
        setColumns(
          (data.columns ?? []).sort(
            (a: OpsColumn, b: OpsColumn) => a.position - b.position
          )
        );
      }
    } catch {
      // ignore
    }
  }, [tableId]);

  const fetchRows = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: String(page),
        limit: String(pageSize),
      });
      if (search) params.set("search", search);
      if (activeTiers.size > 0) {
        params.set("tier", Array.from(activeTiers).join(","));
      }
      if (sorting.length > 0) {
        params.set("sort", sorting[0].id);
        params.set("order", sorting[0].desc ? "desc" : "asc");
      }

      const res = await fetch(
        `/api/ops-engine/tables/${tableId}/rows?${params.toString()}`
      );
      if (res.ok) {
        const data = await res.json();
        setRows(data.rows ?? []);
        setTotal(data.total ?? 0);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [tableId, page, pageSize, search, activeTiers, sorting]);

  useEffect(() => {
    fetchTable();
    fetchColumns();
  }, [fetchTable, fetchColumns]);

  useEffect(() => {
    fetchRows();
  }, [fetchRows]);

  // Column definitions for react-table
  const columnDefs = useMemo<ColumnDef<OpsRow>[]>(() => {
    const defs: ColumnDef<OpsRow>[] = [];

    // Checkbox column
    defs.push({
      id: "select",
      header: ({ table }) => (
        <input
          type="checkbox"
          checked={table.getIsAllPageRowsSelected()}
          onChange={table.getToggleAllPageRowsSelectedHandler()}
          className="accent-amber-700"
        />
      ),
      cell: ({ row }) => (
        <input
          type="checkbox"
          checked={row.getIsSelected()}
          onChange={row.getToggleSelectedHandler()}
          className="accent-amber-700"
        />
      ),
      size: 32,
      enableSorting: false,
    });

    // Score column
    defs.push({
      id: "score",
      header: "Score",
      accessorFn: (row) => row.score_total,
      cell: ({ row }) => (
        <ScoreBadge
          tier={row.original.score_tier}
          score={row.original.score_total}
        />
      ),
      size: 100,
    });

    // Domain column
    defs.push({
      id: "domain",
      header: "Domain",
      accessorFn: (row) => row.domain,
      cell: ({ row }) => (
        <span className="font-medium text-xs truncate">
          {row.original.domain ?? "—"}
        </span>
      ),
      size: 160,
    });

    // Dynamic columns from ops_columns
    for (const col of columns.filter((c) => c.is_visible)) {
      const Icon = TYPE_ICONS[col.column_type] ?? Settings;
      defs.push({
        id: col.key,
        header: () => (
          <div className="flex items-center gap-1">
            <Icon className="size-3 text-muted-foreground" />
            <span className="truncate">{col.name}</span>
          </div>
        ),
        accessorFn: (row) => row.data?.[col.key] ?? null,
        cell: ({ getValue }) => {
          const val = getValue();
          if (val == null) return <span className="text-muted-foreground">—</span>;

          switch (col.column_type) {
            case "enricher":
              return (
                <div className="flex items-center gap-1">
                  <span className="text-xs truncate">{String(val)}</span>
                  <Database className="size-2.5 text-primary shrink-0" />
                </div>
              );
            case "ai_column":
              return (
                <div className="flex items-center gap-1">
                  <span className="text-xs truncate">{String(val)}</span>
                  <Sparkles className="size-2.5 text-primary shrink-0" />
                </div>
              );
            case "formula":
              return (
                <div className="flex items-center gap-1">
                  <span className="text-xs truncate font-mono">
                    {String(val)}
                  </span>
                  <Calculator className="size-2.5 text-blue-400 shrink-0" />
                </div>
              );
            case "signal_input":
              return (
                <div className="flex items-center gap-1">
                  <span className="text-xs truncate">{String(val)}</span>
                  <Radio className="size-2.5 text-emerald-400 shrink-0" />
                </div>
              );
            default:
              return (
                <span className="text-xs truncate">{String(val)}</span>
              );
          }
        },
        size: 150,
      });
    }

    // Status column
    defs.push({
      id: "status",
      header: "Status",
      accessorFn: (row) => row.status,
      cell: ({ row }) => (
        <Badge variant="secondary" className="text-[10px]">
          {row.original.status}
        </Badge>
      ),
      size: 80,
    });

    return defs;
  }, [columns]);

  const reactTable = useReactTable({
    data: rows,
    columns: columnDefs,
    state: { sorting, rowSelection },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
    pageCount: Math.ceil(total / pageSize),
    enableRowSelection: true,
  });

  const selectedCount = Object.keys(rowSelection).length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  function toggleTier(tier: ThresholdTier) {
    setActiveTiers((prev) => {
      const next = new Set(prev);
      if (next.has(tier)) next.delete(tier);
      else next.add(tier);
      return next;
    });
    setPage(1);
  }

  async function handleAddRow() {
    try {
      const res = await fetch(
        `/api/ops-engine/tables/${tableId}/rows`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ data: {}, source: "manual" }),
        }
      );
      if (res.ok) {
        const { row } = await res.json();
        setRows((prev) => [row, ...prev]);
        setTotal((prev) => prev + 1);
      }
    } catch (err) {
      console.error(err);
    }
  }

  async function handleImportCsv(file: File) {
    try {
      const text = await file.text();
      const Papa = (await import("papaparse")).default;
      const result = Papa.parse<Record<string, string>>(text, {
        header: true,
        skipEmptyLines: true,
      });
      if (result.data.length === 0) return;
      setCsvHeaders(result.meta.fields ?? Object.keys(result.data[0]));
      setCsvParsedData(result.data);
      setCsvMappingOpen(true);
    } catch (err) {
      console.error("CSV parse error:", err);
    }
  }

  async function handleCsvMappingConfirm(mapping: Record<string, string>, domainColumn: string | null, createNewColumns: string[]) {
    try {
      // 1. Create new columns if needed
      for (const csvCol of createNewColumns) {
        const key = mapping[csvCol]; // the target key we already computed
        await fetch(`/api/ops-engine/tables/${tableId}/columns`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: csvCol,
            key,
            column_type: "static",
            position: columns.length + createNewColumns.indexOf(csvCol),
          }),
        });
      }

      // 2. Map CSV rows → API rows with correct column keys
      const mappedRows = csvParsedData.map((csvRow) => {
        const data: Record<string, unknown> = {};
        for (const [csvCol, targetKey] of Object.entries(mapping)) {
          if (targetKey && csvRow[csvCol] != null && csvRow[csvCol] !== "") {
            data[targetKey] = csvRow[csvCol];
          }
        }
        return data;
      });

      // 3. Detect domain_column target key for the API
      const domainTargetKey = domainColumn ? mapping[domainColumn] ?? null : null;

      // 4. Bulk insert
      await fetch(`/api/ops-engine/tables/${tableId}/rows/bulk`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: mappedRows,
          source: "csv_import",
          domain_column: domainTargetKey ?? undefined,
        }),
      });

      setCsvMappingOpen(false);
      setCsvParsedData([]);
      setCsvHeaders([]);
      fetchColumns();
      fetchRows();
    } catch (err) {
      console.error("CSV import error:", err);
    }
  }

  async function handleEnrichSelected() {
    const selectedRowIds = Object.keys(rowSelection)
      .filter((k) => rowSelection[k])
      .map((idx) => rows[Number(idx)]?.id)
      .filter(Boolean);
    if (selectedRowIds.length === 0) return;
    try {
      await fetch(`/api/ops-engine/tables/${tableId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_ids: selectedRowIds }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
      {/* Header */}
      <div className="shrink-0 flex items-center gap-3 px-4 py-3 border-b border-border">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ChevronLeft className="size-4" />
          Back
        </Button>
        <div className="flex-1 min-w-0">
          <h2 className="text-sm font-medium truncate">
            {table?.name ?? "Loading..."}
          </h2>
          {table?.description && (
            <p className="text-xs text-muted-foreground truncate">
              {table.description}
            </p>
          )}
        </div>
        <Button variant="outline" size="sm" onClick={onOpenConfig}>
          <Settings className="size-3" />
          Scoring
        </Button>
      </div>

      {/* Toolbar */}
      <GridToolbar
        search={search}
        onSearchChange={(v) => {
          setSearch(v);
          setPage(1);
        }}
        activeTiers={activeTiers}
        onToggleTier={toggleTier}
        selectedCount={selectedCount}
        onAddRow={handleAddRow}
        onAddColumn={() => setAddColumnOpen(true)}
        onImportCsv={handleImportCsv}
        onEnrichSelected={handleEnrichSelected}
      />

      {/* Grid */}
      <div className="flex-1 overflow-auto">
        {loading && rows.length === 0 ? (
          <div className="p-4 flex flex-col gap-1">
            {Array.from({ length: 10 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          <table className="w-full text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-card">
              {reactTable.getHeaderGroups().map((hg) => (
                <tr key={hg.id}>
                  {hg.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-2 py-1.5 text-left font-medium text-muted-foreground border-b border-border whitespace-nowrap select-none"
                      style={{ width: header.getSize() }}
                      onClick={header.column.getToggleSortingHandler()}
                    >
                      <div className="flex items-center gap-1 cursor-pointer">
                        {header.isPlaceholder
                          ? null
                          : flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                        {header.column.getIsSorted() === "asc" && (
                          <ArrowUp className="size-3" />
                        )}
                        {header.column.getIsSorted() === "desc" && (
                          <ArrowDown className="size-3" />
                        )}
                      </div>
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody>
              {reactTable.getRowModel().rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnDefs.length}
                    className="px-4 py-12 text-center text-muted-foreground"
                  >
                    No rows found.
                  </td>
                </tr>
              ) : (
                reactTable.getRowModel().rows.map((row) => (
                  <tr
                    key={row.id}
                    className="border-b border-border/50 hover:bg-muted/30 cursor-pointer transition-colors"
                    onClick={() => setDetailRow(row.original)}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className="px-2 py-1.5 max-w-0 truncate"
                        style={{ width: cell.column.getSize() }}
                        onClick={
                          cell.column.id === "select"
                            ? (e) => e.stopPropagation()
                            : undefined
                        }
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 border-t border-border text-xs text-muted-foreground">
        <span>
          {total} row{total !== 1 ? "s" : ""}{" "}
          {selectedCount > 0 && `(${selectedCount} selected)`}
        </span>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            <ChevronLeft className="size-3" />
          </Button>
          <span>
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-xs"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            <ChevronRight className="size-3" />
          </Button>
        </div>
      </div>

      {/* Add column dialog */}
      <AddColumnDialog
        open={addColumnOpen}
        onOpenChange={setAddColumnOpen}
        tableId={tableId}
        onColumnCreated={() => {
          fetchColumns();
          fetchRows();
        }}
      />

      {/* CSV mapping dialog */}
      <CsvMappingDialog
        open={csvMappingOpen}
        onOpenChange={setCsvMappingOpen}
        csvHeaders={csvHeaders}
        csvPreview={csvParsedData.slice(0, 3)}
        totalRows={csvParsedData.length}
        existingColumns={columns}
        onConfirm={handleCsvMappingConfirm}
      />

      {/* Row detail sheet */}
      <RowDetailSheet
        open={!!detailRow}
        onOpenChange={(open) => {
          if (!open) setDetailRow(null);
        }}
        tableId={tableId}
        row={detailRow}
        columns={columns}
      />
    </div>
  );
}
