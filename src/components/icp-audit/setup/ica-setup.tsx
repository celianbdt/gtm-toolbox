"use client";

import { useState } from "react";
import type { ICPSegment, ICPPersona, CustomerDataSource, WinLossEntry, AuditFocus } from "@/lib/icp-audit/types";
import { ICPDefinitionStep } from "./icp-definition-step";
import { DataImportStep } from "./data-import-step";
import { FocusStep } from "./focus-step";
import { ReviewStep } from "./review-step";
import { InsightPicker } from "@/components/shared/insight-picker";

type Step = "icp-definition" | "data-import" | "focus" | "review";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

export function ICASetup({ workspaceId, onSessionCreated }: Props) {
  const [step, setStep] = useState<Step>("icp-definition");
  const [icpDefinition, setIcpDefinition] = useState("");
  const [segments, setSegments] = useState<ICPSegment[]>([]);
  const [personas, setPersonas] = useState<ICPPersona[]>([]);
  const [customerData, setCustomerData] = useState<CustomerDataSource[]>([]);
  const [winLossData, setWinLossData] = useState<WinLossEntry[]>([]);
  const [focusDimensions, setFocusDimensions] = useState<AuditFocus[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [insightSessionIds, setInsightSessionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const steps: Step[] = ["icp-definition", "data-import", "focus", "review"];
  const stepIndex = steps.indexOf(step);

  const canAdvance =
    (step === "icp-definition" && icpDefinition.trim().length > 10 && segments.length >= 1) ||
    (step === "data-import") || // data import is optional
    (step === "focus" && focusDimensions.length >= 1) ||
    step === "review";

  async function launchAudit() {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/icp-audit/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          icpDefinition,
          segments,
          personas,
          customerData,
          winLossData,
          focusDimensions,
          customQuestion: customQuestion.trim() || undefined,
          insightSessionIds: insightSessionIds.length > 0 ? insightSessionIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start audit");
      setIsCreating(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    "icp-definition": "ICP",
    "data-import": "Data",
    focus: "Focus",
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
                    ? "bg-[#7C3AED] text-white"
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
                    i < stepIndex ? "bg-[#7C3AED]" : "bg-border"
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
          {step === "icp-definition" && (
            <ICPDefinitionStep
              icpDefinition={icpDefinition}
              onIcpDefinitionChange={setIcpDefinition}
              segments={segments}
              onSegmentsChange={setSegments}
              personas={personas}
              onPersonasChange={setPersonas}
            />
          )}
          {step === "data-import" && (
            <DataImportStep
              customerData={customerData}
              onCustomerDataChange={setCustomerData}
              winLossData={winLossData}
              onWinLossDataChange={setWinLossData}
            />
          )}
          {step === "focus" && (
            <>
              <FocusStep
                focusDimensions={focusDimensions}
                onChange={setFocusDimensions}
                customQuestion={customQuestion}
                onCustomQuestionChange={setCustomQuestion}
              />
              <InsightPicker
                workspaceId={workspaceId}
                currentToolId="icp-audit"
                selectedIds={insightSessionIds}
                onChange={setInsightSessionIds}
              />
            </>
          )}
          {step === "review" && (
            <ReviewStep
              icpDefinition={icpDefinition}
              segments={segments}
              personas={personas}
              customerData={customerData}
              winLossData={winLossData}
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
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              onClick={launchAudit}
              disabled={isCreating}
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isCreating ? "Launching..." : "Launch Audit"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
