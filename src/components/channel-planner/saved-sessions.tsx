"use client";

import { useState, useEffect } from "react";
import { Clock, ChevronRight, AlertCircle, CheckCircle } from "lucide-react";
import type { CPSession } from "@/lib/channel-planner/types";
import { GROWTH_STAGE_LABELS } from "@/lib/channel-planner/types";

type Props = {
  workspaceId: string;
  onSelectSession: (sessionId: string) => void;
};

const STATUS_CONFIG: Record<
  string,
  { icon: typeof CheckCircle; label: string; color: string }
> = {
  concluded: { icon: CheckCircle, label: "Complete", color: "text-green-400" },
  active: { icon: Clock, label: "In progress", color: "text-yellow-400" },
  paused: { icon: AlertCircle, label: "Paused", color: "text-orange-400" },
};

export function SavedSessions({ workspaceId, onSelectSession }: Props) {
  const [sessions, setSessions] = useState<CPSession[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/channel-planner/sessions?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-6 h-6 border-2 border-[#8a6e4e] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="text-center">
          <p className="text-sm text-muted-foreground">
            No saved sessions yet.
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            Run your first channel plan to see it here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 space-y-2">
      {sessions.map((session) => {
        const config = STATUS_CONFIG[session.status] ?? STATUS_CONFIG.active;
        const StatusIcon = config.icon;
        const stage = session.config?.goals
          ? GROWTH_STAGE_LABELS[session.config.goals.growth_stage]
          : "";
        const budget = session.config?.budget
          ? `$${session.config.budget.total_monthly.toLocaleString()}/mo`
          : "";
        const date = new Date(session.created_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          hour: "2-digit",
          minute: "2-digit",
        });

        return (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="w-full flex items-center gap-3 p-4 border border-border rounded-lg hover:border-[#8a6e4e]/20 transition-colors text-left group"
          >
            <StatusIcon className={`size-4 shrink-0 ${config.color}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">
                {session.title}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-muted-foreground">{date}</span>
                {stage && (
                  <>
                    <span className="text-muted-foreground/30">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {stage}
                    </span>
                  </>
                )}
                {budget && (
                  <>
                    <span className="text-muted-foreground/30">&middot;</span>
                    <span className="text-xs text-muted-foreground">
                      {budget}
                    </span>
                  </>
                )}
                <span className="text-muted-foreground/30">&middot;</span>
                <span className={`text-[10px] ${config.color}`}>
                  {config.label}
                </span>
              </div>
            </div>
            <ChevronRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>
        );
      })}
    </div>
  );
}
