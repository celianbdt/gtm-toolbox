"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { CWSSEEvent, CopywritingPhase } from "@/lib/copywriting/types";

type StreamingAgent = {
  agentId: string;
  agentName: string;
  emoji: string;
  color: string;
  content: string;
};

type Props = {
  sessionId: string;
  workspaceId: string;
  onComplete: () => void;
};

const PHASE_LABELS: Record<CopywritingPhase, string> = {
  "context-loading": "Chargement du contexte",
  debate: "Debat des agents",
  generation: "Generation de la sequence",
  complete: "Termine",
};

export function CopywritingArena({ sessionId, workspaceId, onComplete }: Props) {
  const [currentPhase, setCurrentPhase] = useState<CopywritingPhase>("context-loading");
  const [completedPhases, setCompletedPhases] = useState<Set<CopywritingPhase>>(new Set());
  const [agents, setAgents] = useState<Map<string, StreamingAgent>>(new Map());
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  const runGeneration = useCallback(async () => {
    try {
      const res = await fetch("/api/copywriting/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ session_id: sessionId, workspace_id: workspaceId }),
      });

      if (!res.ok || !res.body) {
        setError("Erreur lors de la generation");
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split("\n\n");
        buffer = parts.pop() ?? "";

        for (const part of parts) {
          const cleaned = part.replace(/^data: /, "");
          if (!cleaned.trim()) continue;
          try {
            const event: CWSSEEvent = JSON.parse(cleaned);

            switch (event.type) {
              case "phase_start":
                setCurrentPhase(event.phase);
                break;

              case "phase_done":
                setCompletedPhases((prev) => new Set([...prev, event.phase]));
                break;

              case "agent_start":
                setAgents((prev) => {
                  const next = new Map(prev);
                  next.set(event.agentId, {
                    agentId: event.agentId,
                    agentName: event.agentName,
                    emoji: event.emoji,
                    color: event.color,
                    content: "",
                  });
                  return next;
                });
                break;

              case "agent_delta":
                setAgents((prev) => {
                  const next = new Map(prev);
                  const agent = next.get(event.agentId);
                  if (agent) {
                    next.set(event.agentId, {
                      ...agent,
                      content: agent.content + event.delta,
                    });
                  }
                  return next;
                });
                break;

              case "agent_done":
                setAgents((prev) => {
                  const next = new Map(prev);
                  const agent = next.get(event.agentId);
                  if (agent) {
                    next.set(event.agentId, { ...agent, content: event.fullContent });
                  }
                  return next;
                });
                break;

              case "generation_complete":
                setCurrentPhase("complete");
                setTimeout(onComplete, 1500);
                break;

              case "error":
                setError(event.message);
                break;
            }
          } catch {
            // skip malformed events
          }
        }
      }
    } catch (err) {
      setError(String(err));
    }
  }, [sessionId, workspaceId, onComplete]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    runGeneration();
  }, [runGeneration]);

  const phases: CopywritingPhase[] = ["context-loading", "debate", "generation"];

  return (
    <div className="max-w-2xl space-y-6">
      {/* Phase progress */}
      <div className="flex items-center gap-4">
        {phases.map((phase) => {
          const isCompleted = completedPhases.has(phase);
          const isCurrent = currentPhase === phase;
          return (
            <div key={phase} className="flex items-center gap-2">
              {isCompleted ? (
                <CheckCircle2 className="size-4 text-emerald-500" />
              ) : isCurrent ? (
                <Loader2 className="size-4 text-violet-400 animate-spin" />
              ) : (
                <div className="size-4 rounded-full border border-border" />
              )}
              <span
                className={`text-xs ${
                  isCurrent
                    ? "text-violet-400 font-medium"
                    : isCompleted
                      ? "text-emerald-500"
                      : "text-muted-foreground"
                }`}
              >
                {PHASE_LABELS[phase]}
              </span>
            </div>
          );
        })}
      </div>

      {/* Complete state */}
      {currentPhase === "complete" && (
        <Card className="border-emerald-500/30 bg-emerald-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <CheckCircle2 className="size-5 text-emerald-500" />
            <span className="text-sm font-medium">Sequence generee avec succes</span>
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-red-500/30 bg-red-500/5">
          <CardContent className="py-4">
            <p className="text-sm text-red-400">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Agent streams (debate phase) */}
      {agents.size > 0 && (
        <div className="space-y-3">
          <h3 className="text-sm font-medium text-muted-foreground">Debat des agents</h3>
          {Array.from(agents.values()).map((agent) => (
            <Card key={agent.agentId} className="border-border/50">
              <CardContent className="py-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-lg">{agent.emoji}</span>
                  <Badge
                    variant="secondary"
                    className="text-[10px]"
                    style={{ color: agent.color, backgroundColor: `${agent.color}15` }}
                  >
                    {agent.agentName}
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {agent.content || (
                    <Loader2 className="size-3 animate-spin text-muted-foreground" />
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Loading state for non-debate phases */}
      {currentPhase !== "complete" && agents.size === 0 && !error && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-6 animate-spin text-violet-400 mr-3" />
          <span className="text-sm text-muted-foreground">
            {PHASE_LABELS[currentPhase]}...
          </span>
        </div>
      )}
    </div>
  );
}
