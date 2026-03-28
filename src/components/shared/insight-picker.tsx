"use client";

import { useState, useEffect } from "react";
import type { InsightSession } from "@/lib/insights/types";
import { TOOL_DISPLAY_NAMES } from "@/lib/insights/formatters";

type Props = {
  workspaceId: string;
  currentToolId: string;
  selectedIds: string[];
  onChange: (ids: string[]) => void;
};

export function InsightPicker({ workspaceId, currentToolId, selectedIds, onChange }: Props) {
  const [sessions, setSessions] = useState<InsightSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedTools, setExpandedTools] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(
          `/api/insights/available?workspaceId=${workspaceId}&excludeToolId=${currentToolId}`
        );
        if (res.ok) {
          const { sessions: s } = await res.json();
          setSessions(s);
          // Auto-expand tools that have sessions
          const tools = new Set<string>(s.map((sess: InsightSession) => sess.tool_id));
          setExpandedTools(tools);
        }
      } catch (e) {
        console.error("Failed to load insight sessions:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [workspaceId, currentToolId]);

  if (loading) return null;
  if (sessions.length === 0) return null;

  // Group by tool_id
  const grouped = new Map<string, InsightSession[]>();
  for (const s of sessions) {
    const list = grouped.get(s.tool_id) ?? [];
    list.push(s);
    grouped.set(s.tool_id, list);
  }

  function toggle(sessionId: string) {
    if (selectedIds.includes(sessionId)) {
      onChange(selectedIds.filter((id) => id !== sessionId));
    } else {
      onChange([...selectedIds, sessionId]);
    }
  }

  function toggleTool(toolId: string) {
    setExpandedTools((prev) => {
      const next = new Set(prev);
      if (next.has(toolId)) next.delete(toolId);
      else next.add(toolId);
      return next;
    });
  }

  return (
    <div className="mt-6 rounded-lg border border-border bg-secondary/30 p-4">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-[#7C3AED]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
        <span className="text-sm font-medium text-foreground">Include insights from other tools</span>
      </div>
      <p className="text-xs text-muted-foreground mb-4">
        Enrich this session with analysis from previous sessions.
      </p>

      {[...grouped.entries()].map(([toolId, toolSessions]) => (
        <div key={toolId} className="mb-2">
          <button
            onClick={() => toggleTool(toolId)}
            className="flex items-center gap-2 w-full text-left py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg
              className={`w-3 h-3 transition-transform ${expandedTools.has(toolId) ? "rotate-90" : ""}`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
            {TOOL_DISPLAY_NAMES[toolId] ?? toolId}
            <span className="text-muted-foreground/60">({toolSessions.length})</span>
          </button>

          {expandedTools.has(toolId) && (
            <div className="ml-5 space-y-1.5 mt-1">
              {toolSessions.map((s) => {
                const checked = selectedIds.includes(s.id);
                const date = new Date(s.created_at).toLocaleDateString("fr-FR", {
                  day: "numeric",
                  month: "short",
                });
                return (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 py-1.5 px-2 rounded-md cursor-pointer transition-colors ${
                      checked ? "bg-[#7C3AED]/10" : "hover:bg-secondary"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggle(s.id)}
                      className="rounded border-border text-[#7C3AED] focus:ring-[#7C3AED] w-3.5 h-3.5"
                    />
                    <span className="text-xs text-foreground flex-1 truncate">{s.title}</span>
                    <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                      {date} · {s.output_count} outputs
                    </span>
                  </label>
                );
              })}
            </div>
          )}
        </div>
      ))}

      {selectedIds.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border">
          <span className="text-xs text-[#7C3AED]">
            {selectedIds.length} session{selectedIds.length > 1 ? "s" : ""} selected
          </span>
        </div>
      )}
    </div>
  );
}
