"use client";

import { useState } from "react";
import type { CompetitorEntry, AnalysisFocus } from "@/lib/competitive-intel/types";
import { CompetitorSelector } from "./competitor-selector";
import { FocusSelector } from "./focus-selector";
import { AnalysisReview } from "./analysis-review";
import { InsightPicker } from "@/components/shared/insight-picker";

type Step = "competitors" | "focus" | "review";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

export function CISetup({ workspaceId, onSessionCreated }: Props) {
  const [step, setStep] = useState<Step>("competitors");
  const [competitors, setCompetitors] = useState<CompetitorEntry[]>([]);
  const [focusDimensions, setFocusDimensions] = useState<AnalysisFocus[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [insightSessionIds, setInsightSessionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const steps: Step[] = ["competitors", "focus", "review"];
  const stepIndex = steps.indexOf(step);

  const canAdvance =
    (step === "competitors" && competitors.length >= 1 && competitors.every((c) => c.name.trim())) ||
    (step === "focus" && focusDimensions.length >= 1) ||
    step === "review";

  async function launchAnalysis() {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/competitive-intel/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          competitors,
          focusDimensions,
          customQuestion: customQuestion.trim() || undefined,
          insightSessionIds: insightSessionIds.length > 0 ? insightSessionIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start analysis");
      setIsCreating(false);
    }
  }

  const stepLabels = { competitors: "Competitors", focus: "Focus", review: "Review" };

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
                    ? "bg-[#8a6e4e] text-white"
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
          {step === "competitors" && (
            <CompetitorSelector
              workspaceId={workspaceId}
              competitors={competitors}
              onChange={setCompetitors}
            />
          )}
          {step === "focus" && (
            <>
              <FocusSelector
                focusDimensions={focusDimensions}
                onChange={setFocusDimensions}
                customQuestion={customQuestion}
                onCustomQuestionChange={setCustomQuestion}
              />
              <InsightPicker
                workspaceId={workspaceId}
                currentToolId="competitive-intel"
                selectedIds={insightSessionIds}
                onChange={setInsightSessionIds}
              />
            </>
          )}
          {step === "review" && (
            <AnalysisReview
              competitors={competitors}
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
              className="px-5 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              onClick={launchAnalysis}
              disabled={isCreating}
              className="px-5 py-2 bg-[#8a6e4e] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isCreating ? "Launching..." : "Launch Analysis"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
