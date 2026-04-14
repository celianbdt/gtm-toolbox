"use client";

import { useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { AiLoader } from "@/components/ui/ai-loader";
import type { AgentConfig, EngagementWeights } from "@/lib/debate/types";

const COLORS = [
  "#6366f1", "#8a6e4e", "#ec4899", "#10b981",
  "#f59e0b", "#3b82f6", "#ef4444", "#14b8a6",
];

const EMOJIS = ["🎯", "😈", "🧑‍💼", "🔬", "💡", "📊", "🚀", "🦁", "🦊", "🐺", "🧠", "⚡"];

const DEFAULT_WEIGHTS: EngagementWeights = {
  contradiction: 0.5,
  new_data: 0.5,
  customer_mention: 0.5,
  strategy_shift: 0.5,
};

type Mode = "manual" | "generate";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  workspaceId: string;
  agent?: AgentConfig; // if provided → edit mode
  onSaved: (agent: AgentConfig) => void;
};

export function AgentFormSheet({ open, onOpenChange, workspaceId, agent, onSaved }: Props) {
  const isEdit = !!agent;
  const [mode, setMode] = useState<Mode>("manual");

  // Manual form state
  const [name, setName] = useState(agent?.name ?? "");
  const [emoji, setEmoji] = useState(agent?.avatar_emoji ?? "🎯");
  const [color, setColor] = useState(agent?.color ?? COLORS[0]);
  const [role, setRole] = useState(agent?.role ?? "");
  const [systemPrompt, setSystemPrompt] = useState(agent?.system_prompt ?? "");
  const [weights, setWeights] = useState<EngagementWeights>(
    agent?.engagement_weights ?? DEFAULT_WEIGHTS
  );

  // Generate mode state
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [generatedAgents, setGeneratedAgents] = useState<AgentConfig[]>([]);
  const [selectedGenerated, setSelectedGenerated] = useState<Set<string>>(new Set());
  const [genError, setGenError] = useState("");

  const [saving, setSaving] = useState(false);

  function reset() {
    if (!isEdit) {
      setName(""); setEmoji("🎯"); setColor(COLORS[0]);
      setRole(""); setSystemPrompt(""); setWeights(DEFAULT_WEIGHTS);
    }
    setPrompt(""); setGeneratedAgents([]); setSelectedGenerated(new Set()); setGenError("");
    setMode("manual");
  }

  async function handleGenerate() {
    if (!prompt.trim()) return;
    setGenerating(true);
    setGenError("");
    setGeneratedAgents([]);
    setSelectedGenerated(new Set());
    try {
      const res = await fetch("/api/debate/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Génération échouée");
      setGeneratedAgents(data.agents ?? []);
    } catch (e) {
      setGenError(e instanceof Error ? e.message : "Génération échouée");
    } finally {
      setGenerating(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      if (mode === "generate" && selectedGenerated.size > 0) {
        // Agents are already saved to DB by the generate endpoint
        // Delete the ones NOT selected
        const toDelete = generatedAgents.filter((a) => !selectedGenerated.has(a.id));
        await Promise.all(
          toDelete.map((a) => fetch(`/api/agents/${a.id}`, { method: "DELETE" }))
        );
        const kept = generatedAgents.filter((a) => selectedGenerated.has(a.id));
        kept.forEach(onSaved);
        onOpenChange(false);
        reset();
        return;
      }

      // Manual save
      const payload = {
        name: name.trim(),
        slug: name.trim().toLowerCase().replace(/[^a-z0-9]+/g, "-"),
        avatar_emoji: emoji,
        color,
        role: role.trim(),
        system_prompt: systemPrompt.trim(),
        engagement_weights: weights,
        personality: agent?.personality ?? {
          traits: {},
          speaking_style: role,
          biases: [],
          trigger_topics: [],
        },
        workspace_id: workspaceId,
        is_template: false,
      };

      let res: Response;
      if (isEdit && agent) {
        res = await fetch(`/api/agents/${agent.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch("/api/agents", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved(data.agent);
      onOpenChange(false);
      reset();
    } catch (e) {
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function setWeight(key: keyof EngagementWeights, value: number) {
    setWeights((w) => ({ ...w, [key]: value }));
  }

  const canSaveManual = name.trim() && role.trim();
  const canSaveGenerate = selectedGenerated.size > 0;

  return (
    <Sheet open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) reset(); }}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader className="pb-2">
          <SheetTitle>{isEdit ? "Modifier l'agent" : "Créer un agent"}</SheetTitle>
        </SheetHeader>

        {!isEdit && (
          <div className="flex gap-1 p-1 bg-card rounded-lg w-fit mx-4 mb-4">
            {(["manual", "generate"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  mode === m ? "bg-zinc-700 text-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m === "manual" ? "Manuel" : "Générer avec IA"}
              </button>
            ))}
          </div>
        )}

        <div className="px-4 flex-1">
          {(isEdit || mode === "manual") && (
            <div className="space-y-5">
              {/* Emoji + Color */}
              <div className="flex gap-6">
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Emoji</label>
                  <div className="flex flex-wrap gap-1.5 max-w-[160px]">
                    {EMOJIS.map((e) => (
                      <button
                        key={e}
                        type="button"
                        onClick={() => setEmoji(e)}
                        className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                          emoji === e ? "bg-zinc-700 ring-1 ring-zinc-500" : "hover:bg-secondary"
                        }`}
                      >
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs text-muted-foreground">Couleur</label>
                  <div className="flex flex-wrap gap-1.5 max-w-[100px]">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setColor(c)}
                        className="w-6 h-6 rounded-full transition-all"
                        style={{
                          backgroundColor: c,
                          outline: color === c ? `2px solid ${c}` : "2px solid transparent",
                          outlineOffset: "2px",
                        }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {/* Preview */}
              <div
                className="flex items-center gap-2 p-3 rounded-lg border"
                style={{ borderColor: `${color}40`, backgroundColor: `${color}10` }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${color}25`, border: `2px solid ${color}` }}
                >
                  {emoji}
                </div>
                <div>
                  <div className="text-sm font-medium text-foreground">{name || "Nom de l'agent"}</div>
                  <div className="text-xs text-muted-foreground">{role || "Rôle"}</div>
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Nom</label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="ex: The Strategist" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Rôle</label>
                <Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="ex: GTM Strategist" />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">System prompt</label>
                <textarea
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                  rows={4}
                  placeholder="Décris l'agent à la première personne : son background, son style de débat, ses priorités..."
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
                />
              </div>

              <div className="space-y-3">
                <label className="text-xs text-muted-foreground block">Poids d'engagement</label>
                {(Object.keys(weights) as (keyof EngagementWeights)[]).map((key) => (
                  <div key={key} className="flex items-center gap-3">
                    <span className="text-xs text-muted-foreground w-28 capitalize">{key.replace("_", " ")}</span>
                    <Slider
                      min={0}
                      max={100}
                      step={5}
                      value={[Math.round(weights[key] * 100)]}
                      onValueChange={([v]) => setWeight(key, v / 100)}
                      className="flex-1"
                    />
                    <span className="text-xs text-muted-foreground w-8 text-right">
                      {Math.round(weights[key] * 100)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {!isEdit && mode === "generate" && (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Décris les agents que tu veux générer</label>
                <textarea
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  rows={3}
                  placeholder="ex: Un expert pricing B2B très data-driven, un sceptique et un CMO expérimenté"
                  className="w-full bg-card border border-border rounded-lg px-3 py-2 text-sm text-foreground placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
                />
              </div>
              {genError && <p className="text-sm text-red-400">{genError}</p>}

              {generating ? (
                <AiLoader label="Génération des agents..." />
              ) : (
                <Button onClick={handleGenerate} disabled={!prompt.trim()} size="sm">
                  Générer
                </Button>
              )}

              {generatedAgents.length > 0 && !generating && (
                <div className="space-y-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider">
                    {selectedGenerated.size}/{generatedAgents.length} sélectionnés
                  </p>
                  {generatedAgents.map((a) => {
                    const isSelected = selectedGenerated.has(a.id);
                    return (
                      <div
                        key={a.id}
                        onClick={() => {
                          setSelectedGenerated((prev) => {
                            const next = new Set(prev);
                            if (next.has(a.id)) next.delete(a.id);
                            else next.add(a.id);
                            return next;
                          });
                        }}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          isSelected
                            ? "border-primary bg-violet-900/20"
                            : "border-border hover:border-zinc-600"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-8 h-8 rounded-full flex items-center justify-center text-base shrink-0"
                            style={{ backgroundColor: `${a.color}25`, border: `2px solid ${a.color}` }}
                          >
                            {a.avatar_emoji}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-foreground">{a.name}</div>
                            <div className="text-xs text-muted-foreground">{a.role}</div>
                          </div>
                          <div className={`w-4 h-4 rounded border-2 shrink-0 transition-colors ${
                            isSelected ? "bg-primary border-primary" : "border-zinc-600"
                          }`} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="pt-4">
          {saving ? (
            <AiLoader label="Sauvegarde..." />
          ) : (
            <Button
              onClick={handleSave}
              disabled={mode === "manual" ? !canSaveManual : !canSaveGenerate}
            >
              {isEdit
                ? "Sauvegarder"
                : mode === "generate" && selectedGenerated.size > 1
                ? `Ajouter ${selectedGenerated.size} agents`
                : "Créer"}
            </Button>
          )}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
