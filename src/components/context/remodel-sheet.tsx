"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sparkles, Loader2, Check, AlertTriangle, ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { DocType } from "@/lib/context/types";

type Phase = "analyzing" | "questions" | "restructuring" | "preview";

type Question = {
  id: string;
  question: string;
  context: string;
  reason: string;
};

type DocumentTheme = {
  theme: string;
  source_documents: string[];
  description: string;
};

type NewDocument = {
  title: string;
  doc_type: string;
  content: string;
  sources: string[];
};

type Props = {
  workspaceId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onRemodeled: () => void;
};

export function RemodelSheet({ workspaceId, open, onOpenChange, onRemodeled }: Props) {
  const [phase, setPhase] = useState<Phase>("analyzing");
  const [error, setError] = useState("");

  // Phase 2 state
  const [questions, setQuestions] = useState<Question[]>([]);
  const [documentThemes, setDocumentThemes] = useState<DocumentTheme[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  // Phase 4 state
  const [newDocuments, setNewDocuments] = useState<NewDocument[]>([]);
  const [changelog, setChangelog] = useState<string[]>([]);
  const [expandedDocs, setExpandedDocs] = useState<Set<number>>(new Set());
  const [applying, setApplying] = useState(false);

  const reset = useCallback(() => {
    setPhase("analyzing");
    setError("");
    setQuestions([]);
    setDocumentThemes([]);
    setAnswers({});
    setNewDocuments([]);
    setChangelog([]);
    setExpandedDocs(new Set());
    setApplying(false);
  }, []);

  // Phase 1: auto-analyze on open
  useEffect(() => {
    if (!open) return;
    reset();
    runAnalysis();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function runAnalysis() {
    setPhase("analyzing");
    setError("");
    try {
      const res = await fetch("/api/context/remodel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, action: "analyze" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Analysis failed");

      setQuestions(data.questions || []);
      setDocumentThemes(data.document_themes || []);

      if (data.questions && data.questions.length > 0) {
        setPhase("questions");
      } else {
        // Skip to restructuring if no questions
        runRestructure([], data.document_themes || []);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Analysis failed");
    }
  }

  async function runRestructure(
    finalAnswers: { id: string; answer: string }[],
    themes: DocumentTheme[]
  ) {
    setPhase("restructuring");
    setError("");
    try {
      const res = await fetch("/api/context/remodel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          action: "restructure",
          answers: finalAnswers,
          document_themes: themes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Restructure failed");

      setNewDocuments(data.documents || []);
      setChangelog(data.changelog || []);
      setPhase("preview");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restructure failed");
    }
  }

  function handleContinue() {
    const finalAnswers = questions.map((q) => ({
      id: q.id,
      answer: answers[q.id] || "",
    }));
    runRestructure(finalAnswers, documentThemes);
  }

  async function handleApply() {
    setApplying(true);
    setError("");
    try {
      const supabase = createClient();

      // Delete all existing documents
      const { error: deleteError } = await supabase
        .from("context_documents")
        .delete()
        .eq("workspace_id", workspaceId);

      if (deleteError) throw deleteError;

      // Insert new documents
      const inserts = newDocuments.map((doc) => ({
        workspace_id: workspaceId,
        title: doc.title,
        content: doc.content,
        doc_type: doc.doc_type as DocType,
        metadata: { sources: doc.sources, remodeled: true },
      }));

      const { error: insertError } = await supabase
        .from("context_documents")
        .insert(inserts);

      if (insertError) throw insertError;

      onRemodeled();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply");
      setApplying(false);
    }
  }

  function toggleExpand(idx: number) {
    setExpandedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  }

  const DOC_TYPE_COLORS: Record<string, string> = {
    icp: "#8a6e4e",
    product: "#06b6d4",
    competitor: "#ef4444",
    general: "#6b7280",
  };

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) reset();
        onOpenChange(v);
      }}
    >
      <SheetContent className="w-full sm:max-w-2xl overflow-hidden flex flex-col gap-0 p-0">
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-600" />
            Remodel Context
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="flex-1">
          <div className="px-6 py-6 space-y-6">
            {/* Error */}
            {error && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-red-950/50 border border-red-900 text-sm text-red-300">
                <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Phase 1: Analyzing */}
            {phase === "analyzing" && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-8 w-8 text-amber-600 animate-spin mb-4" />
                <p className="text-sm text-foreground font-medium">
                  Analyse de vos documents...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Identification des informations potentiellement obsoletes
                </p>
              </div>
            )}

            {/* Phase 2: Questions */}
            {phase === "questions" && (
              <div className="space-y-6">
                <div>
                  <p className="text-sm text-foreground font-medium mb-1">
                    Questions de clarification
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Repondez aux questions pour mettre a jour votre contexte. Laissez vide pour conserver l&apos;information actuelle.
                  </p>
                </div>

                <div className="space-y-4">
                  {questions.map((q) => (
                    <div
                      key={q.id}
                      className="rounded-lg border border-border bg-zinc-950 p-4 space-y-2"
                    >
                      <p className="text-sm font-medium text-foreground">
                        {q.question}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <span className="text-muted-foreground">{q.context}</span>
                        {" — "}
                        {q.reason}
                      </p>
                      <Textarea
                        value={answers[q.id] || ""}
                        onChange={(e) =>
                          setAnswers((prev) => ({
                            ...prev,
                            [q.id]: e.target.value,
                          }))
                        }
                        placeholder="Votre reponse (optionnel)..."
                        rows={2}
                        className="mt-2 bg-card border-border text-sm"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Phase 3: Restructuring */}
            {phase === "restructuring" && !error && (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Loader2 className="h-8 w-8 text-amber-600 animate-spin mb-4" />
                <p className="text-sm text-foreground font-medium">
                  Restructuration en cours...
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Creation de documents thematiques optimises
                </p>
              </div>
            )}

            {/* Phase 4: Preview */}
            {phase === "preview" && (
              <div className="space-y-6">
                {/* Changelog */}
                {changelog.length > 0 && (
                  <div className="rounded-lg border border-border bg-zinc-950 p-4 space-y-2">
                    <p className="text-sm font-medium text-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-400" />
                      Changements
                    </p>
                    <ul className="space-y-1">
                      {changelog.map((item, i) => (
                        <li
                          key={i}
                          className="text-xs text-muted-foreground flex items-start gap-2"
                        >
                          <span className="text-muted-foreground mt-0.5">-</span>
                          {item}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                <Separator className="bg-secondary" />

                {/* Documents preview */}
                <div>
                  <p className="text-sm font-medium text-foreground mb-3">
                    Nouveaux documents ({newDocuments.length})
                  </p>
                  <div className="space-y-3">
                    {newDocuments.map((doc, idx) => {
                      const expanded = expandedDocs.has(idx);
                      const color = DOC_TYPE_COLORS[doc.doc_type] || "#6b7280";
                      return (
                        <div
                          key={idx}
                          className="rounded-lg border border-border bg-zinc-950 overflow-hidden"
                        >
                          <button
                            onClick={() => toggleExpand(idx)}
                            className="w-full flex items-center gap-3 p-4 text-left hover:bg-card transition-colors"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="text-sm font-medium text-foreground truncate">
                                  {doc.title}
                                </span>
                                <Badge
                                  variant="outline"
                                  className="text-[10px] shrink-0"
                                  style={{
                                    borderColor: `${color}40`,
                                    color,
                                  }}
                                >
                                  {doc.doc_type}
                                </Badge>
                              </div>
                              {!expanded && (
                                <p className="text-xs text-muted-foreground truncate">
                                  {doc.content.slice(0, 200).replace(/\s+/g, " ")}
                                </p>
                              )}
                            </div>
                          </button>
                          {expanded && (
                            <div className="px-4 pb-4 pt-0">
                              <Separator className="bg-secondary mb-3" />
                              <pre className="text-xs text-muted-foreground whitespace-pre-wrap font-mono leading-relaxed max-h-80 overflow-y-auto">
                                {doc.content}
                              </pre>
                              {doc.sources.length > 0 && (
                                <p className="text-[10px] text-muted-foreground mt-3">
                                  Sources : {doc.sources.join(", ")}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Warning */}
                <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-950/30 border border-amber-900/50 text-xs text-amber-300">
                  <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Ceci va remplacer tous vos documents de contexte existants par les nouveaux documents ci-dessus.
                  </span>
                </div>
              </div>
            )}
          </div>
        </ScrollArea>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-2">
          {phase === "questions" && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  // Skip all questions — proceed with empty answers
                  runRestructure(
                    questions.map((q) => ({ id: q.id, answer: "" })),
                    documentThemes
                  );
                }}
                className="text-muted-foreground"
              >
                Tout passer
              </Button>
              <Button onClick={handleContinue} className="bg-violet-600 hover:bg-amber-700">
                Continuer
              </Button>
            </>
          )}

          {phase === "preview" && (
            <>
              <Button
                variant="ghost"
                onClick={() => {
                  reset();
                  onOpenChange(false);
                }}
                className="text-muted-foreground"
              >
                Annuler
              </Button>
              <Button
                onClick={handleApply}
                disabled={applying}
                className="bg-violet-600 hover:bg-amber-700"
              >
                {applying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Application...
                  </>
                ) : (
                  <>
                    <Check className="h-4 w-4 mr-2" />
                    Appliquer
                  </>
                )}
              </Button>
            </>
          )}

          {(phase === "analyzing" || phase === "restructuring") && error && (
            <Button
              variant="ghost"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              className="text-muted-foreground"
            >
              Fermer
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
