"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sparkles,
  Archive,
  Clock,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import type {
  OpsRow,
  OpsColumn,
  OpsScoreHistoryEntry,
} from "@/lib/ops-engine/types";
import { ScoreBadge } from "../scoring/score-badge";

export function RowDetailSheet({
  open,
  onOpenChange,
  tableId,
  row,
  columns,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tableId: string;
  row: OpsRow | null;
  columns: OpsColumn[];
}) {
  const [history, setHistory] = useState<OpsScoreHistoryEntry[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const fetchHistory = useCallback(async () => {
    if (!row) return;
    setLoadingHistory(true);
    try {
      const res = await fetch(
        `/api/ops-engine/tables/${tableId}/rows/${row.id}/score-history`
      );
      if (res.ok) {
        const data = await res.json();
        setHistory(data.history ?? []);
      }
    } catch {
      // ignore
    } finally {
      setLoadingHistory(false);
    }
  }, [tableId, row]);

  useEffect(() => {
    if (open && row) fetchHistory();
  }, [open, row, fetchHistory]);

  async function handleEnrich() {
    if (!row) return;
    try {
      await fetch(`/api/ops-engine/tables/${tableId}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ row_ids: [row.id] }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  async function handleArchive() {
    if (!row) return;
    try {
      await fetch(`/api/ops-engine/tables/${tableId}/rows/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "archived" }),
      });
    } catch (err) {
      console.error(err);
    }
  }

  if (!row) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="sm:max-w-md w-full overflow-hidden flex flex-col"
      >
        <SheetHeader className="shrink-0">
          <SheetTitle className="truncate">
            {row.domain ?? "Unknown"}
          </SheetTitle>
          <SheetDescription className="flex items-center gap-2">
            <ScoreBadge tier={row.score_tier} score={row.score_total} />
            <Badge variant="secondary" className="text-[10px]">
              {row.status}
            </Badge>
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 pr-3">
          <div className="flex flex-col gap-5 pb-4">
            {/* Data fields */}
            <section className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Data
              </h4>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5">
                {columns.map((col) => {
                  const val = row.data?.[col.key];
                  return (
                    <div key={col.id} className="contents">
                      <span className="text-xs text-muted-foreground truncate">
                        {col.name}
                      </span>
                      <span className="text-xs truncate">
                        {val != null ? String(val) : "—"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>

            <Separator />

            {/* Enrichment status */}
            <section className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Enrichment
              </h4>
              {row.last_enriched_at ? (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3" />
                  Last enriched:{" "}
                  {new Date(row.last_enriched_at).toLocaleDateString()}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Not enriched yet.
                </p>
              )}
              {row.source && (
                <Badge variant="secondary" className="w-fit text-[10px]">
                  Source: {row.source}
                </Badge>
              )}
            </section>

            <Separator />

            {/* Score history */}
            <section className="flex flex-col gap-2">
              <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Score History
              </h4>
              {loadingHistory ? (
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-6 w-full" />
                  <Skeleton className="h-6 w-full" />
                </div>
              ) : history.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  No score changes recorded.
                </p>
              ) : (
                <div className="flex flex-col gap-1.5">
                  {history.slice(0, 20).map((entry) => {
                    const delta = entry.new_score - entry.previous_score;
                    return (
                      <div
                        key={entry.id}
                        className="flex items-center gap-2 text-xs rounded-md bg-muted/50 px-2 py-1.5"
                      >
                        {delta > 0 ? (
                          <ArrowUp className="size-3 text-emerald-500" />
                        ) : delta < 0 ? (
                          <ArrowDown className="size-3 text-red-500" />
                        ) : (
                          <span className="size-3" />
                        )}
                        <span className="font-mono">
                          {entry.previous_score} → {entry.new_score}
                        </span>
                        <span className="text-muted-foreground truncate flex-1">
                          {entry.reason}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {new Date(entry.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </ScrollArea>

        {/* Actions */}
        <div className="shrink-0 flex items-center gap-2 pt-3 border-t border-border">
          <Button variant="outline" size="sm" onClick={handleEnrich}>
            <Sparkles className="size-3" />
            Enrich
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleArchive}
          >
            <Archive className="size-3" />
            Archive
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}
