"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  NATIVE_TEMPLATES,
  type NativeTemplateRef,
} from "@/lib/ops-engine/templates/native-templates";
import {
  TrendingUp,
  UserPlus,
  ArrowRightLeft,
  Eye,
  Search,
  RefreshCw,
  CalendarDays,
  Plus,
  Loader2,
} from "lucide-react";
import type { OpsTable } from "@/lib/ops-engine/types";

const ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  TrendingUp,
  UserPlus,
  ArrowRightLeft,
  Eye,
  Search,
  RefreshCw,
  CalendarDays,
};

export function TemplatePicker({
  workspaceId,
  onTableCreated,
}: {
  workspaceId: string;
  onTableCreated: (table: OpsTable) => void;
}) {
  const [loading, setLoading] = useState<string | null>(null);
  const [createDialog, setCreateDialog] = useState<{
    open: boolean;
    template: NativeTemplateRef | null;
  }>({ open: false, template: null });
  const [tableName, setTableName] = useState("");

  function openCreateDialog(template: NativeTemplateRef | null) {
    setTableName(template?.name ?? "");
    setCreateDialog({ open: true, template });
  }

  async function handleCreate() {
    const { template } = createDialog;
    const name = tableName.trim() || "Untitled Table";
    const slug = template?.slug ?? "blank";
    setLoading(slug);
    setCreateDialog({ open: false, template: null });

    try {
      if (template) {
        // Create from template
        const res = await fetch(`/api/ops-engine/templates/${template.slug}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId, name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to create table from template");
        }
        const data = await res.json();
        onTableCreated(data.table);
      } else {
        // Blank table
        const res = await fetch("/api/ops-engine/tables", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId, name }),
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error ?? "Failed to create blank table");
        }
        const data = await res.json();
        onTableCreated(data.table);
      }
    } catch (err) {
      console.error(err);
      alert(err instanceof Error ? err.message : "Creation failed");
    } finally {
      setLoading(null);
    }
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <h3 className="text-sm font-medium text-muted-foreground">
          Create a new table
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
          {NATIVE_TEMPLATES.map((t) => {
            const Icon = ICON_MAP[t.icon] ?? Search;
            const isLoading = loading === t.slug;
            return (
              <Card
                key={t.slug}
                className="cursor-pointer transition-colors hover:ring-violet-500/40 hover:ring-2"
                onClick={() => !loading && openCreateDialog(t)}
              >
                <CardContent className="flex flex-col gap-2 p-4">
                  <div className="flex items-center gap-2">
                    {isLoading ? (
                      <Loader2 className="size-4 text-violet-400 animate-spin" />
                    ) : (
                      <Icon className="size-4 text-violet-400" />
                    )}
                    <span className="text-sm font-medium">{t.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground line-clamp-2">
                    {t.description}
                  </p>
                </CardContent>
              </Card>
            );
          })}

          {/* Blank table */}
          <Card
            className="cursor-pointer border-dashed transition-colors hover:ring-violet-500/40 hover:ring-2"
            onClick={() => !loading && openCreateDialog(null)}
          >
            <CardContent className="flex flex-col items-center justify-center gap-2 p-4 h-full min-h-[80px]">
              {loading === "blank" ? (
                <Loader2 className="size-5 text-muted-foreground animate-spin" />
              ) : (
                <Plus className="size-5 text-muted-foreground" />
              )}
              <span className="text-sm text-muted-foreground">Blank table</span>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Create dialog — name the table before creating */}
      <Dialog
        open={createDialog.open}
        onOpenChange={(open) => {
          if (!open) setCreateDialog({ open: false, template: null });
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {createDialog.template
                ? `Create from "${createDialog.template.name}"`
                : "Create blank table"}
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 py-2">
            <label className="text-xs font-medium text-muted-foreground">
              Table name
            </label>
            <Input
              value={tableName}
              onChange={(e) => setTableName(e.target.value)}
              placeholder="My prospect table..."
              className="h-9"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter" && tableName.trim()) handleCreate();
              }}
            />
            {createDialog.template && (
              <p className="text-xs text-muted-foreground">
                {createDialog.template.description}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCreateDialog({ open: false, template: null })}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCreate}
              disabled={!tableName.trim()}
            >
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
