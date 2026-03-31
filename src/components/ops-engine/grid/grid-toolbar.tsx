"use client";

import { useRef } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  Plus,
  Upload,
  Sparkles,
  Columns3,
} from "lucide-react";
import type { ThresholdTier } from "@/lib/ops-engine/types";
import { TIER_LABELS, TIER_COLORS } from "@/lib/ops-engine/types";

const ALL_TIERS: ThresholdTier[] = [
  "ignored",
  "cold",
  "warm",
  "hot",
  "priority",
];

export function GridToolbar({
  search,
  onSearchChange,
  activeTiers,
  onToggleTier,
  selectedCount,
  onAddRow,
  onAddColumn,
  onImportCsv,
  onEnrichSelected,
}: {
  search: string;
  onSearchChange: (v: string) => void;
  activeTiers: Set<ThresholdTier>;
  onToggleTier: (tier: ThresholdTier) => void;
  selectedCount: number;
  onAddRow: () => void;
  onAddColumn: () => void;
  onImportCsv: (file: File) => void;
  onEnrichSelected: () => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) {
      onImportCsv(file);
      e.target.value = "";
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-2 px-4 py-2 border-b border-border bg-card/50">
      {/* Search */}
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search domain..."
          className="h-8 w-52 pl-7 text-xs"
        />
      </div>

      {/* Tier chips */}
      <div className="flex items-center gap-1">
        {ALL_TIERS.map((tier) => {
          const active = activeTiers.has(tier);
          return (
            <button
              key={tier}
              onClick={() => onToggleTier(tier)}
              className="rounded-full px-2.5 py-0.5 text-[11px] font-medium transition-all border"
              style={{
                backgroundColor: active
                  ? `${TIER_COLORS[tier]}20`
                  : "transparent",
                color: active ? TIER_COLORS[tier] : "var(--muted-foreground)",
                borderColor: active
                  ? `${TIER_COLORS[tier]}40`
                  : "var(--border)",
              }}
            >
              {TIER_LABELS[tier]}
            </button>
          );
        })}
      </div>

      <div className="flex-1" />

      {/* Actions */}
      {selectedCount > 0 && (
        <Button variant="outline" size="sm" onClick={onEnrichSelected}>
          <Sparkles className="size-3" />
          Enrich ({selectedCount})
        </Button>
      )}

      <Button variant="outline" size="sm" onClick={onAddRow}>
        <Plus className="size-3" />
        Add Row
      </Button>

      <input
        ref={fileRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileChange}
      />
      <Button
        variant="outline"
        size="sm"
        onClick={() => fileRef.current?.click()}
      >
        <Upload className="size-3" />
        Import CSV
      </Button>

      <Button variant="outline" size="sm" onClick={onAddColumn}>
        <Columns3 className="size-3" />
        Add Column
      </Button>
    </div>
  );
}
