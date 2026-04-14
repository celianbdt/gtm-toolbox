"use client";

import { useState } from "react";
import type {
  GoalsInfo,
  BudgetInfo,
  CurrentChannelPerformance,
  ICPContext,
  ChannelFocus,
} from "@/lib/channel-planner/types";
import { GoalsStep } from "./goals-step";
import { BudgetStep } from "./budget-step";
import { CurrentChannelsStep } from "./current-channels-step";
import { ICPContextStep } from "./icp-context-step";
import { ReviewStep } from "./review-step";

type Step = "goals" | "budget" | "channels" | "icp" | "review";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

const DEFAULT_GOALS: GoalsInfo = {
  revenue_target: "",
  timeline_months: 6,
  growth_stage: "seed",
  primary_objective: "",
};

const DEFAULT_BUDGET: BudgetInfo = {
  total_monthly: 0,
  currency: "USD",
  current_allocation: [],
};

const DEFAULT_ICP: ICPContext = {
  summary: "",
  segments: [],
  buying_behavior: undefined,
};

export function CPSetup({ workspaceId, onSessionCreated }: Props) {
  const [step, setStep] = useState<Step>("goals");
  const [goals, setGoals] = useState<GoalsInfo>(DEFAULT_GOALS);
  const [budget, setBudget] = useState<BudgetInfo>(DEFAULT_BUDGET);
  const [currentChannels, setCurrentChannels] = useState<CurrentChannelPerformance[]>([]);
  const [icpContext, setICPContext] = useState<ICPContext>(DEFAULT_ICP);
  const [focusDimensions, setFocusDimensions] = useState<ChannelFocus[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [insightSessionIds, setInsightSessionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const steps: Step[] = ["goals", "budget", "channels", "icp", "review"];
  const stepIndex = steps.indexOf(step);

  const canAdvance =
    (step === "goals" &&
      goals.revenue_target.trim() !== "" &&
      goals.primary_objective.trim() !== "") ||
    (step === "budget" && budget.total_monthly > 0) ||
    step === "channels" ||
    (step === "icp" &&
      icpContext.summary.trim() !== "" &&
      focusDimensions.length >= 1) ||
    step === "review";

  async function launchPlanning() {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/channel-planner/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          goals,
          budget,
          currentChannels,
          icpContext,
          focusDimensions,
          customQuestion: customQuestion.trim() || undefined,
          insightSessionIds:
            insightSessionIds.length > 0 ? insightSessionIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start planning");
      setIsCreating(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    goals: "Goals",
    budget: "Budget",
    channels: "Channels",
    icp: "ICP & Focus",
    review: "Review",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= stepIndex
                    ? "bg-[#8a6e4e] text-foreground"
                    : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs transition-colors ${
                  i === stepIndex ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stepLabels[s]}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px transition-colors ${
                    i < stepIndex ? "bg-[#8a6e4e]" : "bg-border"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {step === "goals" && (
            <GoalsStep goals={goals} onChange={setGoals} />
          )}
          {step === "budget" && (
            <BudgetStep budget={budget} onChange={setBudget} />
          )}
          {step === "channels" && (
            <CurrentChannelsStep
              channels={currentChannels}
              onChange={setCurrentChannels}
            />
          )}
          {step === "icp" && (
            <ICPContextStep
              workspaceId={workspaceId}
              icpContext={icpContext}
              onICPChange={setICPContext}
              focusDimensions={focusDimensions}
              onFocusChange={setFocusDimensions}
              customQuestion={customQuestion}
              onCustomQuestionChange={setCustomQuestion}
              insightSessionIds={insightSessionIds}
              onInsightChange={setInsightSessionIds}
            />
          )}
          {step === "review" && (
            <ReviewStep
              goals={goals}
              budget={budget}
              currentChannels={currentChannels}
              icpContext={icpContext}
              focusDimensions={focusDimensions}
              customQuestion={customQuestion}
              insightCount={insightSessionIds.length}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(steps[stepIndex - 1])}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 transition-colors"
          >
            &larr; Back
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {step !== "review" ? (
            <button
              onClick={() => setStep(steps[stepIndex + 1])}
              disabled={!canAdvance}
              className="px-5 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-foreground text-sm font-medium rounded-lg transition-colors"
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              onClick={launchPlanning}
              disabled={isCreating}
              className="px-5 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-foreground text-sm font-medium rounded-lg transition-colors"
            >
              {isCreating ? "Launching..." : "Launch Planning"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
