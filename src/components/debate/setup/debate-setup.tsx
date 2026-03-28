"use client";

import { useState } from "react";
import type { AgentConfig } from "@/lib/debate/types";
import { TeamBuilder } from "./team-builder";
import { MissionInput } from "./mission-input";
import { DebateReview } from "./debate-review";
import { AiLoader } from "@/components/ui/ai-loader";

type Step = "team" | "mission" | "review";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

export function DebateSetup({ workspaceId, onSessionCreated }: Props) {
  const [step, setStep] = useState<Step>("team");
  const [agents, setAgents] = useState<AgentConfig[]>([]);
  const [mission, setMission] = useState("");
  const [maxTurns, setMaxTurns] = useState(10);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const steps: Step[] = ["team", "mission", "review"];
  const stepIndex = steps.indexOf(step);

  const canAdvance =
    (step === "team" && agents.length >= 2) ||
    (step === "mission" && mission.trim().length > 10) ||
    step === "review";

  async function startDebate() {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/debate/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          mission,
          maxTurns,
          agentIds: agents.map((a) => a.id),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start debate");
      setIsCreating(false);
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Progress indicator */}
      <div className="px-6 py-4 border-b border-zinc-800">
        <div className="flex items-center gap-2 max-w-xl mx-auto">
          {steps.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-colors ${
                  i <= stepIndex
                    ? "bg-violet-600 text-white"
                    : "bg-zinc-800 text-zinc-500"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-xs capitalize transition-colors ${
                  i === stepIndex ? "text-white" : "text-zinc-500"
                }`}
              >
                {s === "team" ? "Team" : s === "mission" ? "Mission" : "Review"}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`flex-1 h-px transition-colors ${
                    i < stepIndex ? "bg-violet-600" : "bg-zinc-800"
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
          {step === "team" && (
            <TeamBuilder workspaceId={workspaceId} agents={agents} onChange={setAgents} />
          )}
          {step === "mission" && (
            <MissionInput
              mission={mission}
              onChange={setMission}
              maxTurns={maxTurns}
              onMaxTurnsChange={setMaxTurns}
            />
          )}
          {step === "review" && (
            <DebateReview agents={agents} mission={mission} maxTurns={maxTurns} />
          )}
        </div>
      </div>

      {/* Navigation */}
      <div className="px-6 py-4 border-t border-zinc-800">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <button
            onClick={() => setStep(steps[stepIndex - 1])}
            disabled={stepIndex === 0}
            className="px-4 py-2 text-sm text-zinc-400 hover:text-white disabled:opacity-0 transition-colors"
          >
            ← Back
          </button>

          {error && <p className="text-sm text-red-400">{error}</p>}

          {step !== "review" ? (
            <button
              onClick={() => setStep(steps[stepIndex + 1])}
              disabled={!canAdvance}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
            >
              Continue →
            </button>
          ) : isCreating ? (
            <AiLoader label="Starting debate..." />
          ) : (
            <button
              onClick={startDebate}
              className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Start Debate ⚡
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
