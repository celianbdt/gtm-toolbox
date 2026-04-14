"use client";

import { useState, useEffect } from "react";
import type { AgentConfig } from "@/lib/debate/types";
import { AgentCard } from "./agent-card";
import { AiLoader } from "@/components/ui/ai-loader";
import { Minus, Plus } from "lucide-react";

type Props = {
  workspaceId: string;
  agents: AgentConfig[];
  onChange: (agents: AgentConfig[]) => void;
};

export function TeamBuilder({ workspaceId, agents, onChange }: Props) {
  const [templates, setTemplates] = useState<AgentConfig[]>([]);
  const [workspaceAgents, setWorkspaceAgents] = useState<AgentConfig[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedAgents, setGeneratedAgents] = useState<AgentConfig[]>([]);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"templates" | "prompt">("templates");
  const [maxAgents, setMaxAgents] = useState(10);

  useEffect(() => {
    setLoadingAgents(true);
    Promise.all([
      fetch("/api/debate/templates").then((r) => r.json()),
      fetch(`/api/agents?workspaceId=${workspaceId}`).then((r) => r.json()),
    ])
      .then(([tData, aData]) => {
        setTemplates(tData.agents ?? []);
        setWorkspaceAgents(aData.agents ?? []);
      })
      .catch(() => {})
      .finally(() => setLoadingAgents(false));
  }, [workspaceId]);

  const selectedIds = new Set(agents.map((a) => a.id));

  async function deleteAgent(agentId: string, isTemplate: boolean) {
    try {
      const res = await fetch(`/api/agents/${agentId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      if (isTemplate) {
        setTemplates((prev) => prev.filter((a) => a.id !== agentId));
      } else {
        setWorkspaceAgents((prev) => prev.filter((a) => a.id !== agentId));
      }
      onChange(agents.filter((a) => a.id !== agentId));
    } catch {
      setError("Failed to delete agent");
    }
  }

  function toggle(agent: AgentConfig) {
    if (selectedIds.has(agent.id)) {
      onChange(agents.filter((a) => a.id !== agent.id));
    } else if (agents.length < maxAgents) {
      onChange([...agents, agent]);
    }
  }

  async function generateFromPrompt() {
    if (!prompt.trim()) return;
    setIsGenerating(true);
    setError("");
    setGeneratedAgents([]);
    try {
      const res = await fetch("/api/debate/agents/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, workspaceId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Generation failed");
      setGeneratedAgents(data.agents ?? []);
      setWorkspaceAgents((prev) => {
        const newIds = new Set(prev.map((a) => a.id));
        return [...prev, ...(data.agents ?? []).filter((a: AgentConfig) => !newIds.has(a.id))];
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Generation failed");
    } finally {
      setIsGenerating(false);
    }
  }

  const isFull = agents.length >= maxAgents;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-white">Compose your debate team</h2>
          <p className="text-sm text-zinc-400 mt-1">
            Select agents that will debate. Each brings a distinct perspective.
          </p>
        </div>

        {/* Team size picker */}
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className="text-xs text-zinc-500">Team size</span>
          <div className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1">
            <button
              onClick={() => {
                const next = Math.max(2, maxAgents - 1);
                setMaxAgents(next);
                if (agents.length > next) onChange(agents.slice(0, next));
              }}
              className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
              disabled={maxAgents <= 2}
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-medium text-white w-4 text-center">{maxAgents}</span>
            <button
              onClick={() => setMaxAgents(maxAgents + 1)}
              className="w-5 h-5 flex items-center justify-center text-zinc-400 hover:text-white transition-colors disabled:opacity-30"
              disabled={false}
            >
              <Plus className="w-3 h-3" />
            </button>
          </div>
        </div>
      </div>

      {/* Mode tabs */}
      <div className="flex gap-1 p-1 bg-zinc-900 rounded-lg w-fit">
        {(["templates", "prompt"] as const).map((m) => (
          <button
            key={m}
            onClick={() => setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${
              mode === m ? "bg-zinc-700 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            {m === "templates" ? "Library" : "Generate with AI"}
          </button>
        ))}
      </div>

      {/* Library mode */}
      {mode === "templates" && (
        <div className="space-y-5">
          {loadingAgents ? (
            <AiLoader label="Loading agents..." />
          ) : (
            <>
              {workspaceAgents.length > 0 && (
                <div>
                  <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">My agents</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {workspaceAgents.map((a) => (
                      <div key={a.id} className={`relative ${isFull && !selectedIds.has(a.id) ? "opacity-40 cursor-not-allowed" : ""}`}>
                        <AgentCard
                          agent={a}
                          selected={selectedIds.has(a.id)}
                          onClick={() => toggle(a)}
                          onRemove={() => deleteAgent(a.id, false)}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                {workspaceAgents.length > 0 && (
                  <div className="text-xs text-zinc-500 mb-2 uppercase tracking-wider">Templates</div>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {templates.map((t) => (
                    <div key={t.id} className={isFull && !selectedIds.has(t.id) ? "opacity-40 cursor-not-allowed" : ""}>
                      <AgentCard
                        agent={t}
                        selected={selectedIds.has(t.id)}
                        onClick={() => toggle(t)}
                        onRemove={() => deleteAgent(t.id, true)}
                      />
                    </div>
                  ))}
                  {templates.length === 0 && workspaceAgents.length === 0 && (
                    <p className="text-sm text-zinc-500 col-span-3">No agents available.</p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* Generate mode */}
      {mode === "prompt" && (
        <div className="space-y-4">
          <div className="space-y-2">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. I want a growth hacker, a skeptic, and a customer success expert"
              rows={3}
              className="w-full bg-zinc-900 border border-zinc-700 rounded-lg px-4 py-3 text-sm text-white placeholder-zinc-500 resize-none focus:outline-none focus:border-zinc-500"
            />
            {error && <p className="text-sm text-red-400">{error}</p>}
          </div>

          {isGenerating ? (
            <AiLoader label="Generating your team..." />
          ) : (
            <button
              onClick={generateFromPrompt}
              disabled={!prompt.trim()}
              className="px-4 py-2 bg-violet-600 hover:bg-amber-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Generate Team
            </button>
          )}

          {/* Generated results — selectable */}
          {generatedAgents.length > 0 && !isGenerating && (
            <div className="space-y-2">
              <p className="text-xs text-zinc-400 uppercase tracking-wider">
                Generated — click to add to your team
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {generatedAgents.map((a) => (
                  <div key={a.id} className={isFull && !selectedIds.has(a.id) ? "opacity-40 cursor-not-allowed" : ""}>
                    <AgentCard
                      agent={a}
                      selected={selectedIds.has(a.id)}
                      onClick={() => toggle(a)}
                    />
                  </div>
                ))}
              </div>
              <button
                onClick={() => { setGeneratedAgents([]); setPrompt(""); }}
                className="text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                Clear results
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selected team */}
      {agents.length > 0 && (
        <div className="pt-2 border-t border-zinc-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-zinc-500 uppercase tracking-wider">
              Team ({agents.length}/{maxAgents})
            </span>
            {isFull && (
              <span className="text-xs text-amber-600">Team is full</span>
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            {agents.map((a) => (
              <AgentCard
                key={a.id}
                agent={a}
                compact
                onRemove={() => onChange(agents.filter((x) => x.id !== a.id))}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
