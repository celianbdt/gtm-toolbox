"use client";

import type { AnalyzerFocus } from "@/lib/outbound-builder/types";
import { ANALYZER_FOCUS_LABELS } from "@/lib/outbound-builder/types";
import { InsightPicker } from "@/components/shared/insight-picker";

type Props = {
  workspaceId: string;
  focusDimensions: AnalyzerFocus[];
  onChange: (dims: AnalyzerFocus[]) => void;
  customQuestion: string;
  onCustomQuestionChange: (q: string) => void;
  insightSessionIds: string[];
  onInsightSessionIdsChange: (ids: string[]) => void;
};

const FOCUS_OPTIONS: { id: AnalyzerFocus; icon: string }[] = [
  { id: "segment-performance", icon: "👥" },
  { id: "channel-effectiveness", icon: "📡" },
  { id: "timing-cadence", icon: "⏱️" },
  { id: "messaging-patterns", icon: "💬" },
  { id: "conversion-funnel", icon: "🎯" },
];

export function AnalyzerFocusStep({
  workspaceId,
  focusDimensions,
  onChange,
  customQuestion,
  onCustomQuestionChange,
  insightSessionIds,
  onInsightSessionIdsChange,
}: Props) {
  function toggle(id: AnalyzerFocus) {
    if (focusDimensions.includes(id)) {
      onChange(focusDimensions.filter((f) => f !== id));
    } else {
      onChange([...focusDimensions, id]);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Analysis Focus</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select which dimensions to analyze in your campaign data.
      </p>

      <div className="space-y-2">
        {FOCUS_OPTIONS.map((opt) => {
          const selected = focusDimensions.includes(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => toggle(opt.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                selected
                  ? "border-[#8a6e4e] bg-[#8a6e4e]/10"
                  : "border-border hover:border-border/80 bg-secondary/30"
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <span className={`text-sm ${selected ? "text-foreground" : "text-muted-foreground"}`}>
                {ANALYZER_FOCUS_LABELS[opt.id]}
              </span>
              {selected && (
                <span className="ml-auto text-xs text-[#c4a882]">✓</span>
              )}
            </button>
          );
        })}
      </div>

      <div className="mt-6">
        <label className="text-xs text-muted-foreground block mb-2">
          Custom question (optional)
        </label>
        <textarea
          value={customQuestion}
          onChange={(e) => onCustomQuestionChange(e.target.value)}
          placeholder="e.g., Why did our LinkedIn campaigns outperform email in Q4?"
          rows={2}
          className="w-full px-3 py-2 bg-secondary rounded-lg text-sm text-foreground placeholder:text-muted-foreground resize-none"
        />
      </div>

      <InsightPicker
        workspaceId={workspaceId}
        currentToolId="outbound-builder"
        selectedIds={insightSessionIds}
        onChange={onInsightSessionIdsChange}
      />
    </div>
  );
}
