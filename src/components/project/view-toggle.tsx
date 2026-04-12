"use client";

import { LayoutGrid, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type ViewMode = "kanban" | "list";

type ViewToggleProps = {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

export function ViewToggle({ viewMode, onViewModeChange }: ViewToggleProps) {
  return (
    <div className="flex items-center rounded-md border border-border bg-muted/30 p-0.5">
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 rounded-sm",
          viewMode === "kanban" && "bg-background shadow-sm text-foreground"
        )}
        onClick={() => onViewModeChange("kanban")}
      >
        <LayoutGrid className="size-4" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        className={cn(
          "h-7 px-2 rounded-sm",
          viewMode === "list" && "bg-background shadow-sm text-foreground"
        )}
        onClick={() => onViewModeChange("list")}
      >
        <List className="size-4" />
      </Button>
    </div>
  );
}
