"use client";

import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import type { IntegrationStatus } from "@/lib/integrations/types";

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60_000);

  if (diffMin < 1) return "à l'instant";
  if (diffMin < 60) return `il y a ${diffMin}min`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `il y a ${diffH}h`;
  const diffD = Math.floor(diffH / 24);
  return `il y a ${diffD}j`;
}

export function SyncStatusBadge({
  status,
  lastSyncAt,
}: {
  status: IntegrationStatus;
  lastSyncAt: string | null;
}) {
  switch (status) {
    case "connected":
      return (
        <div className="flex items-center gap-2">
          <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/25">
            Connecté
          </Badge>
          {lastSyncAt && (
            <span className="text-xs text-muted-foreground">
              Sync {relativeTime(lastSyncAt)}
            </span>
          )}
        </div>
      );
    case "disconnected":
      return (
        <Badge className="bg-zinc-500/15 text-muted-foreground border-zinc-500/25">
          Non connecté
        </Badge>
      );
    case "error":
      return (
        <Badge className="bg-red-500/15 text-red-400 border-red-500/25">
          Erreur
        </Badge>
      );
    case "syncing":
      return (
        <Badge className="bg-amber-500/15 text-amber-400 border-amber-500/25 flex items-center gap-1.5">
          <Loader2 className="h-3 w-3 animate-spin" />
          Sync en cours...
        </Badge>
      );
  }
}
