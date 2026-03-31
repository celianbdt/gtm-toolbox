"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
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

  async function handleInstantiate(template: NativeTemplateRef) {
    setLoading(template.slug);
    try {
      const res = await fetch(`/api/ops-engine/templates/${template.slug}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: template.name,
        }),
      });
      if (!res.ok) throw new Error("Failed to create table from template");
      const data = await res.json();
      onTableCreated(data.table);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  async function handleBlankTable() {
    setLoading("blank");
    try {
      const res = await fetch("/api/ops-engine/tables", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspaceId,
          name: "Untitled Table",
        }),
      });
      if (!res.ok) throw new Error("Failed to create blank table");
      const data = await res.json();
      onTableCreated(data.table);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(null);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <h3 className="text-sm font-medium text-muted-foreground">
        Start from a template
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {NATIVE_TEMPLATES.map((t) => {
          const Icon = ICON_MAP[t.icon] ?? Search;
          const isLoading = loading === t.slug;
          return (
            <Card
              key={t.slug}
              size="sm"
              className="cursor-pointer transition-colors hover:ring-violet-500/40 hover:ring-2"
              onClick={() => !loading && handleInstantiate(t)}
            >
              <CardContent className="flex flex-col gap-2">
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

        <Card
          size="sm"
          className="cursor-pointer border-dashed transition-colors hover:ring-violet-500/40 hover:ring-2"
          onClick={() => !loading && handleBlankTable()}
        >
          <CardContent className="flex flex-col items-center justify-center gap-2 h-full">
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
  );
}
