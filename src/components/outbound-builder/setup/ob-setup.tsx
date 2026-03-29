"use client";

import { useState } from "react";
import type {
  CampaignDataSource,
  AnalyzerFocus,
  ICPDefinition,
  ChannelConfig,
  SequenceParams,
} from "@/lib/outbound-builder/types";
import { CampaignDataStep } from "./campaign-data-step";
import { AnalyzerFocusStep } from "./analyzer-focus-step";
import { BuilderICPStep } from "./builder-icp-step";
import { BuilderChannelsStep } from "./builder-channels-step";

type Mode = "analyzer" | "builder";

type Props = {
  workspaceId: string;
  mode: Mode;
  onSessionCreated: (sessionId: string, mode: Mode) => void;
};

export function OBSetup({ workspaceId, mode, onSessionCreated }: Props) {
  // Analyzer state
  const [dataSources, setDataSources] = useState<CampaignDataSource[]>([]);
  const [focusDimensions, setFocusDimensions] = useState<AnalyzerFocus[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");

  // Builder state
  const [icp, setIcp] = useState<ICPDefinition>({
    title: "",
    persona_role: "",
    pain_points: [],
    value_props: [],
  });
  const [channels, setChannels] = useState<ChannelConfig>({ email: true, linkedin: false, call: false });
  const [sequenceParams, setSequenceParams] = useState<SequenceParams>({
    sequence_length: 5,
    total_duration_days: 21,
    ab_variants: false,
    tone: "conversational",
    language: "fr",
  });

  // Shared
  const [insightSessionIds, setInsightSessionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  // Step management
  const analyzerSteps = ["data", "focus"] as const;
  const builderSteps = ["icp", "channels"] as const;
  const steps = mode === "analyzer" ? analyzerSteps : builderSteps;
  const [stepIndex, setStepIndex] = useState(0);
  const currentStep = steps[stepIndex];

  const totalRows = dataSources.reduce((sum, ds) => sum + ds.rows.length, 0);
  const enabledChannels = Object.values(channels).some(Boolean);

  const canAdvance =
    mode === "analyzer"
      ? (currentStep === "data" && totalRows >= 1) ||
        (currentStep === "focus" && focusDimensions.length >= 1)
      : (currentStep === "icp" && icp.persona_role.trim().length > 2 && icp.pain_points.length >= 1) ||
        (currentStep === "channels" && enabledChannels);

  const isLastStep = stepIndex === steps.length - 1;

  async function launch() {
    setIsCreating(true);
    setError("");
    try {
      const body =
        mode === "analyzer"
          ? {
              workspaceId,
              mode: "analyzer",
              campaignData: dataSources,
              focusDimensions,
              customQuestion: customQuestion.trim() || undefined,
              insightSessionIds: insightSessionIds.length > 0 ? insightSessionIds : undefined,
            }
          : {
              workspaceId,
              mode: "builder",
              icp,
              channels,
              sequenceParams,
              insightSessionIds: insightSessionIds.length > 0 ? insightSessionIds : undefined,
            };

      const res = await fetch("/api/outbound-builder/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id, mode);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start");
      setIsCreating(false);
    }
  }

  const stepLabels =
    mode === "analyzer"
      ? { data: "Data", focus: "Focus" }
      : { icp: "ICP", channels: "Channels" };

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= stepIndex ? "bg-[#7C3AED] text-white" : "bg-secondary text-muted-foreground"
                }`}
              >
                {i + 1}
              </div>
              <span className={`text-xs transition-colors ${i === stepIndex ? "text-foreground" : "text-muted-foreground"}`}>
                {stepLabels[s as keyof typeof stepLabels]}
              </span>
              {i < steps.length - 1 && (
                <div className={`flex-1 h-px transition-colors ${i < stepIndex ? "bg-[#7C3AED]" : "bg-border"}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="max-w-2xl mx-auto">
          {/* Analyzer steps */}
          {mode === "analyzer" && currentStep === "data" && (
            <CampaignDataStep workspaceId={workspaceId} dataSources={dataSources} onChange={setDataSources} />
          )}
          {mode === "analyzer" && currentStep === "focus" && (
            <AnalyzerFocusStep
              workspaceId={workspaceId}
              focusDimensions={focusDimensions}
              onChange={setFocusDimensions}
              customQuestion={customQuestion}
              onCustomQuestionChange={setCustomQuestion}
              insightSessionIds={insightSessionIds}
              onInsightSessionIdsChange={setInsightSessionIds}
            />
          )}

          {/* Builder steps */}
          {mode === "builder" && currentStep === "icp" && (
            <BuilderICPStep icp={icp} onChange={setIcp} />
          )}
          {mode === "builder" && currentStep === "channels" && (
            <BuilderChannelsStep
              workspaceId={workspaceId}
              channels={channels}
              onChannelsChange={setChannels}
              params={sequenceParams}
              onParamsChange={setSequenceParams}
              insightSessionIds={insightSessionIds}
              onInsightSessionIdsChange={setInsightSessionIds}
            />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-border">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStepIndex(stepIndex - 1)}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-sm text-muted-foreground hover:text-foreground disabled:opacity-0 transition-colors"
          >
            &larr; Back
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {!isLastStep ? (
            <button
              onClick={() => setStepIndex(stepIndex + 1)}
              disabled={!canAdvance}
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue &rarr;
            </button>
          ) : (
            <button
              onClick={launch}
              disabled={!canAdvance || isCreating}
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isCreating
                ? "Launching..."
                : mode === "analyzer"
                  ? "Launch Analysis"
                  : "Generate Sequences"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
