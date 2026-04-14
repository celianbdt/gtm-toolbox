"use client";

import { useState } from "react";
import type { ContextDocument } from "@/lib/context/types";
import { DOC_TYPES } from "@/lib/context/types";
import { createClient } from "@/lib/supabase/client";

type Props = {
  doc: ContextDocument;
  onEdit: (doc: ContextDocument) => void;
  onDeleted: (id: string) => void;
};

export function DocumentCard({ doc, onEdit, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false);
  const typeInfo = DOC_TYPES.find((t) => t.value === doc.doc_type);

  async function handleDelete() {
    if (!confirm(`Supprimer "${doc.title}" ?`)) return;
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("context_documents").delete().eq("id", doc.id);
    onDeleted(doc.id);
  }

  const excerpt = doc.content.slice(0, 180).replace(/\s+/g, " ");

  return (
    <div className="group relative rounded-xl border border-border bg-zinc-950 p-4 hover:border-zinc-600 transition-colors">
      {/* Type badge */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <span
          className="text-[11px] font-medium px-2 py-0.5 rounded-full"
          style={{
            backgroundColor: `${typeInfo?.color}20`,
            color: typeInfo?.color,
          }}
        >
          {typeInfo?.label}
        </span>
        {/* Actions — visible on hover */}
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => onEdit(doc)}
            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-zinc-700 text-foreground transition-colors"
          >
            Edit
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="text-xs px-2 py-1 rounded bg-secondary hover:bg-red-900 text-foreground hover:text-red-300 transition-colors disabled:opacity-50"
          >
            {deleting ? "..." : "Delete"}
          </button>
        </div>
      </div>

      <h3 className="text-sm font-semibold text-foreground mb-2 line-clamp-1">{doc.title}</h3>

      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">
        {excerpt}
        {doc.content.length > 180 && "…"}
      </p>

      <div className="mt-3 text-[10px] text-zinc-700">
        {new Date(doc.updated_at).toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })}
      </div>
    </div>
  );
}
