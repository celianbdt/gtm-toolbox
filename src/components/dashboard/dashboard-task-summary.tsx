"use client";

import Link from "next/link";
import { AlertTriangleIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";

type Props = {
  workspaces: WorkspaceWithMeta[];
};

type BlockedItem = {
  workspaceName: string;
  workspaceSlug: string;
  blockedCount: number;
};

export function DashboardTaskSummary({ workspaces }: Props) {
  const blockedItems: BlockedItem[] = workspaces
    .filter((ws) => ws.task_summary.blocked > 0)
    .map((ws) => ({
      workspaceName: ws.name,
      workspaceSlug: ws.slug,
      blockedCount: ws.task_summary.blocked,
    }));

  const totalBlocked = blockedItems.reduce(
    (sum, item) => sum + item.blockedCount,
    0
  );

  if (totalBlocked === 0) return null;

  return (
    <Card size="sm" className="border-amber-500/20 bg-amber-500/5">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-amber-400">
          <AlertTriangleIcon className="size-4" />
          {totalBlocked} tache{totalBlocked !== 1 ? "s" : ""} bloquee
          {totalBlocked !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-1.5">
          {blockedItems.map((item) => (
            <li key={item.workspaceSlug} className="flex items-center gap-2">
              <Link
                href={`/workspaces/${item.workspaceSlug}/projects`}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Badge variant="secondary" className="text-xs">
                  {item.workspaceName}
                </Badge>
                <span>
                  {item.blockedCount} bloquee{item.blockedCount !== 1 ? "s" : ""}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
