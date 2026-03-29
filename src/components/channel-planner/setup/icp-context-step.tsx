"use client";

import { useState } from "react";
import { X } from "lucide-react";
import type { ICPContext, ChannelFocus } from "@/lib/channel-planner/types";
import { CHANNEL_FOCUS_LABELS } from "@/lib/channel-planner/types";
import { InsightPicker } from "@/components/shared/insight-picker";
import {
  Megaphone,
  FileText,
  Mail,
  Handshake,
  Calendar,
  Rocket,
} from "lucide-react";

const focusIcons: Record<ChannelFocus, React.ComponentType<{ className?: string }>> = {
  "paid-acquisition": Megaphone,
  "organic-content": FileText,
  "outbound-sales": Mail,
  partnerships: Handshake,
  "events-community": Calendar,
  "product-led": Rocket,
};

const ALL_FOCUSES: ChannelFocus[] = [
  "paid-acquisition",
  "organic-content",
  "outbound-sales",
  "partnerships",
  "events-community",
  "product-led",
];

const BUYING_BEHAVIORS = [
  "Self-serve / PLG",
  "Sales-assisted",
  "Enterprise (long cycle)",
  "Community-driven",
  "Partner-influenced",
];

type Props = {
  workspaceId: string;
  icpContext: ICPContext;
  onICPChange: (icp: ICPContext) => void;
  focusDimensions: ChannelFocus[];
  onFocusChange: (dims: ChannelFocus[]) => void;
  customQuestion: string;
  onCustomQuestionChange: (q: string) => void;
  insightSessionIds: string[];
  onInsightChange: (ids: string[]) => void;
};

export function ICPContextStep({
  workspaceId,
  icpContext,
  onICPChange,
  focusDimensions,
  onFocusChange,
  customQuestion,
  onCustomQuestionChange,
  insightSessionIds,
  onInsightChange,
}: Props) {
  const [segmentInput, setSegmentInput] = useState("");

  function addSegment() {
    const trimmed = segmentInput.trim();
    if (!trimmed || icpContext.segments.includes(trimmed)) return;
    onICPChange({ ...icpContext, segments: [...icpContext.segments, trimmed] });
    setSegmentInput("");
  }

  function removeSegment(seg: string) {
    onICPChange({
      ...icpContext,
      segments: icpContext.segments.filter((s) => s !== seg),
    });
  }

  function toggleFocus(focus: ChannelFocus) {
    if (focusDimensions.includes(focus)) {
      onFocusChange(focusDimensions.filter((f) => f !== focus));
    } else {
      onFocusChange([...focusDimensions, focus]);
    }
  }

  return (
    <div className="space-y-6">
      {/* ICP Summary */}
      <div>
        <h2 className="text-lg font-semibold text-foreground mb-1">
          ICP & Focus
        </h2>
        <p className="text-sm text-muted-foreground mb-4">
          Describe your ICP, select channel focus dimensions, and optionally include insights from other tools.
        </p>

        <label className="text-sm text-muted-foreground block mb-2">
          ICP summary
        </label>
        <textarea
          placeholder="e.g. B2B SaaS companies, 50-500 employees, VP Sales / CRO buyers, $50K-200K ACV..."
          value={icpContext.summary}
          onChange={(e) =>
            onICPChange({ ...icpContext, summary: e.target.value })
          }
          rows={3}
          className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 resize-none"
        />
      </div>

      {/* Segments */}
      <div>
        <label className="text-sm text-muted-foreground block mb-2">
          Segments
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            placeholder="Add a segment..."
            value={segmentInput}
            onChange={(e) => setSegmentInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && addSegment()}
            className="flex-1 bg-secondary/30 rounded-lg px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30"
          />
          <button
            onClick={addSegment}
            disabled={!segmentInput.trim()}
            className="px-3 py-2 text-sm bg-secondary hover:bg-accent text-foreground rounded-lg disabled:opacity-40 transition-colors"
          >
            Add
          </button>
        </div>
        {icpContext.segments.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {icpContext.segments.map((seg) => (
              <span
                key={seg}
                className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-[#7C3AED]/10 text-[#A78BFA] rounded-full"
              >
                {seg}
                <button
                  onClick={() => removeSegment(seg)}
                  className="hover:text-foreground"
                >
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Buying Behavior */}
      <div>
        <label className="text-sm text-muted-foreground block mb-2">
          Buying behavior
        </label>
        <div className="flex flex-wrap gap-2">
          {BUYING_BEHAVIORS.map((behavior) => (
            <button
              key={behavior}
              onClick={() =>
                onICPChange({
                  ...icpContext,
                  buying_behavior:
                    icpContext.buying_behavior === behavior
                      ? undefined
                      : behavior,
                })
              }
              className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                icpContext.buying_behavior === behavior
                  ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-foreground"
                  : "border-border text-muted-foreground hover:text-foreground hover:border-border/80"
              }`}
            >
              {behavior}
            </button>
          ))}
        </div>
      </div>

      {/* Channel Focus Dimensions */}
      <div>
        <label className="text-sm text-muted-foreground block mb-2">
          Focus dimensions (select at least 1)
        </label>
        <div className="grid grid-cols-2 gap-3">
          {ALL_FOCUSES.map((focus) => {
            const Icon = focusIcons[focus];
            const selected = focusDimensions.includes(focus);
            return (
              <button
                key={focus}
                onClick={() => toggleFocus(focus)}
                className={`flex items-center gap-3 p-3.5 rounded-lg border text-left transition-all ${
                  selected
                    ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-foreground"
                    : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon
                  className={`size-4 shrink-0 ${
                    selected ? "text-[#A78BFA]" : ""
                  }`}
                />
                <span className="text-sm">{CHANNEL_FOCUS_LABELS[focus]}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom Question */}
      <div>
        <label className="text-sm text-muted-foreground block mb-2">
          Custom question (optional)
        </label>
        <textarea
          placeholder="e.g. Should we invest in ABM given our ACV? Is PLG viable at our stage?"
          value={customQuestion}
          onChange={(e) => onCustomQuestionChange(e.target.value)}
          rows={2}
          className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 resize-none"
        />
      </div>

      {/* Insight Picker */}
      <InsightPicker
        workspaceId={workspaceId}
        currentToolId="channel-planner"
        selectedIds={insightSessionIds}
        onChange={onInsightChange}
      />
    </div>
  );
}
