"use client";

import { useState, useEffect, useCallback } from "react";
import { Check, X, Clock, UserPlus, Shield } from "lucide-react";

type WhitelistEntry = {
  id: string;
  email: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  approved_at: string | null;
};

export function WhitelistPanel() {
  const [entries, setEntries] = useState<WhitelistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
  const [addEmail, setAddEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [actioningId, setActioningId] = useState<string | null>(null);

  const loadEntries = useCallback(async () => {
    const url = filter === "all"
      ? "/api/auth/whitelist"
      : `/api/auth/whitelist?status=${filter}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = await res.json();
      setEntries(data.entries ?? []);
    }
    setLoading(false);
  }, [filter]);

  useEffect(() => {
    setLoading(true);
    loadEntries();
  }, [loadEntries]);

  async function handleAction(id: string, action: "approve" | "reject") {
    setActioningId(id);
    const res = await fetch("/api/auth/whitelist", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    if (res.ok) {
      await loadEntries();
    }
    setActioningId(null);
  }

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!addEmail.trim()) return;
    setAdding(true);
    const res = await fetch("/api/auth/whitelist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: addEmail.trim().toLowerCase() }),
    });
    if (res.ok) {
      setAddEmail("");
      await loadEntries();
    }
    setAdding(false);
  }

  const pendingCount = entries.filter((e) => e.status === "pending").length;
  const filters = [
    { value: "all" as const, label: "Tous" },
    { value: "pending" as const, label: `En attente${pendingCount > 0 ? ` (${pendingCount})` : ""}` },
    { value: "approved" as const, label: "Approuvés" },
    { value: "rejected" as const, label: "Refusés" },
  ];

  const statusConfig = {
    pending: { icon: Clock, color: "text-amber-400", bg: "bg-amber-400/10", label: "En attente" },
    approved: { icon: Check, color: "text-emerald-400", bg: "bg-emerald-400/10", label: "Approuvé" },
    rejected: { icon: X, color: "text-red-400", bg: "bg-red-400/10", label: "Refusé" },
  };

  return (
    <div className="border border-border rounded-xl overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-border bg-card">
        <div className="flex items-center gap-2 mb-3">
          <Shield className="h-4 w-4 text-amber-600" />
          <h3 className="text-sm font-semibold text-foreground">Gestion des accès</h3>
        </div>

        {/* Add email */}
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={addEmail}
            onChange={(e) => setAddEmail(e.target.value)}
            placeholder="Ajouter un email..."
            type="email"
            className="flex-1 bg-secondary border border-border rounded-lg px-3 py-1.5 text-sm text-foreground placeholder-zinc-500 focus:outline-none focus:border-violet-600"
          />
          <button
            type="submit"
            disabled={adding || !addEmail.trim()}
            className="flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-amber-700 disabled:opacity-40 text-foreground text-xs font-medium rounded-lg transition-colors"
          >
            <UserPlus className="h-3 w-3" />
            {adding ? "..." : "Inviter"}
          </button>
        </form>

        {/* Filters */}
        <div className="flex gap-1 mt-3">
          {filters.map((f) => (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-zinc-700 text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="max-h-64 overflow-y-auto">
        {loading ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Chargement...</div>
        ) : entries.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-muted-foreground">Aucune entrée</div>
        ) : (
          <div className="divide-y divide-zinc-800/50">
            {entries.map((entry) => {
              const cfg = statusConfig[entry.status];
              const Icon = cfg.icon;
              return (
                <div key={entry.id} className="px-5 py-3 flex items-center gap-3">
                  <div className={`p-1 rounded-md ${cfg.bg}`}>
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{entry.email}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {new Date(entry.created_at).toLocaleDateString("fr-FR")}
                      {entry.approved_at && ` · Approuvé le ${new Date(entry.approved_at).toLocaleDateString("fr-FR")}`}
                    </p>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${cfg.bg} ${cfg.color}`}>
                    {cfg.label}
                  </span>
                  {entry.status === "pending" && (
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleAction(entry.id, "approve")}
                        disabled={actioningId === entry.id}
                        className="p-1 rounded-md bg-emerald-400/10 text-emerald-400 hover:bg-emerald-400/20 transition-colors"
                        title="Approuver"
                      >
                        <Check className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleAction(entry.id, "reject")}
                        disabled={actioningId === entry.id}
                        className="p-1 rounded-md bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-colors"
                        title="Refuser"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
