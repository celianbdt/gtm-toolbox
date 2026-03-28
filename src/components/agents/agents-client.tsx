"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AgentLibraryCard } from "./agent-library-card";
import { AgentFormSheet } from "./agent-form-sheet";
import type { AgentConfig } from "@/lib/debate/types";

type Props = {
  workspaceId: string;
  workspaceName: string;
  initialTemplates: AgentConfig[];
  initialAgents: AgentConfig[];
};

export function AgentsClient({ workspaceId, workspaceName, initialTemplates, initialAgents }: Props) {
  const [agents, setAgents] = useState<AgentConfig[]>(initialAgents);
  const [createOpen, setCreateOpen] = useState(false);
  const [editAgent, setEditAgent] = useState<AgentConfig | null>(null);
  const [cloning, setCloning] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleClone(template: AgentConfig) {
    setCloning(template.id);
    try {
      const res = await fetch(`/api/agents/${template.id}/clone`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId }),
      });
      const data = await res.json();
      if (res.ok) setAgents((prev) => [...prev, data.agent]);
    } finally {
      setCloning(null);
    }
  }

  async function handleDelete(agent: AgentConfig) {
    setDeleting(agent.id);
    try {
      const res = await fetch(`/api/agents/${agent.id}`, { method: "DELETE" });
      if (res.ok) setAgents((prev) => prev.filter((a) => a.id !== agent.id));
    } finally {
      setDeleting(null);
    }
  }

  function handleSaved(saved: AgentConfig) {
    setAgents((prev) => {
      const exists = prev.find((a) => a.id === saved.id);
      return exists ? prev.map((a) => (a.id === saved.id ? saved : a)) : [...prev, saved];
    });
  }

  return (
    <div className="flex-1 p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Agents</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Bibliothèque d'agents pour {workspaceName}
          </p>
        </div>
        <Button size="sm" onClick={() => setCreateOpen(true)}>
          <Plus className="size-4" />
          Créer un agent
        </Button>
      </div>

      {/* Template agents */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Templates
        </h2>
        {initialTemplates.length === 0 ? (
          <p className="text-sm text-zinc-500">Aucun template disponible.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {initialTemplates.map((t) => (
              <AgentLibraryCard
                key={t.id}
                agent={t}
                isTemplate
                onClone={cloning === t.id ? undefined : () => handleClone(t)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Workspace agents */}
      <section>
        <h2 className="text-sm font-medium text-zinc-400 uppercase tracking-wider mb-3">
          Mes agents
        </h2>
        {agents.length === 0 ? (
          <div className="flex items-center justify-center rounded-lg border border-dashed border-zinc-800 p-10 text-center">
            <div>
              <p className="text-sm text-zinc-500">Aucun agent personnalisé.</p>
              <p className="text-xs text-zinc-600 mt-1">
                Clone un template ou crée un agent depuis zéro.
              </p>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {agents.map((a) => (
              <AgentLibraryCard
                key={a.id}
                agent={a}
                onEdit={() => setEditAgent(a)}
                onDelete={deleting === a.id ? undefined : () => handleDelete(a)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Create sheet */}
      <AgentFormSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        workspaceId={workspaceId}
        onSaved={handleSaved}
      />

      {/* Edit sheet */}
      {editAgent && (
        <AgentFormSheet
          open={!!editAgent}
          onOpenChange={(v) => { if (!v) setEditAgent(null); }}
          workspaceId={workspaceId}
          agent={editAgent}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
