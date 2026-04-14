"use client";

import { useState } from "react";

export type AIModel = {
  id: string;
  provider: "anthropic" | "openai";
  label: string;
  description: string;
};

export const AVAILABLE_MODELS: AIModel[] = [
  { id: "claude-sonnet-4-5", provider: "anthropic", label: "Claude Sonnet 4.5", description: "Fast, smart — idéal pour les debates" },
  { id: "claude-sonnet-4-6", provider: "anthropic", label: "Claude Sonnet 4.6", description: "Dernier Sonnet, output plus rapide" },
  { id: "claude-opus-4-6", provider: "anthropic", label: "Claude Opus 4.6", description: "Le plus puissant, raisonnement profond" },
  { id: "claude-haiku-4-5-20251001", provider: "anthropic", label: "Claude Haiku 4.5", description: "Ultra-rapide, pas cher — résumés" },
  { id: "o3", provider: "openai", label: "o3", description: "Meilleur raisonnement OpenAI" },
  { id: "o4-mini", provider: "openai", label: "o4-mini", description: "Raisonnement rapide et efficace" },
  { id: "gpt-4.1", provider: "openai", label: "GPT-4.1", description: "Flagship OpenAI — coding + instructions" },
  { id: "gpt-4.1-mini", provider: "openai", label: "GPT-4.1 Mini", description: "Rapide et abordable" },
  { id: "gpt-4.1-nano", provider: "openai", label: "GPT-4.1 Nano", description: "Le moins cher, ultra-rapide" },
  { id: "gpt-4o", provider: "openai", label: "GPT-4o", description: "Multimodal, bon équilibre" },
];

type Props = {
  selected: string[];
  onChange: (models: string[]) => void;
  maxSelection?: number;
};

export function ModelSelector({ selected, onChange, maxSelection = 2 }: Props) {
  const [expanded, setExpanded] = useState(false);

  function toggle(modelId: string) {
    if (selected.includes(modelId)) {
      onChange(selected.filter((m) => m !== modelId));
    } else if (selected.length < maxSelection) {
      onChange([...selected, modelId]);
    } else if (maxSelection === 1) {
      onChange([modelId]);
    } else {
      // Replace oldest selection
      onChange([...selected.slice(1), modelId]);
    }
  }

  const selectedModels = AVAILABLE_MODELS.filter((m) => selected.includes(m.id));
  const anthropicModels = AVAILABLE_MODELS.filter((m) => m.provider === "anthropic");
  const openaiModels = AVAILABLE_MODELS.filter((m) => m.provider === "openai");

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium text-white">AI Models</h3>
          <p className="text-xs text-zinc-500 mt-0.5">
            {maxSelection === 1
              ? "Choose the model for this session"
              : `Choose up to ${maxSelection} models — agents will alternate between them`}
          </p>
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-xs text-amber-600 hover:text-violet-300 transition-colors"
        >
          {expanded ? "Collapse" : "Show all models"}
        </button>
      </div>

      {/* Quick selection chips */}
      {!expanded && (
        <div className="flex flex-wrap gap-2">
          {selectedModels.map((m) => (
            <button
              key={m.id}
              onClick={() => toggle(m.id)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-violet-600 bg-violet-950 text-violet-300 transition-colors"
            >
              <span className={`w-2 h-2 rounded-full ${m.provider === "anthropic" ? "bg-orange-400" : "bg-emerald-400"}`} />
              {m.label}
              <span className="text-amber-700 ml-1">×</span>
            </button>
          ))}
          {selected.length === 0 && (
            <span className="text-xs text-zinc-500 py-1.5">Aucun modèle sélectionné</span>
          )}
        </div>
      )}

      {/* Full grid */}
      {expanded && (
        <div className="space-y-3">
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-orange-400" /> Anthropic
            </div>
            <div className="grid grid-cols-2 gap-2">
              {anthropicModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selected.includes(m.id)
                      ? "border-violet-600 bg-violet-950/50 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>
          </div>
          <div>
            <div className="text-[10px] text-zinc-500 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400" /> OpenAI
            </div>
            <div className="grid grid-cols-2 gap-2">
              {openaiModels.map((m) => (
                <button
                  key={m.id}
                  onClick={() => toggle(m.id)}
                  className={`text-left px-3 py-2 rounded-lg border text-xs transition-colors ${
                    selected.includes(m.id)
                      ? "border-violet-600 bg-violet-950/50 text-white"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700 hover:text-white"
                  }`}
                >
                  <div className="font-medium">{m.label}</div>
                  <div className="text-[10px] text-zinc-500 mt-0.5">{m.description}</div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
