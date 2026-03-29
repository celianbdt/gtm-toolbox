"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import type { AudienceInfo } from "@/lib/messaging-lab/types";

type Props = {
  audience: AudienceInfo;
  onChange: (audience: AudienceInfo) => void;
};

const BUYING_STAGES = [
  { value: "awareness", label: "Awareness" },
  { value: "consideration", label: "Consideration" },
  { value: "decision", label: "Decision" },
  { value: "mixed", label: "Mixed / All stages" },
];

export function AudienceStep({ audience, onChange }: Props) {
  const [painInput, setPainInput] = useState("");
  const [criteriaInput, setCriteriaInput] = useState("");

  function addPainPoint() {
    if (!painInput.trim()) return;
    onChange({ ...audience, primary_pain_points: [...audience.primary_pain_points, painInput.trim()] });
    setPainInput("");
  }

  function removePainPoint(index: number) {
    onChange({ ...audience, primary_pain_points: audience.primary_pain_points.filter((_, i) => i !== index) });
  }

  function addCriteria() {
    if (!criteriaInput.trim()) return;
    onChange({ ...audience, decision_criteria: [...audience.decision_criteria, criteriaInput.trim()] });
    setCriteriaInput("");
  }

  function removeCriteria(index: number) {
    onChange({ ...audience, decision_criteria: audience.decision_criteria.filter((_, i) => i !== index) });
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Target Audience
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Define who you are messaging to.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">ICP summary *</label>
          <textarea
            placeholder="Describe your ideal customer profile. Who are they? What role? What company size?"
            value={audience.icp_summary}
            onChange={(e) => onChange({ ...audience, icp_summary: e.target.value })}
            rows={3}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 resize-none"
          />
        </div>

        {/* Pain Points */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Primary pain points</label>
          {audience.primary_pain_points.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {audience.primary_pain_points.map((pain, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5"
                >
                  <span className="flex-1 text-foreground">{pain}</span>
                  <button
                    onClick={() => removePainPoint(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
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
              placeholder="Add a pain point..."
              value={painInput}
              onChange={(e) => setPainInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addPainPoint()}
              className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            />
            <button
              onClick={addPainPoint}
              disabled={!painInput.trim()}
              className="px-3 py-2 text-sm bg-secondary hover:bg-accent text-foreground rounded-lg disabled:opacity-40 transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Decision Criteria */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Decision criteria</label>
          {audience.decision_criteria.length > 0 && (
            <div className="space-y-1.5 mb-2">
              {audience.decision_criteria.map((criteria, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 text-sm bg-secondary/50 rounded px-2.5 py-1.5"
                >
                  <span className="flex-1 text-foreground">{criteria}</span>
                  <button
                    onClick={() => removeCriteria(i)}
                    className="text-muted-foreground hover:text-red-400 transition-colors"
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
              placeholder="Add a decision criterion..."
              value={criteriaInput}
              onChange={(e) => setCriteriaInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addCriteria()}
              className="flex-1 text-sm bg-secondary/30 rounded-lg px-3 py-2 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
            />
            <button
              onClick={addCriteria}
              disabled={!criteriaInput.trim()}
              className="px-3 py-2 text-sm bg-secondary hover:bg-accent text-foreground rounded-lg disabled:opacity-40 transition-colors"
            >
              <Plus className="size-4" />
            </button>
          </div>
        </div>

        {/* Buying Stage */}
        <div>
          <label className="text-sm text-muted-foreground block mb-1.5">Buying stage (optional)</label>
          <select
            value={audience.buying_stage ?? ""}
            onChange={(e) => onChange({ ...audience, buying_stage: e.target.value || undefined })}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
          >
            <option value="">Select a stage...</option>
            {BUYING_STAGES.map((stage) => (
              <option key={stage.value} value={stage.value}>
                {stage.label}
              </option>
            ))}
          </select>
        </div>
      </div>
    </div>
  );
}
