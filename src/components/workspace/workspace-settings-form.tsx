"use client";

import { useRef, useState } from "react";
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
import { ImagePlus, Trash2 } from "lucide-react";
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
  const [missionStage, setMissionStage] = useState(workspace.mission_stage);
  const [logoUrl, setLogoUrl] = useState<string | null>(workspace.logo_url);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);
    formData.append("workspace_id", workspace.id);

    try {
      const res = await fetch("/api/workspaces/logo", {
        method: "POST",
        body: formData,
      });
      if (res.ok) {
        const data = await res.json();
        setLogoUrl(data.logo_url);
        router.refresh();
      }
    } catch {
      // upload failed silently
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleLogoRemove() {
    const res = await fetch(`/api/workspaces/${workspace.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ logo_url: null }),
    });
    if (res.ok) {
      setLogoUrl(null);
      router.refresh();
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    setSaved(false);

    const res = await fetch(`/api/workspaces/${workspace.slug}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), description: description.trim() || null, color, mission_stage: missionStage }),
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

        {/* Logo upload */}
        <div className="space-y-1.5 mb-6">
          <label className="text-sm text-zinc-400">Logo</label>
          <div className="flex items-center gap-4">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={`${workspace.name} logo`}
                className="size-12 rounded-lg object-cover border border-border"
              />
            ) : (
              <div
                className="size-12 rounded-lg flex items-center justify-center border border-dashed border-border"
                style={{ backgroundColor: `${color}15` }}
              >
                <span
                  className="size-5 rounded-full"
                  style={{ backgroundColor: color }}
                />
              </div>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                <ImagePlus className="size-4 mr-1.5" />
                {uploading ? "Upload..." : logoUrl ? "Changer" : "Ajouter un logo"}
              </Button>
              {logoUrl && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleLogoRemove}
                >
                  <Trash2 className="size-4" />
                </Button>
              )}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleLogoUpload}
            />
          </div>
          <p className="text-[11px] text-muted-foreground">PNG, JPG ou SVG. Max 2 MB.</p>
        </div>

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
            <label className="text-sm text-zinc-400">Phase mission</label>
            <select
              value={missionStage}
              onChange={(e) => setMissionStage(e.target.value as typeof missionStage)}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            >
              <option value="discovery">Discovery</option>
              <option value="foundation">Foundation</option>
              <option value="optimization">Optimization</option>
              <option value="scaling">Scaling</option>
            </select>
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
