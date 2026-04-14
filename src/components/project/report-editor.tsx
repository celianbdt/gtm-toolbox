"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Eye, Pencil } from "lucide-react";

type ReportEditorProps = {
  content: string;
  onChange: (content: string) => void;
  readOnly?: boolean;
};

export function ReportEditor({
  content,
  onChange,
  readOnly = false,
}: ReportEditorProps) {
  const [mode, setMode] = useState<"edit" | "preview">(
    readOnly ? "preview" : "preview"
  );

  return (
    <div className="flex flex-col gap-3">
      {/* Mode toggle */}
      {!readOnly && (
        <div className="flex items-center gap-1 self-end">
          <Button
            variant={mode === "preview" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("preview")}
          >
            <Eye className="size-3.5" />
            Preview
          </Button>
          <Button
            variant={mode === "edit" ? "secondary" : "ghost"}
            size="xs"
            onClick={() => setMode("edit")}
          >
            <Pencil className="size-3.5" />
            Edit
          </Button>
        </div>
      )}

      {/* Content */}
      {mode === "edit" && !readOnly ? (
        <Textarea
          value={content}
          onChange={(e) => onChange(e.target.value)}
          className="min-h-[400px] font-mono text-sm leading-relaxed resize-none bg-muted/30 border-border"
          placeholder="Markdown report content..."
        />
      ) : (
        <div className="report-preview rounded-lg border border-border bg-muted/20 p-6 min-h-[200px]">
          {content ? (
            <ReactMarkdown
              components={{
                h1: ({ children }) => (
                  <h1 className="text-xl font-bold text-foreground mb-4 mt-6 first:mt-0 border-b border-border/50 pb-2">
                    {children}
                  </h1>
                ),
                h2: ({ children }) => (
                  <h2 className="text-lg font-semibold text-foreground mb-3 mt-5 first:mt-0">
                    {children}
                  </h2>
                ),
                h3: ({ children }) => (
                  <h3 className="text-base font-medium text-foreground mb-2 mt-4 first:mt-0">
                    {children}
                  </h3>
                ),
                p: ({ children }) => (
                  <p className="text-sm text-foreground/90 mb-3 leading-relaxed">
                    {children}
                  </p>
                ),
                ul: ({ children }) => (
                  <ul className="list-disc list-inside text-sm text-foreground/90 mb-3 space-y-1 ml-2">
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol className="list-decimal list-inside text-sm text-foreground/90 mb-3 space-y-1 ml-2">
                    {children}
                  </ol>
                ),
                li: ({ children }) => (
                  <li className="leading-relaxed">{children}</li>
                ),
                strong: ({ children }) => (
                  <strong className="font-semibold text-foreground">
                    {children}
                  </strong>
                ),
                em: ({ children }) => (
                  <em className="italic text-foreground/80">{children}</em>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="border-l-2 border-amber-700/50 pl-4 my-3 text-sm text-muted-foreground italic">
                    {children}
                  </blockquote>
                ),
                code: ({ children }) => (
                  <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono text-amber-600">
                    {children}
                  </code>
                ),
                hr: () => <hr className="border-border/50 my-4" />,
              }}
            >
              {content}
            </ReactMarkdown>
          ) : (
            <p className="text-sm text-muted-foreground italic">
              Aucun contenu pour le moment.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
