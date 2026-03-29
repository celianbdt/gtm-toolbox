"use client";

import { useState } from "react";
import type {
  ProductInfo,
  AudienceInfo,
  CompetitorMessaging,
  CurrentMessaging,
  MessagingFocus,
} from "@/lib/messaging-lab/types";
import { ProductStep } from "./product-step";
import { AudienceStep } from "./audience-step";
import { CompetitiveStep } from "./competitive-step";
import { CurrentMessagingStep } from "./current-messaging-step";
import { ReviewStep } from "./review-step";

type Step = "product" | "audience" | "competitors" | "current-messaging" | "review";

type Props = {
  workspaceId: string;
  onSessionCreated: (sessionId: string) => void;
};

export function MLSetup({ workspaceId, onSessionCreated }: Props) {
  const [step, setStep] = useState<Step>("product");
  const [product, setProduct] = useState<ProductInfo>({
    name: "",
    description: "",
    category: "",
    key_features: [],
  });
  const [audience, setAudience] = useState<AudienceInfo>({
    icp_summary: "",
    primary_pain_points: [],
    decision_criteria: [],
  });
  const [competitors, setCompetitors] = useState<CompetitorMessaging[]>([]);
  const [currentMessaging, setCurrentMessaging] = useState<CurrentMessaging>({
    value_props: [],
  });
  const [focusDimensions, setFocusDimensions] = useState<MessagingFocus[]>([]);
  const [customQuestion, setCustomQuestion] = useState("");
  const [insightSessionIds, setInsightSessionIds] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const steps: Step[] = ["product", "audience", "competitors", "current-messaging", "review"];
  const stepIndex = steps.indexOf(step);

  const canAdvance =
    (step === "product" && product.name.trim() && product.description.trim() && product.category.trim()) ||
    (step === "audience" && audience.icp_summary.trim()) ||
    step === "competitors" ||
    step === "current-messaging" ||
    (step === "review" && focusDimensions.length >= 1);

  async function launchWorkshop() {
    setIsCreating(true);
    setError("");
    try {
      const res = await fetch("/api/messaging-lab/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          workspaceId,
          product,
          audience,
          competitors: competitors.filter((c) => c.name.trim()),
          currentMessaging,
          focusDimensions,
          customQuestion: customQuestion.trim() || undefined,
          insightSessionIds: insightSessionIds.length > 0 ? insightSessionIds : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create session");
      onSessionCreated(data.session.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to start workshop");
      setIsCreating(false);
    }
  }

  const stepLabels: Record<Step, string> = {
    product: "Product",
    audience: "Audience",
    competitors: "Competition",
    "current-messaging": "Messaging",
    review: "Review",
  };

  return (
    <div className="flex flex-col h-full">
      {/* Progress */}
      <div className="px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 max-w-2xl mx-auto">
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
          {step === "product" && (
            <ProductStep product={product} onChange={setProduct} />
          )}
          {step === "audience" && (
            <AudienceStep audience={audience} onChange={setAudience} />
          )}
          {step === "competitors" && (
            <CompetitiveStep competitors={competitors} onChange={setCompetitors} />
          )}
          {step === "current-messaging" && (
            <CurrentMessagingStep currentMessaging={currentMessaging} onChange={setCurrentMessaging} />
          )}
          {step === "review" && (
            <ReviewStep
              workspaceId={workspaceId}
              product={product}
              audience={audience}
              competitors={competitors}
              currentMessaging={currentMessaging}
              focusDimensions={focusDimensions}
              onFocusChange={setFocusDimensions}
              customQuestion={customQuestion}
              onCustomQuestionChange={setCustomQuestion}
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
              onClick={launchWorkshop}
              disabled={isCreating || focusDimensions.length === 0}
              className="px-5 py-2 bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-40 text-white text-sm font-medium rounded-lg transition-colors"
            >
              {isCreating ? "Launching..." : "Launch Workshop"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
