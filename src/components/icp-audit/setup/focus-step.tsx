"use client";

import type { AuditFocus } from "@/lib/icp-audit/types";
import { AUDIT_FOCUS_LABELS } from "@/lib/icp-audit/types";
import {
  Target,
  Users,
  BarChart3,
  TrendingUp,
  ArrowUpRight,
  AlertTriangle,
} from "lucide-react";

const focusIcons: Record<AuditFocus, React.ComponentType<{ className?: string }>> = {
  "segment-fit": Target,
  "persona-accuracy": Users,
  "tam-sam": BarChart3,
  "win-loss-patterns": TrendingUp,
  "expansion-signals": ArrowUpRight,
  "churn-risk": AlertTriangle,
};

const ALL_FOCUSES: AuditFocus[] = [
  "segment-fit",
  "persona-accuracy",
  "tam-sam",
  "win-loss-patterns",
  "expansion-signals",
  "churn-risk",
];

type Props = {
  focusDimensions: AuditFocus[];
  onChange: (dimensions: AuditFocus[]) => void;
  customQuestion: string;
  onCustomQuestionChange: (q: string) => void;
};

export function FocusStep({
  focusDimensions,
  onChange,
  customQuestion,
  onCustomQuestionChange,
}: Props) {
  function toggle(focus: AuditFocus) {
    if (focusDimensions.includes(focus)) {
      onChange(focusDimensions.filter((f) => f !== focus));
    } else {
      onChange([...focusDimensions, focus]);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Audit Focus
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select the dimensions the analysts should focus on.
      </p>

      <div className="grid grid-cols-2 gap-3 mb-6">
        {ALL_FOCUSES.map((focus) => {
          const Icon = focusIcons[focus];
          const selected = focusDimensions.includes(focus);
          return (
            <button
              key={focus}
              onClick={() => toggle(focus)}
              className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                selected
                  ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-foreground"
                  : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Icon className={`size-4 shrink-0 ${selected ? "text-[#A78BFA]" : ""}`} />
              <span className="text-sm">{AUDIT_FOCUS_LABELS[focus]}</span>
            </button>
          );
        })}
      </div>

      <div>
        <label className="text-sm text-muted-foreground block mb-2">
          Custom question (optional)
        </label>
        <textarea
          placeholder="e.g. Should we expand into the enterprise segment given our current product capabilities?"
          value={customQuestion}
          onChange={(e) => onCustomQuestionChange(e.target.value)}
          rows={2}
          className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 resize-none"
        />
      </div>
    </div>
  );
}
