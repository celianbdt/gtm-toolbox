"use client";

import { useState } from "react";
import type { ContextDocument, DocType } from "@/lib/context/types";
import { DOC_TYPES } from "@/lib/context/types";
import { DocumentCard } from "./document-card";
import { AddDocumentSheet } from "./add-document-sheet";
import { RemodelSheet } from "./remodel-sheet";
import { Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

type Props = {
  workspaceId: string;
  initialDocs: ContextDocument[];
};

type Filter = "all" | DocType;

export function ContextManager({ workspaceId, initialDocs }: Props) {
  const [docs, setDocs] = useState<ContextDocument[]>(initialDocs);
  const [filter, setFilter] = useState<Filter>("all");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editDoc, setEditDoc] = useState<ContextDocument | null>(null);
  const [remodelOpen, setRemodelOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const hasCrmDocs = docs.some((d) => d.doc_type === "crm");

  async function handleCrmResync() {
    // Find the most recent CRM doc to get the last import date
    const lastCrm = docs
      .filter((d) => d.doc_type === "crm")
      .sort((a, b) => b.updated_at.localeCompare(a.updated_at))[0];
    const updatedSince = lastCrm?.updated_at;

    // Get CRM config from env (stored in metadata of existing CRM doc)
    const crmMeta = lastCrm?.metadata as { source?: string } | undefined;
    if (!crmMeta || crmMeta.source !== "crm-import") return;

    // We need the URL and key — prompt user to use Add Document > CRM
    // For auto-sync, the URL/key would need to be stored. For now, open the sheet.
    setSheetOpen(true);
  }

  const filtered = filter === "all" ? docs : docs.filter((d) => d.doc_type === filter);

  function handleSaved(doc: ContextDocument) {
    setDocs((prev) => {
      const idx = prev.findIndex((d) => d.id === doc.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = doc;
        return next;
      }
      return [doc, ...prev];
    });
  }

  function handleDeleted(id: string) {
    setDocs((prev) => prev.filter((d) => d.id !== id));
  }

  function openEdit(doc: ContextDocument) {
    setEditDoc(doc);
    setSheetOpen(true);
  }

  function openAdd() {
    setEditDoc(null);
    setSheetOpen(true);
  }

  const filters: { value: Filter; label: string }[] = [
    { value: "all", label: "All" },
    ...DOC_TYPES.map((t) => ({ value: t.value as Filter, label: t.label })),
  ];

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        {/* Filter pills */}
        <div className="flex gap-1.5 flex-wrap">
          {filters.map((f) => {
            const typeInfo = DOC_TYPES.find((t) => t.value === f.value);
            const count = f.value === "all" ? docs.length : docs.filter((d) => d.doc_type === f.value).length;
            return (
              <button
                key={f.value}
                onClick={() => setFilter(f.value)}
                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                  filter === f.value
                    ? "bg-zinc-700 text-foreground"
                    : "bg-card text-muted-foreground hover:text-foreground"
                }`}
                style={
                  filter === f.value && typeInfo
                    ? { backgroundColor: `${typeInfo.color}25`, color: typeInfo.color }
                    : {}
                }
              >
                {f.label}
                <span className="ml-1.5 opacity-60">{count}</span>
              </button>
            );
          })}
        </div>

        <div className="flex gap-2">
          {hasCrmDocs && (
            <button
              onClick={handleCrmResync}
              disabled={syncing}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-900/30 hover:bg-amber-900/50 text-amber-400 text-sm font-medium rounded-lg transition-colors border border-amber-800/50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${syncing ? "animate-spin" : ""}`} />
              CRM Sync
            </button>
          )}
          {docs.length >= 2 && (
            <button
              onClick={() => setRemodelOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-secondary hover:bg-zinc-700 text-foreground hover:text-foreground text-sm font-medium rounded-lg transition-colors border border-border"
            >
              <Sparkles className="h-3.5 w-3.5" />
              Remodel Context
            </button>
          )}
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-violet-600 hover:bg-amber-700 text-foreground text-sm font-medium rounded-lg transition-colors"
          >
            + Add document
          </button>
        </div>
      </div>

      {/* Grid */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((doc) => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onEdit={openEdit}
              onDeleted={handleDeleted}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-border rounded-xl">
          <div className="text-4xl mb-4">📂</div>
          <p className="text-sm text-muted-foreground mb-1">No context documents yet</p>
          <p className="text-xs text-zinc-700 mb-4">
            Add ICPs, product descriptions, competitor analyses, and more.
          </p>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-violet-600 hover:bg-amber-700 text-foreground text-sm font-medium rounded-lg transition-colors"
          >
            Add your first document
          </button>
        </div>
      )}

      <AddDocumentSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        workspaceId={workspaceId}
        editDoc={editDoc}
        onSaved={handleSaved}
      />

      <RemodelSheet
        workspaceId={workspaceId}
        open={remodelOpen}
        onOpenChange={setRemodelOpen}
        onRemodeled={async () => {
          // Reload documents from supabase
          const supabase = createClient();
          const { data } = await supabase
            .from("context_documents")
            .select("*")
            .eq("workspace_id", workspaceId)
            .order("updated_at", { ascending: false });
          if (data) setDocs(data as ContextDocument[]);
        }}
      />
    </>
  );
}
