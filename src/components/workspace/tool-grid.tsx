"use client";

import Link from "next/link";
import * as LucideIcons from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { tools } from "@/lib/tools/registry";
import type { ToolCategory } from "@/lib/tools/types";

function getIcon(iconName: string) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icons = LucideIcons as any;
  return icons[iconName] ?? LucideIcons.Box;
}

const categoryLabels: Record<ToolCategory, string> = {
  strategy: "Strategy",
  messaging: "Messaging",
  analysis: "Analysis",
  outbound: "Outbound",
  ops: "Ops Engine",
  dev: "Dev",
};

const categoryColors: Record<ToolCategory, string> = {
  strategy: "text-[#c4a882]",
  messaging: "text-[#D8CDFF]",
  analysis: "text-[#8a6e4e]",
  outbound: "text-[#10B981]",
  ops: "text-[#f97316]",
  dev: "text-[#f59e0b]",
};

export function ToolGrid({ workspaceSlug }: { workspaceSlug: string }) {
  const categories = [...new Set(tools.map((t) => t.category))];

  return (
    <div className="space-y-8">
      {categories.map((category) => {
        const categoryTools = tools.filter((t) => t.category === category);
        return (
          <div key={category}>
            <h3
              className={`text-xs font-semibold uppercase tracking-wider mb-3 ${categoryColors[category]}`}
            >
              {categoryLabels[category]}
            </h3>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {categoryTools.map((tool) => {
                const Icon = getIcon(tool.icon);
                const isActive = tool.status === "active";

                const card = (
                  <Card
                    className={`group transition-colors ${
                      isActive
                        ? "cursor-pointer hover:border-primary/50"
                        : "opacity-50 cursor-not-allowed"
                    }`}
                  >
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
                            {!isActive && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] px-1.5 py-0 shrink-0"
                              >
                                Coming soon
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
                    <Link
                      key={tool.id}
                      href={`/${workspaceSlug}/tools/${tool.href}`}
                    >
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
    </div>
  );
}
