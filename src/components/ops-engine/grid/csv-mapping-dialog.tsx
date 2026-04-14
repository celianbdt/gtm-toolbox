"use client";

import { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Plus, X, Upload } from "lucide-react";
import type { OpsColumn } from "@/lib/ops-engine/types";

type MappingAction = "map" | "create" | "skip";

type ColumnMapping = {
  csvColumn: string;
  action: MappingAction;
  targetKey: string;
};

function buildInitialMappings(
  csvHeaders: string[],
  existingColumns: OpsColumn[]
): ColumnMapping[] {
  return csvHeaders.map((h) => {
    const normalizedKey = h
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_|_$/g, "");
    const match = existingColumns.find(
      (c) =>
        c.key === normalizedKey ||
        c.name.toLowerCase() === h.toLowerCase()
    );
    return {
      csvColumn: h,
      action: match ? "map" : "create",
      targetKey: match ? match.key : normalizedKey,
    };
  });
}

function detectDomainColumn(csvHeaders: string[]): string | null {
  const candidates = ["domain", "website", "url", "site", "company_domain"];
  return (
    csvHeaders.find((h) =>
      candidates.includes(h.toLowerCase().trim())
    ) ?? null
  );
}

export function CsvMappingDialog({
  open,
  onOpenChange,
  csvHeaders,
  csvPreview,
  totalRows,
  existingColumns,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  csvHeaders: string[];
  csvPreview: Record<string, string>[];
  totalRows: number;
  existingColumns: OpsColumn[];
  onConfirm: (
    mapping: Record<string, string>,
    domainColumn: string | null,
    createNewColumns: string[]
  ) => void;
}) {
  const [mappings, setMappings] = useState<ColumnMapping[]>([]);
  const [domainColumn, setDomainColumn] = useState<string | null>(null);

  // Re-initialize mappings every time the dialog opens with new data
  useEffect(() => {
    if (open && csvHeaders.length > 0) {
      setMappings(buildInitialMappings(csvHeaders, existingColumns));
      setDomainColumn(detectDomainColumn(csvHeaders));
    }
  }, [open, csvHeaders, existingColumns]);

  const existingKeys = useMemo(
    () => new Set(existingColumns.map((c) => c.key)),
    [existingColumns]
  );

  function updateMapping(idx: number, updates: Partial<ColumnMapping>) {
    setMappings((prev) =>
      prev.map((m, i) => (i === idx ? { ...m, ...updates } : m))
    );
  }

  function handleConfirm() {
    const mapping: Record<string, string> = {};
    const createNew: string[] = [];

    for (const m of mappings) {
      if (m.action === "skip") continue;
      mapping[m.csvColumn] = m.targetKey;
      if (m.action === "create" && !existingKeys.has(m.targetKey)) {
        createNew.push(m.csvColumn);
      }
    }

    onConfirm(mapping, domainColumn, createNew);
  }

  const previewRow = csvPreview[0] ?? {};
  const mappedCount = mappings.filter((m) => m.action !== "skip").length;
  const skippedCount = mappings.filter((m) => m.action === "skip").length;
  const newCount = mappings.filter(
    (m) => m.action === "create" && !existingKeys.has(m.targetKey)
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="size-4" />
            CSV Import — {totalRows} rows, {csvHeaders.length} columns
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Map each CSV column to an existing table column, create a new one, or skip it.
          </p>
        </DialogHeader>

        {/* Domain column selector */}
        <div className="flex items-center gap-2 px-1 py-2 border-b border-border">
          <span className="text-xs text-muted-foreground shrink-0">
            Domain column:
          </span>
          <select
            value={domainColumn ?? ""}
            onChange={(e) => setDomainColumn(e.target.value || null)}
            className="h-7 text-xs bg-background border border-border rounded px-2"
          >
            <option value="">None (no dedup)</option>
            {csvHeaders.map((h) => (
              <option key={h} value={h}>
                {h}
              </option>
            ))}
          </select>
        </div>

        {/* Mapping rows — all CSV columns */}
        <div className="flex-1 overflow-y-auto space-y-0.5 py-2">
          {mappings.map((m, idx) => (
            <div
              key={m.csvColumn}
              className="flex items-center gap-2 px-1 py-1.5 rounded hover:bg-muted/30"
            >
              {/* CSV column name + preview value */}
              <div className="w-40 shrink-0 min-w-0">
                <div className="text-xs font-medium truncate">
                  {m.csvColumn}
                </div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {previewRow[m.csvColumn] ?? "—"}
                </div>
              </div>

              <ArrowRight className="size-3 text-muted-foreground shrink-0" />

              {/* Target display */}
              <div className="flex items-center gap-1 flex-1 min-w-0">
                {m.action === "skip" ? (
                  <Badge
                    variant="secondary"
                    className="text-[10px] text-muted-foreground"
                  >
                    Skipped
                  </Badge>
                ) : m.action === "map" ? (
                  <select
                    value={m.targetKey}
                    onChange={(e) =>
                      updateMapping(idx, { targetKey: e.target.value })
                    }
                    className="h-7 text-xs bg-background border border-border rounded px-2 flex-1 min-w-0"
                  >
                    {existingColumns.map((c) => (
                      <option key={c.key} value={c.key}>
                        {c.name} ({c.key})
                      </option>
                    ))}
                  </select>
                ) : (
                  <Badge className="text-[10px] bg-primary/10 text-primary border-primary/20">
                    <Plus className="size-2.5 mr-0.5" />
                    New column: {m.targetKey}
                  </Badge>
                )}
              </div>

              {/* Action toggle buttons */}
              <div className="flex items-center gap-0.5 shrink-0">
                {existingColumns.length > 0 && (
                  <button
                    onClick={() =>
                      updateMapping(idx, {
                        action: "map",
                        targetKey: existingColumns[0]?.key ?? "",
                      })
                    }
                    className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                      m.action === "map"
                        ? "bg-blue-500/10 text-blue-400"
                        : "text-muted-foreground hover:bg-muted"
                    }`}
                  >
                    Map
                  </button>
                )}
                <button
                  onClick={() =>
                    updateMapping(idx, {
                      action: "create",
                      targetKey: m.csvColumn
                        .toLowerCase()
                        .replace(/[^a-z0-9]+/g, "_")
                        .replace(/^_|_$/g, ""),
                    })
                  }
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                    m.action === "create"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  New
                </button>
                <button
                  onClick={() => updateMapping(idx, { action: "skip" })}
                  className={`px-1.5 py-0.5 rounded text-[10px] transition-colors ${
                    m.action === "skip"
                      ? "bg-red-500/10 text-red-400"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <X className="size-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Summary */}
        <div className="flex items-center gap-3 text-xs text-muted-foreground border-t border-border pt-2">
          <span>{mappedCount} mapped</span>
          {newCount > 0 && (
            <span className="text-primary">{newCount} new columns</span>
          )}
          {skippedCount > 0 && <span>{skippedCount} skipped</span>}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            onClick={handleConfirm}
            disabled={mappedCount === 0}
          >
            Import {totalRows} rows
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
