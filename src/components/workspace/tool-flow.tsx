"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight } from "lucide-react";
import { tools } from "@/lib/tools/registry";
import type { ToolStage } from "@/lib/tools/types";

function getIcon(iconName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  return icons[iconName] ?? LucideIcons.Box;
}

const STAGE_CONFIG: Record<ToolStage, { label: string; color: string; bgColor: string }> = {
  discovery: { label: "Discovery", color: "text-blue-500", bgColor: "bg-blue-500/10" },
  foundation: { label: "Foundation", color: "text-orange-700", bgColor: "bg-orange-700/10" },
  optimization: { label: "Optimization", color: "text-amber-600", bgColor: "bg-amber-600/10" },
  scaling: { label: "Scaling", color: "text-emerald-600", bgColor: "bg-emerald-600/10" },
};

type CompletedTools = Set<string>;

export function ToolFlow({ workspaceSlug, workspaceId }: { workspaceSlug: string; workspaceId: string }) {
  const [completedTools, setCompletedTools] = useState<CompletedTools>(new Set());

  const fetchCompleted = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/prerequisites?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        const prereqs = data.prerequisites ?? {};
        // A tool is "completed" if it has concluded sessions (check via completed prereqs of others)
        const completed = new Set<string>();
        for (const [, result] of Object.entries(prereqs) as [string, { completed: string[] }][]) {
          for (const toolId of result.completed ?? []) {
            completed.add(toolId);
          }
        }
        setCompletedTools(completed);
      }
    } catch {
      // fallback
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchCompleted();
  }, [fetchCompleted]);

  const stages: ToolStage[] = ["discovery", "foundation", "optimization", "scaling"];
  const stageTools = stages.map((stage) => ({
    stage,
    tools: tools
      .filter((t) => t.stage === stage)
      .sort((a, b) => (a.sequence_order ?? 99) - (b.sequence_order ?? 99)),
  }));

  return (
    <div className="space-y-6">
      {stageTools.map(({ stage, tools: stageToolList }, stageIdx) => {
        const config = STAGE_CONFIG[stage];
        if (stageToolList.length === 0) return null;

        return (
          <div key={stage}>
            <div className="flex items-center gap-2 mb-3">
              {stageIdx > 0 && <ChevronRight className="size-3 text-muted-foreground" />}
              <Badge className={`${config.bgColor} ${config.color} border-0 text-[10px]`}>
                {config.label}
              </Badge>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {stageToolList.map((tool) => {
                const Icon = getIcon(tool.icon);
                const isCompleted = completedTools.has(tool.id);
                const hasUnmetPrereqs = tool.prerequisites?.some((p) => !completedTools.has(p));

                return (
                  <Link key={tool.id} href={`/${workspaceSlug}/tools/${tool.href}`}>
                    <Card className="group cursor-pointer hover:border-primary/50 transition-all">
                      <CardContent>
                        <div className="flex items-start gap-3">
                          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                            <Icon className="size-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-sm font-medium leading-snug">
                                {tool.name}
                              </span>
                              {isCompleted && (
                                <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2">
                              {tool.description}
                            </p>
                            {hasUnmetPrereqs && tool.prerequisites && (
                              <p className="text-[10px] text-muted-foreground/60 mt-1">
                                Recommande apres {tool.prerequisites.map((p) => {
                                  const t = tools.find((t) => t.id === p);
                                  return t?.name ?? p;
                                }).join(", ")}
                              </p>
                            )}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
