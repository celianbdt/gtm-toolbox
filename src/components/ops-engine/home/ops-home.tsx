"use client";

import { useCallback, useEffect, useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table2,
  Rows3,
  Flame,
  Coins,
} from "lucide-react";
import type { OpsTable, ThresholdTier } from "@/lib/ops-engine/types";
import { TemplatePicker } from "./template-picker";
import { TableCard } from "./table-card";

type TableMeta = {
  table: OpsTable;
  rowCount: number;
  tierDistribution: Partial<Record<ThresholdTier, number>>;
};

export function OpsHome({
  workspaceId,
  onNavigateTable,
  onNavigateCost,
}: {
  workspaceId: string;
  onNavigateTable: (tableId: string) => void;
  onNavigateCost?: () => void;
}) {
  const [tables, setTables] = useState<TableMeta[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTables = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(
        `/api/ops-engine/tables?workspace_id=${workspaceId}`
      );
      if (!res.ok) throw new Error("Failed to load tables");
      const data = await res.json();

      const metas: TableMeta[] = (data.tables ?? []).map(
        (t: OpsTable) => ({
          table: t,
          rowCount: 0,
          tierDistribution: {},
        })
      );

      // Fetch row counts in parallel (best-effort)
      await Promise.allSettled(
        metas.map(async (meta) => {
          try {
            const rowRes = await fetch(
              `/api/ops-engine/tables/${meta.table.id}/rows?limit=1`
            );
            if (rowRes.ok) {
              const rowData = await rowRes.json();
              meta.rowCount = rowData.total ?? rowData.rows?.length ?? 0;
              if (rowData.tier_counts) {
                meta.tierDistribution = rowData.tier_counts;
              }
            }
          } catch {
            // ignore per-table errors
          }
        })
      );

      setTables(metas);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchTables();
  }, [fetchTables]);

  function handleTableCreated(table: OpsTable) {
    onNavigateTable(table.id);
  }

  // Stats
  const totalTables = tables.length;
  const totalRows = tables.reduce((s, m) => s + m.rowCount, 0);
  const hotAccounts = tables.reduce(
    (s, m) =>
      s + (m.tierDistribution.hot ?? 0) + (m.tierDistribution.priority ?? 0),
    0
  );

  return (
    <div className="flex flex-col gap-8 p-6 overflow-y-auto flex-1">
      {/* Quick stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          icon={<Table2 className="size-4 text-primary" />}
          label="Tables"
          value={loading ? null : totalTables}
        />
        <StatCard
          icon={<Rows3 className="size-4 text-primary" />}
          label="Total rows"
          value={loading ? null : totalRows}
        />
        <StatCard
          icon={<Flame className="size-4 text-orange-400" />}
          label="Hot accounts"
          value={loading ? null : hotAccounts}
        />
        <button
          onClick={onNavigateCost}
          className="text-left transition-colors hover:ring-primary/40 hover:ring-2 rounded-xl"
        >
          <StatCard
            icon={<Coins className="size-4 text-emerald-400" />}
            label="Cost & Budget"
            value={loading ? null : "→"}
          />
        </button>
      </div>

      {/* Template picker */}
      <TemplatePicker
        workspaceId={workspaceId}
        onTableCreated={handleTableCreated}
      />

      {/* Existing tables */}
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Your tables
        </h3>
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : error ? (
          <p className="text-sm text-destructive">{error}</p>
        ) : tables.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No tables yet. Pick a template above to get started.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {tables.map((m) => (
              <TableCard
                key={m.table.id}
                table={m.table}
                rowCount={m.rowCount}
                tierDistribution={m.tierDistribution}
                onClick={() => onNavigateTable(m.table.id)}
                onDelete={async () => {
                  await fetch(`/api/ops-engine/tables/${m.table.id}`, {
                    method: "DELETE",
                  });
                  setTables((prev) =>
                    prev.filter((t) => t.table.id !== m.table.id)
                  );
                }}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string | null;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      {icon}
      <div className="flex flex-col">
        {value === null ? (
          <Skeleton className="h-5 w-10" />
        ) : (
          <span className="text-lg font-semibold">{value}</span>
        )}
        <span className="text-xs text-muted-foreground">{label}</span>
      </div>
    </div>
  );
}
