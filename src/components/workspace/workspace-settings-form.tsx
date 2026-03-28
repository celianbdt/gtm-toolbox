"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import type { Workspace } from "@/components/workspace/workspace-provider";

const COLORS = [
  "#6366f1", // indigo
  "#8b5cf6", // violet
  "#ec4899", // pink
  "#10b981", // emerald
  "#f59e0b", // amber
  "#3b82f6", // blue
];

type Props = {
  workspace: Workspace;
};

export function WorkspaceSettingsForm({ workspace }: Props) {
  const router = useRouter();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? "");
  const [color, setColor] = useState(workspace.color);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);

    const res = await fetch(`/api/workspaces/${workspace.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color }),
    });

    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      router.refresh();
    }
    setSaving(false);
  }

  async function handleDelete() {
    setDeleting(true);
    const res = await fetch(`/api/workspaces/${workspace.slug}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/workspaces");
      router.refresh();
    }
    setDeleting(false);
  }

  return (
    <div className="max-w-xl space-y-10">
      {/* General */}
      <section>
        <h2 className="text-base font-semibold text-white mb-4">Général</h2>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Nom</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nom du workspace"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Description</label>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Description optionnelle"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-sm text-zinc-400">Couleur</label>
            <div className="flex gap-2">
              {COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className="w-7 h-7 rounded-full transition-all"
                  style={{
                    backgroundColor: c,
                    outline: color === c ? `2px solid ${c}` : "2px solid transparent",
                    outlineOffset: "2px",
                  }}
                />
              ))}
            </div>
          </div>

          <Button type="submit" disabled={saving || !name.trim()}>
            {saved ? "Sauvegardé ✓" : saving ? "Sauvegarde..." : "Sauvegarder"}
          </Button>
        </form>
      </section>

      {/* Danger zone */}
      <section className="border border-red-900/50 rounded-xl p-5 space-y-3">
        <h2 className="text-base font-semibold text-red-400">Zone de danger</h2>
        <p className="text-sm text-zinc-400">
          Supprimer ce workspace supprime définitivement toutes les données associées (contexte, agents, sessions).
        </p>
        <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
          <DialogTrigger asChild>
            <Button variant="destructive" size="sm">
              Supprimer le workspace
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Supprimer « {workspace.name} » ?</DialogTitle>
              <DialogDescription>
                Cette action est irréversible. Toutes les données de ce workspace seront supprimées.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteOpen(false)}>
                Annuler
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting ? "Suppression..." : "Supprimer définitivement"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </section>
    </div>
  );
}
