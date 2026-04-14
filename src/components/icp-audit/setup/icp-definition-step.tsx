"use client";

import { Plus, Trash2 } from "lucide-react";
import type { ICPSegment, ICPPersona } from "@/lib/icp-audit/types";

type Props = {
  icpDefinition: string;
  onIcpDefinitionChange: (value: string) => void;
  segments: ICPSegment[];
  onSegmentsChange: (segments: ICPSegment[]) => void;
  personas: ICPPersona[];
  onPersonasChange: (personas: ICPPersona[]) => void;
};

export function ICPDefinitionStep({
  icpDefinition,
  onIcpDefinitionChange,
  segments,
  onSegmentsChange,
  personas,
  onPersonasChange,
}: Props) {
  function addSegment() {
    onSegmentsChange([
      ...segments,
      {
        id: crypto.randomUUID(),
        name: "",
        description: "",
        industry: "",
        company_size: "",
        revenue_range: "",
      },
    ]);
  }

  function removeSegment(id: string) {
    onSegmentsChange(segments.filter((s) => s.id !== id));
  }

  function updateSegment(id: string, updates: Partial<ICPSegment>) {
    onSegmentsChange(segments.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }

  function addPersona() {
    onPersonasChange([
      ...personas,
      {
        id: crypto.randomUUID(),
        title: "",
        role: "",
        pain_points: [""],
        goals: [""],
        decision_criteria: [""],
      },
    ]);
  }

  function removePersona(id: string) {
    onPersonasChange(personas.filter((p) => p.id !== id));
  }

  function updatePersona(id: string, updates: Partial<ICPPersona>) {
    onPersonasChange(personas.map((p) => (p.id === id ? { ...p, ...updates } : p)));
  }

  return (
    <div className="space-y-8">
      {/* ICP Definition */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          Current ICP Definition
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Describe your current Ideal Customer Profile. Be as detailed as possible.
        </p>
        <textarea
          placeholder="e.g. B2B SaaS companies with 50-500 employees in the tech sector, $5M-$50M ARR, with a dedicated sales team looking to optimize their outbound process..."
          value={icpDefinition}
          onChange={(e) => onIcpDefinitionChange(e.target.value)}
          rows={5}
          className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
        />
      </div>

      {/* Segments */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Segments
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define the segments within your ICP for granular analysis.
        </p>
        <div className="space-y-3">
          {segments.map((seg) => (
            <div key={seg.id} className="border border-border rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-3">
                <input
                  type="text"
                  placeholder="Segment name"
                  value={seg.name}
                  onChange={(e) => updateSegment(seg.id, { name: e.target.value })}
                  className="flex-1 bg-transparent border-b border-border text-foreground text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-[#8a6e4e] pb-1"
                />
                <button
                  onClick={() => removeSegment(seg.id)}
                  className="text-muted-foreground hover:text-red-400 transition-colors"
                >
                  <Trash2 className="size-4" />
                </button>
              </div>
              <textarea
                placeholder="Description (what defines this segment?)"
                value={seg.description}
                onChange={(e) => updateSegment(seg.id, { description: e.target.value })}
                rows={2}
                className="w-full bg-secondary/30 rounded px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30 resize-none"
              />
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  placeholder="Industry"
                  value={seg.industry ?? ""}
                  onChange={(e) => updateSegment(seg.id, { industry: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
                <input
                  type="text"
                  placeholder="Company size"
                  value={seg.company_size ?? ""}
                  onChange={(e) => updateSegment(seg.id, { company_size: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
                <input
                  type="text"
                  placeholder="Revenue range"
                  value={seg.revenue_range ?? ""}
                  onChange={(e) => updateSegment(seg.id, { revenue_range: e.target.value })}
                  className="text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={addSegment}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#8a6e4e]/30 transition-colors w-full justify-center"
        >
          <Plus className="size-4" />
          Add Segment
        </button>
      </div>

      {/* Personas */}
      <div>
        <h3 className="text-base font-semibold text-foreground mb-1">
          Personas (optional)
        </h3>
        <p className="text-sm text-muted-foreground mb-4">
          Define buyer personas for persona accuracy analysis.
        </p>
        <div className="space-y-3">
          {personas.map((persona) => (
            <PersonaCard
              key={persona.id}
              persona={persona}
              onUpdate={(updates) => updatePersona(persona.id, updates)}
              onRemove={() => removePersona(persona.id)}
            />
          ))}
        </div>
        <button
          onClick={addPersona}
          className="mt-3 flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#8a6e4e]/30 transition-colors w-full justify-center"
        >
          <Plus className="size-4" />
          Add Persona
        </button>
      </div>
    </div>
  );
}

function PersonaCard({
  persona,
  onUpdate,
  onRemove,
}: {
  persona: ICPPersona;
  onUpdate: (updates: Partial<ICPPersona>) => void;
  onRemove: () => void;
}) {
  function updateList(field: "pain_points" | "goals" | "decision_criteria", index: number, value: string) {
    const list = [...persona[field]];
    list[index] = value;
    onUpdate({ [field]: list });
  }

  function addToList(field: "pain_points" | "goals" | "decision_criteria") {
    onUpdate({ [field]: [...persona[field], ""] });
  }

  function removeFromList(field: "pain_points" | "goals" | "decision_criteria", index: number) {
    onUpdate({ [field]: persona[field].filter((_, i) => i !== index) });
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Persona title (e.g. VP of Sales)"
          value={persona.title}
          onChange={(e) => onUpdate({ title: e.target.value })}
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
        placeholder="Role / department"
        value={persona.role}
        onChange={(e) => onUpdate({ role: e.target.value })}
        className="w-full text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
      />

      {/* Pain Points */}
      <ListField
        label="Pain points"
        items={persona.pain_points}
        placeholder="e.g. Manual prospecting takes too long"
        onChange={(i, v) => updateList("pain_points", i, v)}
        onAdd={() => addToList("pain_points")}
        onRemove={(i) => removeFromList("pain_points", i)}
      />

      {/* Goals */}
      <ListField
        label="Goals"
        items={persona.goals}
        placeholder="e.g. Increase qualified pipeline by 30%"
        onChange={(i, v) => updateList("goals", i, v)}
        onAdd={() => addToList("goals")}
        onRemove={(i) => removeFromList("goals", i)}
      />

      {/* Decision Criteria */}
      <ListField
        label="Decision criteria"
        items={persona.decision_criteria}
        placeholder="e.g. Must integrate with Salesforce"
        onChange={(i, v) => updateList("decision_criteria", i, v)}
        onAdd={() => addToList("decision_criteria")}
        onRemove={(i) => removeFromList("decision_criteria", i)}
      />
    </div>
  );
}

function ListField({
  label,
  items,
  placeholder,
  onChange,
  onAdd,
  onRemove,
}: {
  label: string;
  items: string[];
  placeholder: string;
  onChange: (index: number, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
}) {
  return (
    <div>
      <span className="text-[10px] text-muted-foreground uppercase tracking-wider">{label}</span>
      <div className="space-y-1 mt-1">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-1">
            <input
              type="text"
              placeholder={placeholder}
              value={item}
              onChange={(e) => onChange(i, e.target.value)}
              className="flex-1 text-xs bg-secondary/30 rounded px-2 py-1 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
            />
            {items.length > 1 && (
              <button
                onClick={() => onRemove(i)}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="size-3" />
              </button>
            )}
          </div>
        ))}
        <button
          onClick={onAdd}
          className="text-[10px] text-muted-foreground hover:text-[#c4a882] transition-colors"
        >
          + Add
        </button>
      </div>
    </div>
  );
}
