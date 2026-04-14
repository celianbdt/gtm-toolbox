"use client";

import type {
  GoalsInfo,
  BudgetInfo,
  CurrentChannelPerformance,
  ICPContext,
  ChannelFocus,
} from "@/lib/channel-planner/types";
import { CHANNEL_FOCUS_LABELS, GROWTH_STAGE_LABELS } from "@/lib/channel-planner/types";

const ANALYSTS = [
  { emoji: "\u{1F680}", name: "Growth Hacker", color: "#ef4444" },
  { emoji: "\u{1F4DD}", name: "Content Strategist", color: "#22c55e" },
  { emoji: "\u{1F4C8}", name: "Demand Gen Specialist", color: "#3b82f6" },
  { emoji: "\u{1F4B0}", name: "Revenue Analyst", color: "#8a6e4e" },
];

type Props = {
  goals: GoalsInfo;
  budget: BudgetInfo;
  currentChannels: CurrentChannelPerformance[];
  icpContext: ICPContext;
  focusDimensions: ChannelFocus[];
  customQuestion: string;
  insightCount?: number;
};

export function ReviewStep({
  goals,
  budget,
  currentChannels,
  icpContext,
  focusDimensions,
  customQuestion,
  insightCount = 0,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Review & Launch
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Verify the planning configuration before launching.
      </p>

      <div className="space-y-5">
        {/* Goals */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Goals
          </h3>
          <div className="space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Revenue target</span>
              <span className="text-foreground font-medium">
                {goals.revenue_target}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Timeline</span>
              <span className="text-foreground">{goals.timeline_months} months</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Stage</span>
              <span className="text-foreground">
                {GROWTH_STAGE_LABELS[goals.growth_stage]}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Objective</span>
              <span className="text-foreground truncate ml-4">
                {goals.primary_objective}
              </span>
            </div>
          </div>
        </div>

        {/* Budget */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Budget
          </h3>
          <div className="text-sm">
            <span className="text-foreground font-medium">
              ${budget.total_monthly.toLocaleString()} {budget.currency}/month
            </span>
            {budget.current_allocation.length > 0 && (
              <div className="mt-2 space-y-1">
                {budget.current_allocation.map((a, i) => (
                  <div key={i} className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{a.channel}</span>
                    <span className="text-foreground">${a.spend.toLocaleString()}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Channels */}
        {currentChannels.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Current Channels ({currentChannels.length})
            </h3>
            <div className="space-y-1.5">
              {currentChannels.map((ch, i) => (
                <div key={i} className="flex items-center justify-between text-sm">
                  <span className="text-foreground font-medium">{ch.channel}</span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">{ch.status}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        ch.assessment === "working"
                          ? "text-green-400 bg-green-400/10"
                          : ch.assessment === "underperforming"
                          ? "text-red-400 bg-red-400/10"
                          : "text-muted-foreground bg-secondary"
                      }`}
                    >
                      {ch.assessment}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Focus */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Focus Dimensions
          </h3>
          <div className="flex flex-wrap gap-2">
            {focusDimensions.map((f) => (
              <span
                key={f}
                className="text-xs px-2.5 py-1 bg-[#8a6e4e]/10 text-[#c4a882] rounded-full"
              >
                {CHANNEL_FOCUS_LABELS[f]}
              </span>
            ))}
          </div>
          {customQuestion && (
            <p className="mt-3 text-sm text-muted-foreground italic">
              &ldquo;{customQuestion}&rdquo;
            </p>
          )}
        </div>

        {/* Analysts */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Analyst Team
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ANALYSTS.map((a) => (
              <div key={a.name} className="flex items-center gap-2 text-sm">
                <span>{a.emoji}</span>
                <span className="text-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Cross-tool insights */}
        {insightCount > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Cross-tool Insights
            </h3>
            <p className="text-sm text-foreground">
              {insightCount} session{insightCount > 1 ? "s" : ""} included as context
            </p>
          </div>
        )}

        {/* Process */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Planning Process
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
                1
              </span>
              Context Loading — structure channel inputs
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
                2
              </span>
              Channel Assessment — 4 expert perspectives
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
                3
              </span>
              Strategy Debate — challenge and refine
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">
                4
              </span>
              Synthesis — generate scorecard, budget, playbooks, ROI
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
