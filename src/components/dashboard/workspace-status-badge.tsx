"use client";

import { Badge } from "@/components/ui/badge";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  PRIORITY_LABELS,
  PRIORITY_COLORS,
  type WorkspaceStatus,
  type WorkspacePriority,
} from "@/lib/types/dashboard";

export function WorkspaceStatusBadge({ status }: { status: WorkspaceStatus }) {
  return (
    <Badge
      variant="outline"
      className="text-xs font-medium"
      style={{
        borderColor: STATUS_COLORS[status],
        color: STATUS_COLORS[status],
        backgroundColor: `${STATUS_COLORS[status]}15`,
      }}
    >
      {STATUS_LABELS[status]}
    </Badge>
  );
}

export function WorkspacePriorityBadge({
  priority,
}: {
  priority: WorkspacePriority;
}) {
  return (
    <Badge
      variant="outline"
      className="text-xs font-medium"
      style={{
        borderColor: PRIORITY_COLORS[priority],
        color: PRIORITY_COLORS[priority],
        backgroundColor: `${PRIORITY_COLORS[priority]}15`,
      }}
    >
      {PRIORITY_LABELS[priority]}
    </Badge>
  );
}
