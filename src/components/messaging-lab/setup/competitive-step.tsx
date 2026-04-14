"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { CompetitorMessaging } from "@/lib/messaging-lab/types";

type Props = {
  competitors: CompetitorMessaging[];
  onChange: (competitors: CompetitorMessaging[]) => void;
};

export function CompetitiveStep({ competitors, onChange }: Props) {
  function addCompetitor() {
    if (competitors.length >= 5) return;
    onChange([
      ...competitors,
      { name: "", tagline: "", key_claims: [], positioning: "" },
    ]);
  }

  function removeCompetitor(index: number) {
    onChange(competitors.filter((_, i) => i !== index));
  }

  function updateCompetitor(index: number, updates: Partial<CompetitorMessaging>) {
    onChange(competitors.map((c, i) => (i === index ? { ...c, ...updates } : c)));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Competitive Context
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Add competitors whose messaging you want to differentiate from (1-5).
      </p>

      <div className="space-y-4">
        {competitors.map((comp, index) => (
          <CompetitorCard
            key={index}
            competitor={comp}
            onUpdate={(updates) => updateCompetitor(index, updates)}
            onRemove={() => removeCompetitor(index)}
          />
        ))}
      </div>

      {competitors.length < 5 && (
        <button
          onClick={addCompetitor}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#8a6e4e]/30 transition-colors w-full justify-center"
        >
          <Plus className="size-4" />
          Add Competitor
        </button>
      )}

      {competitors.length === 0 && (
        <p className="text-xs text-muted-foreground/60 mt-3 text-center">
          You can skip this step if you don&apos;t have competitors to compare against.
        </p>
      )}
    </div>
  );
}

function CompetitorCard({
  competitor,
  onUpdate,
  onRemove,
}: {
  competitor: CompetitorMessaging;
  onUpdate: (updates: Partial<CompetitorMessaging>) => void;
  onRemove: () => void;
}) {
  const [claimInput, setClaimInput] = useState("");

  function addClaim() {
    if (!claimInput.trim()) return;
    onUpdate({ key_claims: [...competitor.key_claims, claimInput.trim()] });
    setClaimInput("");
  }

  function removeClaim(index: number) {
    onUpdate({ key_claims: competitor.key_claims.filter((_, i) => i !== index) });
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Competitor name"
          value={competitor.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent border-b border-border text-foreground text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-[#8a6e4e] pb-1"
        />
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <input
        type="text"
        placeholder="Their tagline (optional)"
        value={competitor.tagline ?? ""}
        onChange={(e) => onUpdate({ tagline: e.target.value || undefined })}
        className="w-full bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground border-b border-border/50 focus:outline-none focus:border-[#8a6e4e] pb-1"
      />

      <input
        type="text"
        placeholder="Their positioning (optional)"
        value={competitor.positioning ?? ""}
        onChange={(e) => onUpdate({ positioning: e.target.value || undefined })}
        className="w-full bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground border-b border-border/50 focus:outline-none focus:border-[#8a6e4e] pb-1"
      />

      {/* Key Claims */}
      {competitor.key_claims.length > 0 && (
        <div className="space-y-1.5">
          {competitor.key_claims.map((claim, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded px-2.5 py-1.5"
            >
              <span className="truncate flex-1 text-foreground">{claim}</span>
              <button
                onClick={() => removeClaim(i)}
                className="hover:text-red-400"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Add a key claim..."
          value={claimInput}
          onChange={(e) => setClaimInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addClaim()}
          className="flex-1 text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
        />
        <button
          onClick={addClaim}
          disabled={!claimInput.trim()}
          className="text-xs px-3 py-1.5 bg-secondary hover:bg-accent text-foreground rounded disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>
    </div>
  );
}
