"use client";

import { useState } from "react";
import type { ICPDefinition } from "@/lib/outbound-builder/types";

type Props = {
  icp: ICPDefinition;
  onChange: (icp: ICPDefinition) => void;
};

export function BuilderICPStep({ icp, onChange }: Props) {
  const [painInput, setPainInput] = useState("");
  const [valueInput, setValueInput] = useState("");

  const addPainPoint = () => {
    if (!painInput.trim()) return;
    onChange({ ...icp, pain_points: [...icp.pain_points, painInput.trim()] });
    setPainInput("");
  };

  const addValueProp = () => {
    if (!valueInput.trim()) return;
    onChange({ ...icp, value_props: [...icp.value_props, valueInput.trim()] });
    setValueInput("");
  };

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Target ICP</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Define who you are targeting with this outbound sequence.
      </p>

      <div className="space-y-4">
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Sequence Name</label>
          <input
            type="text"
            value={icp.title}
            onChange={(e) => onChange({ ...icp, title: e.target.value })}
            placeholder="e.g., Q2 VP Sales Outreach"
            className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Target Persona / Role</label>
          <input
            type="text"
            value={icp.persona_role}
            onChange={(e) => onChange({ ...icp, persona_role: e.target.value })}
            placeholder="e.g., VP of Sales, Head of Revenue Ops"
            className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Industry (optional)</label>
            <input
              type="text"
              value={icp.industry ?? ""}
              onChange={(e) => onChange({ ...icp, industry: e.target.value || undefined })}
              placeholder="e.g., SaaS B2B"
              className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Company Size (optional)</label>
            <input
              type="text"
              value={icp.company_size ?? ""}
              onChange={(e) => onChange({ ...icp, company_size: e.target.value || undefined })}
              placeholder="e.g., 50-500 employees"
              className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
          </div>
        </div>

        {/* Pain Points */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Pain Points</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={painInput}
              onChange={(e) => setPainInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addPainPoint())}
              placeholder="e.g., Cannot scale outbound without more headcount"
              className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button onClick={addPainPoint} className="px-3 py-2 bg-[#8a6e4e] text-white text-xs rounded-lg">+</button>
          </div>
          {icp.pain_points.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {icp.pain_points.map((p, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#8a6e4e]/10 text-[#c4a882] rounded-full">
                  {p}
                  <button onClick={() => onChange({ ...icp, pain_points: icp.pain_points.filter((_, j) => j !== i) })} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Value Props */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Value Propositions</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={valueInput}
              onChange={(e) => setValueInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addValueProp())}
              placeholder="e.g., 3x more meetings without additional SDRs"
              className="flex-1 px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground"
            />
            <button onClick={addValueProp} className="px-3 py-2 bg-[#8a6e4e] text-white text-xs rounded-lg">+</button>
          </div>
          {icp.value_props.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {icp.value_props.map((v, i) => (
                <span key={i} className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-emerald-500/10 text-emerald-400 rounded-full">
                  {v}
                  <button onClick={() => onChange({ ...icp, value_props: icp.value_props.filter((_, j) => j !== i) })} className="hover:text-red-400">×</button>
                </span>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
