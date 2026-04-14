"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { CHANNEL_LABELS, TONE_LABELS, type CWSession, type CWSessionConfig } from "@/lib/copywriting/types";

type Props = {
  workspaceId: string;
  onSelect: (sessionId: string) => void;
};

export function SavedSessions({ workspaceId, onSelect }: Props) {
  const [sessions, setSessions] = useState<CWSession[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`/api/copywriting/sessions?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 rounded-xl" />
        ))}
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="text-center py-12 text-sm text-muted-foreground">
        Aucune session de copywriting. Cree-en une nouvelle.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      {sessions.map((session) => {
        const config = session.config as CWSessionConfig;
        return (
          <Card
            key={session.id}
            className="cursor-pointer hover:border-amber-700/30 transition-colors"
            onClick={() => onSelect(session.id)}
          >
            <CardContent className="py-3 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium truncate">{session.title}</span>
                <Badge
                  variant={session.status === "concluded" ? "secondary" : "outline"}
                  className="text-[10px] shrink-0"
                >
                  {session.status === "concluded" ? "Termine" : "En cours"}
                </Badge>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant="outline" className="text-[10px]">
                  {CHANNEL_LABELS[config.channel]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {TONE_LABELS[config.tone]}
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {config.sequence_length} steps
                </Badge>
                <Badge variant="outline" className="text-[10px]">
                  {config.mode === "deep" ? "Deep" : "Quick"}
                </Badge>
              </div>
              <p className="text-[11px] text-muted-foreground">
                {new Date(session.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
