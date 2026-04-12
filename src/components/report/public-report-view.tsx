"use client";

import ReactMarkdown from "react-markdown";
import type { WeeklyReport } from "@/lib/types/project";

type Props = {
  report: WeeklyReport;
  workspaceName: string;
  workspaceColor: string;
};

export function PublicReportView({
  report,
  workspaceName,
  workspaceColor,
}: Props) {
  const weekEnd = new Date(report.week_start);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-12">
      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center gap-3 mb-4">
          <div
            className="h-3 w-3 rounded-full"
            style={{ backgroundColor: workspaceColor }}
          />
          <span className="text-sm font-medium text-muted-foreground">
            {workspaceName}
          </span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight">
          Rapport hebdomadaire
        </h1>
        <p className="text-muted-foreground mt-1">
          {formatDate(report.week_start)} &mdash;{" "}
          {formatDate(weekEnd.toISOString().split("T")[0])}
        </p>
        <div
          className="mt-4 h-0.5 w-16"
          style={{ backgroundColor: workspaceColor }}
        />
      </header>

      {/* Body */}
      <article className="prose prose-invert prose-sm max-w-none">
        <ReactMarkdown>{report.raw_markdown}</ReactMarkdown>
      </article>

      {/* Footer */}
      <footer className="mt-16 pt-6 border-t border-border">
        <p className="text-xs text-muted-foreground">
          Genere avec GTM Toolbox &middot;{" "}
          {formatDate(report.created_at)}
        </p>
      </footer>
    </div>
  );
}
