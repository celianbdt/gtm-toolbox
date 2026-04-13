"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Lock, ChevronRight } from "lucide-react";
import { tools } from "@/lib/tools/registry";
import type { ToolStage } from "@/lib/tools/types";

function getIcon(iconName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  return icons[iconName] ?? LucideIcons.Box;
}

const STAGE_CONFIG: Record<ToolStage, { label: string; color: string; bgColor: string }> = {
  discovery: { label: "Discovery", color: "text-blue-400", bgColor: "bg-blue-500/10" },
  foundation: { label: "Foundation", color: "text-violet-400", bgColor: "bg-violet-500/10" },
  optimization: { label: "Optimization", color: "text-amber-400", bgColor: "bg-amber-500/10" },
  scaling: { label: "Scaling", color: "text-emerald-400", bgColor: "bg-emerald-500/10" },
};

type PrereqData = Record<string, { met: boolean; missing: { toolId: string; toolName: string }[] }>;

export function ToolFlow({ workspaceSlug, workspaceId }: { workspaceSlug: string; workspaceId: string }) {
  const [prereqs, setPrereqs] = useState<PrereqData>({});
  const [loading, setLoading] = useState(true);

  const fetchPrereqs = useCallback(async () => {
    try {
      const res = await fetch(`/api/tools/prerequisites?workspace_id=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setPrereqs(data.prerequisites ?? {});
      }
    } catch {
      // fallback: all tools unlocked
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  useEffect(() => {
    fetchPrereqs();
  }, [fetchPrereqs]);

  const stages: ToolStage[] = ["discovery", "foundation", "optimization", "scaling"];
  const stageTools = stages.map((stage) => ({
    stage,
    tools: tools
      .filter((t) => t.stage === stage)
      .sort((a, b) => (a.sequence_order ?? 99) - (b.sequence_order ?? 99)),
  }));

  // Tools without a stage (sandbox, etc.)
  const otherTools = tools.filter((t) => !t.stage);

  return (
    <div className="space-y-6">
      {/* Stage pipeline */}
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
                const prereq = prereqs[tool.id];
                const isLocked = !loading && prereq && !prereq.met;
                const isActive = tool.status === "active" && !isLocked;

                const card = (
                  <Card
                    className={`group transition-all ${
                      isLocked
                        ? "opacity-40 cursor-not-allowed border-dashed"
                        : isActive
                          ? "cursor-pointer hover:border-violet-500/50"
                          : "opacity-50 cursor-not-allowed"
                    }`}
                  >
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div className={`flex size-8 shrink-0 items-center justify-center rounded-md ${isLocked ? "bg-muted" : "bg-secondary"}`}>
                          {isLocked ? (
                            <Lock className="size-4 text-muted-foreground" />
                          ) : (
                            <Icon className="size-4" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-0.5">
                            <span className="text-sm font-medium leading-snug">
                              {tool.name}
                            </span>
                            {isLocked && prereq?.missing && (
                              <Badge variant="secondary" className="text-[9px] px-1 py-0 shrink-0">
                                Requiert {prereq.missing.map((m) => m.toolName).join(", ")}
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );

                if (isActive) {
                  return (
                    <Link key={tool.id} href={`/${workspaceSlug}/tools/${tool.href}`}>
                      {card}
                    </Link>
                  );
                }

                return <div key={tool.id}>{card}</div>;
              })}
            </div>
          </div>
        );
      })}

      {/* Other tools (no stage) */}
      {otherTools.length > 0 && (
        <div>
          <Badge variant="secondary" className="text-[10px] mb-3">Autres</Badge>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {otherTools.map((tool) => {
              const Icon = getIcon(tool.icon);
              return (
                <Link key={tool.id} href={`/${workspaceSlug}/tools/${tool.href}`}>
                  <Card className="group cursor-pointer hover:border-violet-500/50 transition-colors">
                    <CardContent>
                      <div className="flex items-start gap-3">
                        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-secondary">
                          <Icon className="size-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-sm font-medium">{tool.name}</span>
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {tool.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
