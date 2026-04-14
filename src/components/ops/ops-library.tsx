"use client";

import { useCallback, useEffect, useState } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Textarea } from "@/components/ui/textarea";
import { Plus, Search, Pin, PinOff, Trash2 } from "lucide-react";
import type { OpsNote, NoteSource } from "@/lib/ops/types";
import { SOURCE_LABELS, SOURCE_COLORS } from "@/lib/ops/types";

export function OpsLibrary() {
  const workspace = useWorkspace();
  const [notes, setNotes] = useState<OpsNote[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterSource, setFilterSource] = useState<string>("");

  // Add note form
  const [addOpen, setAddOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [newTags, setNewTags] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchNotes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ workspace_id: workspace.id });
      if (search) params.set("search", search);
      if (filterSource) params.set("source", filterSource);

      const res = await fetch(`/api/ops/notes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setNotes(data.notes ?? []);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, [workspace.id, search, filterSource]);

  useEffect(() => {
    fetchNotes();
  }, [fetchNotes]);

  async function handleCreate() {
    if (!newTitle.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/ops/notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          title: newTitle.trim(),
          content: newContent.trim(),
          tags: newTags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
        }),
      });
      if (res.ok) {
        setNewTitle("");
        setNewContent("");
        setNewTags("");
        setAddOpen(false);
        fetchNotes();
      }
    } finally {
      setCreating(false);
    }
  }

  async function handleTogglePin(note: OpsNote) {
    await fetch(`/api/ops/notes/${note.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_pinned: !note.is_pinned }),
    });
    fetchNotes();
  }

  async function handleDelete(noteId: string) {
    await fetch(`/api/ops/notes/${noteId}`, { method: "DELETE" });
    fetchNotes();
  }

  const sources: NoteSource[] = ["manual", "debate", "copywriting", "messaging-lab", "competitive-intel", "outbound-builder"];

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Rechercher..."
            className="pl-8 h-8 text-xs"
          />
        </div>

        <div className="flex gap-1 flex-wrap">
          <Badge
            variant={filterSource === "" ? "default" : "secondary"}
            className="cursor-pointer text-[10px]"
            onClick={() => setFilterSource("")}
          >
            Tous
          </Badge>
          {sources.map((s) => (
            <Badge
              key={s}
              variant={filterSource === s ? "default" : "secondary"}
              className="cursor-pointer text-[10px]"
              style={
                filterSource === s
                  ? { backgroundColor: SOURCE_COLORS[s], color: "white" }
                  : {}
              }
              onClick={() => setFilterSource(filterSource === s ? "" : s)}
            >
              {SOURCE_LABELS[s]}
            </Badge>
          ))}
        </div>

        <Sheet open={addOpen} onOpenChange={setAddOpen}>
          <SheetTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1">
              <Plus className="size-3" />
              Ajouter
            </Button>
          </SheetTrigger>
          <SheetContent>
            <SheetHeader>
              <SheetTitle>Nouvelle note</SheetTitle>
            </SheetHeader>
            <div className="space-y-4 mt-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Titre *</label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Titre de la note"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">Contenu</label>
                <Textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Insight, signal, learning..."
                  rows={8}
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground">
                  Tags (separes par des virgules)
                </label>
                <Input
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="icp, pricing, competitor"
                />
              </div>
              <Button
                onClick={handleCreate}
                disabled={creating || !newTitle.trim()}
                className="w-full"
              >
                {creating ? "Creation..." : "Creer"}
              </Button>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Notes grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : notes.length === 0 ? (
        <div className="text-center py-12 text-sm text-muted-foreground">
          {search || filterSource
            ? "Aucune note ne correspond aux filtres."
            : "Aucune note. Ajoute tes premiers insights."}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {notes.map((note) => (
            <Card
              key={note.id}
              className={`transition-colors ${
                note.is_pinned ? "border-amber-700/30 bg-amber-700/5" : ""
              }`}
            >
              <CardContent className="py-3 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-sm font-medium line-clamp-1">{note.title}</h3>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleTogglePin(note)}
                    >
                      {note.is_pinned ? (
                        <PinOff className="size-3 text-amber-600" />
                      ) : (
                        <Pin className="size-3 text-muted-foreground" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-6 w-6 p-0"
                      onClick={() => handleDelete(note.id)}
                    >
                      <Trash2 className="size-3 text-muted-foreground hover:text-red-400" />
                    </Button>
                  </div>
                </div>

                {note.content && (
                  <p className="text-xs text-muted-foreground line-clamp-3">
                    {note.content}
                  </p>
                )}

                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1"
                    style={{
                      color: SOURCE_COLORS[note.source as NoteSource] ?? "#6b7280",
                      backgroundColor: `${SOURCE_COLORS[note.source as NoteSource] ?? "#6b7280"}15`,
                    }}
                  >
                    {SOURCE_LABELS[note.source as NoteSource] ?? note.source}
                  </Badge>
                  {note.tags.map((tag) => (
                    <Badge key={tag} variant="outline" className="text-[9px] px-1">
                      {tag}
                    </Badge>
                  ))}
                </div>

                <p className="text-[10px] text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString("fr-FR", {
                    day: "numeric",
                    month: "short",
                  })}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
