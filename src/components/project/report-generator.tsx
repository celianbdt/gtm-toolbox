"use client";

import { useState, useCallback, useRef } from "react";
import { useWorkspace } from "@/components/workspace/workspace-provider";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ReportEditor } from "./report-editor";
import {
  Sparkles,
  Save,
  Pencil,
  Copy,
  Check,
  Loader2,
} from "lucide-react";
import type { WeeklyReport } from "@/lib/types/project";

function getMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = (day + 6) % 7;
  const monday = new Date(today);
  monday.setDate(today.getDate() - diff);
  return monday.toISOString().slice(0, 10);
}

type ReportGeneratorProps = {
  onReportSaved?: (report: WeeklyReport) => void;
};

export function ReportGenerator({ onReportSaved }: ReportGeneratorProps) {
  const workspace = useWorkspace();
  const [streamingText, setStreamingText] = useState("");
  const [reportContent, setReportContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedReport, setSavedReport] = useState<WeeklyReport | null>(null);
  const [copied, setCopied] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const displayContent = isLoading ? streamingText : reportContent;

  const handleGenerate = useCallback(async () => {
    setHasGenerated(false);
    setSavedReport(null);
    setReportContent("");
    setStreamingText("");
    setIsLoading(true);

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch("/api/project/reports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          week_start: getMonday(),
        }),
        signal: controller.signal,
      });

      if (!res.ok || !res.body) {
        setIsLoading(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        accumulated += chunk;
        setStreamingText(accumulated);
      }

      setReportContent(accumulated);
      setHasGenerated(true);
    } catch (err) {
      if ((err as Error).name !== "AbortError") {
        console.error("Report generation failed:", err);
      }
    } finally {
      setIsLoading(false);
    }
  }, [workspace.id]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/project/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspace_id: workspace.id,
          week_start: getMonday(),
          raw_markdown: reportContent,
        }),
      });
      if (res.ok) {
        const data = await res.json();
        setSavedReport(data);
        onReportSaved?.(data);
      }
    } finally {
      setSaving(false);
    }
  }, [reportContent, workspace.id, onReportSaved]);

  const handleCopyLink = useCallback(async () => {
    if (!savedReport?.share_token) return;
    const url = `${window.location.origin}/report/${savedReport.share_token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [savedReport]);

  return (
    <div className="flex flex-col gap-4">
      {/* Generate button */}
      <div className="flex justify-center">
        <Button
          onClick={handleGenerate}
          disabled={isLoading}
          size="lg"
          className="gap-2"
        >
          {isLoading ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              Generation en cours...
            </>
          ) : (
            <>
              <Sparkles className="size-4" />
              Generer le rapport de la semaine
            </>
          )}
        </Button>
      </div>

      {/* Editor area — visible when streaming or after generation */}
      {(isLoading || displayContent) && (
        <Card>
          <CardContent className="relative">
            {/* Streaming cursor effect */}
            {isLoading && (
              <div className="absolute top-3 right-4">
                <span className="inline-block size-2 rounded-full bg-primary animate-pulse" />
              </div>
            )}

            <ReportEditor
              content={displayContent}
              onChange={setReportContent}
              readOnly={isLoading}
            />

            {/* Actions after generation */}
            {hasGenerated && !isLoading && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="gap-1.5"
                >
                  {saving ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Save className="size-4" />
                  )}
                  {saving ? "Sauvegarde..." : "Sauvegarder"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    /* editor toggle handled by ReportEditor */
                  }}
                  className="gap-1.5"
                >
                  <Pencil className="size-3.5" />
                  Modifier
                </Button>
              </div>
            )}

            {/* Share link after save */}
            {savedReport && (
              <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                <div className="flex-1">
                  <Input
                    readOnly
                    value={`${typeof window !== "undefined" ? window.location.origin : ""}/report/${savedReport.share_token}`}
                    className="text-xs font-mono bg-muted/30"
                  />
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopyLink}
                  className="gap-1.5 shrink-0"
                >
                  {copied ? (
                    <>
                      <Check className="size-3.5 text-green-500" />
                      Copie !
                    </>
                  ) : (
                    <>
                      <Copy className="size-3.5" />
                      Copier le lien
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
