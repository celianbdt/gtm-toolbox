"use client";

import { useState } from "react";
import type { ContextDocument, DocType } from "@/lib/context/types";
import { DOC_TYPES } from "@/lib/context/types";
import { DocumentCard } from "./document-card";
import { AddDocumentSheet } from "./add-document-sheet";

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
                    ? "bg-zinc-700 text-white"
                    : "bg-zinc-900 text-zinc-500 hover:text-white"
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

        <button
          onClick={openAdd}
          className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
        >
          + Add document
        </button>
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
        <div className="flex flex-col items-center justify-center py-24 text-center border border-dashed border-zinc-800 rounded-xl">
          <div className="text-4xl mb-4">📂</div>
          <p className="text-sm text-zinc-500 mb-1">No context documents yet</p>
          <p className="text-xs text-zinc-700 mb-4">
            Add ICPs, product descriptions, competitor analyses, and more.
          </p>
          <button
            onClick={openAdd}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
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
    </>
  );
}
