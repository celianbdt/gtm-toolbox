"use client";

import { useCallback, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Copy, CheckCircle2, Save } from "lucide-react";
import { WorkspaceLogo } from "@/components/workspace/workspace-logo";
import type { WorkspaceWithMeta } from "@/lib/types/dashboard";

type Props = {
  workspaces: WorkspaceWithMeta[];
};

export function ClientReportBuilder({ workspaces }: Props) {
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [vocalNotes, setVocalNotes] = useState("");
  const [markdown, setMarkdown] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const toggleWorkspace = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleGenerate = useCallback(async () => {
    if (selectedIds.size === 0) return;
    setGenerating(true);
    setMarkdown("");
    setSaved(false);

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/dashboard/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_ids: Array.from(selectedIds),
          vocal_notes: vocalNotes.trim(),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setGenerating(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setMarkdown(accumulated);
      }
    } catch {
      // aborted or error
    } finally {
      setGenerating(false);
    }
  }, [selectedIds, vocalNotes]);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(markdown);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = async () => {
    const wsNames = workspaces
      .filter((w) => selectedIds.has(w.id))
      .map((w) => w.name)
      .join(", ");

    await fetch("/api/dashboard/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title: `Rapport — ${wsNames}`,
        workspace_ids: Array.from(selectedIds),
        vocal_notes: vocalNotes.trim(),
        raw_markdown: markdown,
      }),
    });
    setSaved(true);
  };

  return (
    <div className="space-y-6">
      {/* Step 1: Select workspaces */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          1. Selectionne les workspaces
        </label>
        <div className="flex flex-wrap gap-2">
          {workspaces.map((ws) => {
            const isSelected = selectedIds.has(ws.id);
            return (
              <Card
                key={ws.id}
                className={`cursor-pointer transition-all ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : "hover:border-border/80"
                }`}
                onClick={() => toggleWorkspace(ws.id)}
              >
                <CardContent className="flex items-center gap-2 py-2 px-3">
                  <WorkspaceLogo
                    logoUrl={ws.logo_url}
                    color={ws.color}
                    name={ws.name}
                    size="sm"
                  />
                  <span className="text-sm">{ws.name}</span>
                  {isSelected && (
                    <CheckCircle2 className="size-3.5 text-primary ml-1" />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
        {selectedIds.size > 0 && (
          <p className="text-[11px] text-muted-foreground">
            {selectedIds.size} workspace(s) selectionne(s)
          </p>
        )}
      </div>

      {/* Step 2: Vocal notes */}
      <div className="space-y-2">
        <label className="text-sm font-medium">
          2. Notes complementaires (optionnel)
        </label>
        <Textarea
          value={vocalNotes}
          onChange={(e) => setVocalNotes(e.target.value)}
          placeholder="Ajoute du contexte, des commentaires, ce que tu veux mettre en avant dans le rapport..."
          rows={3}
        />
      </div>

      {/* Generate button */}
      <Button
        onClick={handleGenerate}
        disabled={generating || selectedIds.size === 0}
      >
        {generating ? (
          <Loader2 className="size-4 animate-spin mr-2" />
        ) : null}
        {generating ? "Generation en cours..." : "3. Generer le rapport"}
      </Button>

      {/* Report output */}
      {markdown && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium">Rapport genere</h3>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 text-xs gap-1">
                {copied ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    Copie
                  </>
                ) : (
                  <>
                    <Copy className="size-3" />
                    Copier
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleSave}
                disabled={saved}
                className="h-7 text-xs gap-1"
              >
                {saved ? (
                  <>
                    <CheckCircle2 className="size-3 text-emerald-500" />
                    Sauvegarde
                  </>
                ) : (
                  <>
                    <Save className="size-3" />
                    Sauvegarder
                  </>
                )}
              </Button>
            </div>
          </div>

          <Card>
            <CardContent className="py-4">
              <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap">
                {markdown}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
