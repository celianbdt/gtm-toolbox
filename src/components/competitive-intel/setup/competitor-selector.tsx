"use client";

import { useState, useEffect } from "react";
import { Plus, Trash2, Globe, FileText } from "lucide-react";
import type { CompetitorEntry, CompetitorDataSource } from "@/lib/competitive-intel/types";

type Props = {
  workspaceId: string;
  competitors: CompetitorEntry[];
  onChange: (competitors: CompetitorEntry[]) => void;
};

export function CompetitorSelector({ workspaceId, competitors, onChange }: Props) {
  const [existingDocs, setExistingDocs] = useState<
    { id: string; title: string; content: string }[]
  >([]);

  useEffect(() => {
    fetch(`/api/context/competitors?workspaceId=${workspaceId}`)
      .then((r) => r.json())
      .then((d) => setExistingDocs(d.docs ?? []))
      .catch(() => {});
  }, [workspaceId]);

  function addCompetitor() {
    if (competitors.length >= 3) return;
    onChange([
      ...competitors,
      {
        id: crypto.randomUUID(),
        name: "",
        website: "",
        data_sources: [],
      },
    ]);
  }

  function removeCompetitor(id: string) {
    onChange(competitors.filter((c) => c.id !== id));
  }

  function updateCompetitor(id: string, updates: Partial<CompetitorEntry>) {
    onChange(competitors.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Select Competitors
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Add 1 to 3 competitors to analyze. You can paste URLs, upload docs, or use existing context.
      </p>

      <div className="space-y-4">
        {competitors.map((comp) => (
          <CompetitorCard
            key={comp.id}
            competitor={comp}
            existingDocs={existingDocs}
            onUpdate={(updates) => updateCompetitor(comp.id, updates)}
            onRemove={() => removeCompetitor(comp.id)}
          />
        ))}
      </div>

      {competitors.length < 3 && (
        <button
          onClick={addCompetitor}
          className="mt-4 flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#7C3AED]/30 transition-colors w-full justify-center"
        >
          <Plus className="size-4" />
          Add Competitor
        </button>
      )}
    </div>
  );
}

function CompetitorCard({
  competitor,
  existingDocs,
  onUpdate,
  onRemove,
}: {
  competitor: CompetitorEntry;
  existingDocs: { id: string; title: string; content: string }[];
  onUpdate: (updates: Partial<CompetitorEntry>) => void;
  onRemove: () => void;
}) {
  const [urlInput, setUrlInput] = useState("");
  const [scraping, setScraping] = useState(false);
  const [notesInput, setNotesInput] = useState("");

  async function scrapeUrl() {
    if (!urlInput.trim()) return;
    setScraping(true);
    try {
      const res = await fetch("/api/context/scrape-url", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: urlInput.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.text) {
        const pageTitle = data.title || urlInput.trim();
        const newSource: CompetitorDataSource = {
          type: "url",
          title: pageTitle,
          content: data.text,
        };

        // Build all updates in a single call to avoid stale state
        const updates: Partial<CompetitorEntry> = {
          data_sources: [...competitor.data_sources, newSource],
        };
        if (!competitor.name.trim()) {
          const cleanName = pageTitle.replace(/\s*[-|–—].*$/, "").trim();
          updates.name = cleanName || pageTitle;
        }
        if (!competitor.website) {
          try {
            updates.website = new URL(urlInput.trim()).origin;
          } catch {}
        }

        onUpdate(updates);
        setUrlInput("");
      }
    } catch {
      // silently fail
    }
    setScraping(false);
  }

  function addNotes() {
    if (!notesInput.trim()) return;
    onUpdate({
      data_sources: [
        ...competitor.data_sources,
        { type: "manual", title: "Manual notes", content: notesInput.trim() },
      ],
    });
    setNotesInput("");
  }

  return (
    <div className="border border-border rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Competitor name"
          value={competitor.name}
          onChange={(e) => onUpdate({ name: e.target.value })}
          className="flex-1 bg-transparent border-b border-border text-foreground text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-[#7C3AED] pb-1"
        />
        <button
          onClick={onRemove}
          className="text-muted-foreground hover:text-red-400 transition-colors"
        >
          <Trash2 className="size-4" />
        </button>
      </div>

      <input
        type="url"
        placeholder="Website URL (optional)"
        value={competitor.website ?? ""}
        onChange={(e) => onUpdate({ website: e.target.value })}
        className="w-full bg-transparent text-sm text-muted-foreground placeholder:text-muted-foreground border-b border-border/50 focus:outline-none focus:border-[#7C3AED] pb-1"
      />

      {/* Data sources */}
      {competitor.data_sources.length > 0 && (
        <div className="space-y-1.5">
          {competitor.data_sources.map((src, i) => (
            <div
              key={i}
              className="flex items-center gap-2 text-xs text-muted-foreground bg-secondary/50 rounded px-2.5 py-1.5"
            >
              {src.type === "url" ? (
                <Globe className="size-3 shrink-0" />
              ) : (
                <FileText className="size-3 shrink-0" />
              )}
              <span className="truncate flex-1">{src.title}</span>
              <span className="text-muted-foreground/50">{src.content.length} chars</span>
              <button
                onClick={() => onUpdate({ data_sources: competitor.data_sources.filter((_, idx) => idx !== i) })}
                className="hover:text-red-400"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add URL */}
      <div className="flex gap-2">
        <input
          type="url"
          placeholder="Paste a URL to scrape..."
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && scrapeUrl()}
          className="flex-1 text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
        />
        <button
          onClick={scrapeUrl}
          disabled={scraping || !urlInput.trim()}
          className="text-xs px-3 py-1.5 bg-secondary hover:bg-accent text-foreground rounded disabled:opacity-40 transition-colors"
        >
          {scraping ? "..." : "Scrape"}
        </button>
      </div>

      {/* Add notes */}
      <div className="flex gap-2">
        <input
          type="text"
          placeholder="Paste notes or intel..."
          value={notesInput}
          onChange={(e) => setNotesInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addNotes()}
          className="flex-1 text-xs bg-secondary/30 rounded px-2.5 py-1.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
        />
        <button
          onClick={addNotes}
          disabled={!notesInput.trim()}
          className="text-xs px-3 py-1.5 bg-secondary hover:bg-accent text-foreground rounded disabled:opacity-40 transition-colors"
        >
          Add
        </button>
      </div>

      {/* Import from existing docs */}
      {existingDocs.length > 0 && competitor.data_sources.length === 0 && (
        <div className="pt-1">
          <p className="text-xs text-muted-foreground mb-1.5">
            Import from existing context:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {existingDocs.map((doc) => (
              <button
                key={doc.id}
                onClick={() => onUpdate({
                  data_sources: [...competitor.data_sources, { type: "document", title: doc.title, content: doc.content }],
                  ...(!competitor.name.trim() ? { name: doc.title } : {}),
                })}
                className="text-xs px-2.5 py-1 bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                {doc.title}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
