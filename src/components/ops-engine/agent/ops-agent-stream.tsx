"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { OpsAgentPrompt } from "./ops-agent-prompt";
import { TableProposalCard } from "./table-proposal-card";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Check,
  Loader2,
  Table2,
  Columns3,
  BarChart3,
  Rows3,
  Zap,
  Search,
  MessageSquare,
  AlertCircle,
} from "lucide-react";

// ── Types for parsed stream events ──

type ToolCallEvent = {
  id: string;
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  status: "calling" | "done" | "error";
};

type StreamState = {
  text: string;
  toolCalls: ToolCallEvent[];
  isStreaming: boolean;
  error: string | null;
  tableId: string | null;
  tableName: string | null;
};

const TOOL_META: Record<
  string,
  { icon: React.ElementType; label: string; color: string }
> = {
  create_table: { icon: Table2, label: "Create table", color: "text-blue-500" },
  add_column: { icon: Columns3, label: "Add column", color: "text-emerald-500" },
  configure_scoring: {
    icon: BarChart3,
    label: "Configure scoring",
    color: "text-amber-500",
  },
  add_rows: { icon: Rows3, label: "Add rows", color: "text-purple-500" },
  trigger_enrichment: { icon: Zap, label: "Trigger enrichment", color: "text-red-500" },
  search_web: { icon: Search, label: "Search web", color: "text-cyan-500" },
};

type Props = {
  workspaceId: string;
};

export function OpsAgentStream({ workspaceId }: Props) {
  const [state, setState] = useState<StreamState>({
    text: "",
    toolCalls: [],
    isStreaming: false,
    error: null,
    tableId: null,
    tableName: null,
  });
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [state.text, state.toolCalls]);

  const handleSubmit = useCallback(
    async (prompt: string) => {
      setState({
        text: "",
        toolCalls: [],
        isStreaming: true,
        error: null,
        tableId: null,
        tableName: null,
      });

      try {
        const response = await fetch("/api/ops-engine/agent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspace_id: workspaceId, prompt }),
        });

        if (!response.ok) {
          const err = await response.json().catch(() => ({ error: "Request failed" }));
          setState((s) => ({
            ...s,
            isStreaming: false,
            error: err.error || `HTTP ${response.status}`,
          }));
          return;
        }

        const reader = response.body?.getReader();
        if (!reader) {
          setState((s) => ({
            ...s,
            isStreaming: false,
            error: "No response stream",
          }));
          return;
        }

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const jsonStr = line.slice(6);
            if (!jsonStr) continue;

            let event: { type: string; [key: string]: unknown };
            try {
              event = JSON.parse(jsonStr);
            } catch {
              continue;
            }

            switch (event.type) {
              case "text_delta": {
                const delta = event.delta as string;
                setState((s) => ({ ...s, text: s.text + delta }));
                break;
              }
              case "tool_call_start": {
                setState((s) => ({
                  ...s,
                  toolCalls: [
                    ...s.toolCalls,
                    {
                      id: event.toolCallId as string,
                      toolName: event.toolName as string,
                      args: (event.args as Record<string, unknown>) ?? {},
                      status: "calling",
                    },
                  ],
                }));
                break;
              }
              case "tool_call_result": {
                const toolCallId = event.toolCallId as string;
                const result = event.result;
                setState((s) => {
                  const updated = s.toolCalls.map((tc) =>
                    tc.id === toolCallId
                      ? { ...tc, result, status: "done" as const }
                      : tc
                  );

                  // Extract table info from create_table result
                  let { tableId, tableName } = s;
                  const completedTc = updated.find((tc) => tc.id === toolCallId);
                  if (completedTc?.toolName === "create_table" && result) {
                    const res = result as { table_id?: string; name?: string };
                    tableId = res.table_id ?? tableId;
                    tableName = res.name ?? tableName;
                  }

                  return { ...s, toolCalls: updated, tableId, tableName };
                });
                break;
              }
              case "error": {
                setState((s) => ({
                  ...s,
                  error: event.message as string,
                }));
                break;
              }
              case "done": {
                break;
              }
            }
          }
        }
      } catch (err) {
        const message =
          err instanceof Error ? err.message : "Connection failed";
        setState((s) => ({ ...s, error: message }));
      } finally {
        setState((s) => ({ ...s, isStreaming: false }));
      }
    },
    [workspaceId]
  );

  const columnsByType = state.toolCalls
    .filter((tc) => tc.toolName === "add_column" && tc.status === "done")
    .reduce(
      (acc, tc) => {
        const type = (tc.args.column_type as string) ?? "static";
        acc[type] = (acc[type] ?? 0) + 1;
        return acc;
      },
      {} as Record<string, number>
    );

  const scoringRules =
    state.toolCalls.find(
      (tc) => tc.toolName === "configure_scoring" && tc.status === "done"
    )?.result;

  const rowsInserted = state.toolCalls
    .filter((tc) => tc.toolName === "add_rows" && tc.status === "done")
    .reduce((total, tc) => {
      const res = tc.result as { inserted?: number } | undefined;
      return total + (res?.inserted ?? 0);
    }, 0);

  const isDone = !state.isStreaming && state.toolCalls.length > 0;

  return (
    <div className="space-y-6">
      <OpsAgentPrompt onSubmit={handleSubmit} isLoading={state.isStreaming} />

      {/* Stream display */}
      {(state.text || state.toolCalls.length > 0 || state.error) && (
        <Card>
          <CardHeader className="border-b">
            <CardTitle className="flex items-center gap-2 text-sm">
              <MessageSquare className="size-4" />
              Agent Execution
              {state.isStreaming && (
                <Badge variant="secondary" className="ml-auto">
                  <Loader2 className="size-3 animate-spin mr-1" />
                  Running...
                </Badge>
              )}
              {isDone && !state.error && (
                <Badge
                  variant="secondary"
                  className="ml-auto bg-emerald-500/10 text-emerald-600"
                >
                  <Check className="size-3 mr-1" />
                  Complete
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="max-h-[500px]" ref={scrollRef}>
              <div className="p-4 space-y-3">
                {/* Tool calls */}
                {state.toolCalls.map((tc) => {
                  const meta = TOOL_META[tc.toolName] ?? {
                    icon: Zap,
                    label: tc.toolName,
                    color: "text-muted-foreground",
                  };
                  const Icon = meta.icon;

                  return (
                    <div
                      key={tc.id}
                      className="flex items-start gap-3 rounded-lg bg-muted/50 p-3"
                    >
                      <div className={`mt-0.5 ${meta.color}`}>
                        {tc.status === "calling" ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : tc.status === "error" ? (
                          <AlertCircle className="size-4 text-destructive" />
                        ) : (
                          <Icon className="size-4" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">
                            {formatToolLabel(tc)}
                          </span>
                          {tc.status === "done" && (
                            <Check className="size-3 text-emerald-500" />
                          )}
                        </div>
                        {tc.status === "done" && tc.result != null ? (
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {formatToolResult(tc)}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}

                {/* Agent text */}
                {state.text && (
                  <div className="prose prose-sm dark:prose-invert max-w-none text-sm text-muted-foreground whitespace-pre-wrap">
                    {state.text}
                  </div>
                )}

                {/* Error */}
                {state.error && (
                  <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
                    <AlertCircle className="size-4 shrink-0" />
                    {state.error}
                  </div>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Summary card when done */}
      {isDone && !state.error && state.tableId && (
        <TableProposalCard
          tableId={state.tableId}
          tableName={state.tableName ?? "Untitled Table"}
          columnsByType={columnsByType}
          scoringRulesCount={
            (scoringRules as { rules_count?: number })?.rules_count ?? 0
          }
          rowsInserted={rowsInserted}
        />
      )}
    </div>
  );
}

// ── Formatting helpers ──

function formatToolLabel(tc: ToolCallEvent): string {
  switch (tc.toolName) {
    case "create_table":
      return `Create table: "${tc.args.name ?? "..."}"`;
    case "add_column":
      return `Add column: "${tc.args.name ?? "..."}" (${tc.args.column_type ?? "static"})`;
    case "configure_scoring":
      return `Configure scoring${tc.args.rules ? ` (${(tc.args.rules as unknown[]).length} rules)` : ""}`;
    case "add_rows":
      return `Add rows${tc.args.rows ? ` (${(tc.args.rows as unknown[]).length} rows)` : ""}`;
    case "trigger_enrichment":
      return "Trigger enrichment";
    case "search_web":
      return `Search: "${tc.args.query ?? "..."}"`;
    default:
      return tc.toolName;
  }
}

function formatToolResult(tc: ToolCallEvent): string {
  if (!tc.result || typeof tc.result !== "object") return "";
  const r = tc.result as Record<string, unknown>;

  switch (tc.toolName) {
    case "create_table":
      return `Table created (${r.table_id})`;
    case "add_column":
      return `Column "${r.name}" added`;
    case "configure_scoring":
      return `${r.rules_count} rules configured`;
    case "add_rows":
      return `${r.inserted} rows inserted`;
    case "trigger_enrichment":
      return `${r.rows_queued} rows queued for enrichment`;
    case "search_web":
      return `${(r.results as unknown[])?.length ?? 0} results found`;
    default:
      return JSON.stringify(r);
  }
}
