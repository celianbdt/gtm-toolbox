"use client";

import { useState, useEffect, useCallback } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportEditor } from "./report-editor";
import {
  Eye,
  Copy,
  Trash2,
  Check,
  Calendar,
  FileText,
} from "lucide-react";
import type { WeeklyReport } from "@/lib/types/project";

type ReportHistoryProps = {
  refreshKey?: number;
};

export function ReportHistory({ refreshKey }: ReportHistoryProps) {
  const workspace = useWorkspace();
  const [reports, setReports] = useState<WeeklyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewingReport, setViewingReport] = useState<WeeklyReport | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchReports = useCallback(async () => {
    try {
      const res = await fetch(
        `/api/project/reports?workspace_id=${workspace.id}`
      );
      if (res.ok) {
        const data = await res.json();
        setReports(data.reports ?? data);
      }
    } finally {
      setLoading(false);
    }
  }, [workspace.id]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports, refreshKey]);

  const handleCopyLink = useCallback(
    async (report: WeeklyReport) => {
      const url = `${window.location.origin}/report/${report.share_token}`;
      await navigator.clipboard.writeText(url);
      setCopiedId(report.id);
      setTimeout(() => setCopiedId(null), 2000);
    },
    []
  );

  const handleDelete = useCallback(
    async (reportId: string) => {
      if (deletingId === reportId) {
        // Second click = confirm
        try {
          const res = await fetch(`/api/project/reports/${reportId}`, {
            method: "DELETE",
          });
          if (res.ok) {
            setReports((prev) => prev.filter((r) => r.id !== reportId));
          }
        } finally {
          setDeletingId(null);
        }
      } else {
        // First click = ask confirm
        setDeletingId(reportId);
        setTimeout(() => setDeletingId(null), 3000);
      }
    },
    [deletingId]
  );

  const formatWeekDate = (dateStr: string) => {
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatCreatedAt = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (loading) {
    return (
      <div className="flex flex-col gap-2">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  if (reports.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <FileText className="size-10 text-muted-foreground/40 mb-3" />
        <p className="text-sm text-muted-foreground">
          Aucun rapport pour le moment. Generez votre premier rapport ci-dessus.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-2">
        {reports.map((report) => (
          <Card key={report.id} size="sm">
            <CardContent className="flex items-center justify-between gap-3">
              {/* Info */}
              <div className="flex items-center gap-3 min-w-0">
                <Calendar className="size-4 text-muted-foreground shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">
                    Semaine du {formatWeekDate(report.week_start)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Cree le {formatCreatedAt(report.created_at)}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0 text-xs">
                  Rapport
                </Badge>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setViewingReport(report)}
                  title="Voir le rapport"
                >
                  <Eye className="size-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleCopyLink(report)}
                  title="Copier le lien de partage"
                >
                  {copiedId === report.id ? (
                    <Check className="size-3.5 text-green-500" />
                  ) : (
                    <Copy className="size-3.5" />
                  )}
                </Button>
                <Button
                  variant={deletingId === report.id ? "destructive" : "ghost"}
                  size="icon-sm"
                  onClick={() => handleDelete(report.id)}
                  title={
                    deletingId === report.id
                      ? "Cliquez pour confirmer"
                      : "Supprimer"
                  }
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* View report dialog */}
      <Dialog
        open={!!viewingReport}
        onOpenChange={(open) => !open && setViewingReport(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {viewingReport &&
                `Rapport — Semaine du ${formatWeekDate(viewingReport.week_start)}`}
            </DialogTitle>
          </DialogHeader>
          {viewingReport && (
            <ReportEditor
              content={viewingReport.raw_markdown}
              onChange={() => {}}
              readOnly
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
