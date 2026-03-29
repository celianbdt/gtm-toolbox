"use client";

import type {
  ProductInfo,
  AudienceInfo,
  CompetitorMessaging,
  CurrentMessaging,
  MessagingFocus,
} from "@/lib/messaging-lab/types";
import { MESSAGING_FOCUS_LABELS } from "@/lib/messaging-lab/types";
import {
  Target,
  Sparkles,
  Heart,
  Shield,
  Megaphone,
  FileText,
} from "lucide-react";
import { InsightPicker } from "@/components/shared/insight-picker";

const focusIcons: Record<MessagingFocus, React.ComponentType<{ className?: string }>> = {
  positioning: Target,
  differentiation: Sparkles,
  "emotional-resonance": Heart,
  "objection-handling": Shield,
  "sales-enablement": Megaphone,
  "content-messaging": FileText,
};

const ALL_FOCUSES: MessagingFocus[] = [
  "positioning",
  "differentiation",
  "emotional-resonance",
  "objection-handling",
  "sales-enablement",
  "content-messaging",
];

const AGENTS = [
  { emoji: "\u{1F3A8}", name: "Brand Strategist", color: "#8b5cf6" },
  { emoji: "\u270D\uFE0F", name: "Conversion Copywriter", color: "#f59e0b" },
  { emoji: "\u{1F464}", name: "Buyer Persona", color: "#06b6d4" },
  { emoji: "\u{1F4E2}", name: "Sales Enablement", color: "#ef4444" },
];

type Props = {
  workspaceId: string;
  product: ProductInfo;
  audience: AudienceInfo;
  competitors: CompetitorMessaging[];
  currentMessaging: CurrentMessaging;
  focusDimensions: MessagingFocus[];
  onFocusChange: (dimensions: MessagingFocus[]) => void;
  customQuestion: string;
  onCustomQuestionChange: (q: string) => void;
  insightSessionIds: string[];
  onInsightSessionIdsChange: (ids: string[]) => void;
};

export function ReviewStep({
  workspaceId,
  product,
  audience,
  competitors,
  currentMessaging,
  focusDimensions,
  onFocusChange,
  customQuestion,
  onCustomQuestionChange,
  insightSessionIds,
  onInsightSessionIdsChange,
}: Props) {
  function toggleFocus(focus: MessagingFocus) {
    if (focusDimensions.includes(focus)) {
      onFocusChange(focusDimensions.filter((f) => f !== focus));
    } else {
      onFocusChange([...focusDimensions, focus]);
    }
  }

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Review & Launch
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Select focus dimensions, then launch the messaging workshop.
      </p>

      <div className="space-y-5">
        {/* Focus Dimensions */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Focus Dimensions *
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {ALL_FOCUSES.map((focus) => {
              const Icon = focusIcons[focus];
              const selected = focusDimensions.includes(focus);
              return (
                <button
                  key={focus}
                  onClick={() => toggleFocus(focus)}
                  className={`flex items-center gap-2.5 p-3 rounded-lg border text-left transition-all text-sm ${
                    selected
                      ? "border-[#7C3AED]/40 bg-[#7C3AED]/10 text-foreground"
                      : "border-border hover:border-border/80 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className={`size-3.5 shrink-0 ${selected ? "text-[#A78BFA]" : ""}`} />
                  <span className="text-xs">{MESSAGING_FOCUS_LABELS[focus]}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Question */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Custom Question (optional)
          </h3>
          <textarea
            placeholder="e.g. We're launching in a new market — how should we adapt our messaging?"
            value={customQuestion}
            onChange={(e) => onCustomQuestionChange(e.target.value)}
            rows={2}
            className="w-full bg-secondary/30 rounded-lg px-3 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#7C3AED]/30 resize-none"
          />
        </div>

        {/* Cross-tool insights */}
        <InsightPicker
          workspaceId={workspaceId}
          currentToolId="messaging-lab"
          selectedIds={insightSessionIds}
          onChange={onInsightSessionIdsChange}
        />

        {/* Product Summary */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Product
          </h3>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">{product.name}</p>
            <p className="text-xs text-muted-foreground">{product.category}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{product.description}</p>
            {product.key_features.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-1.5">
                {product.key_features.map((f, i) => (
                  <span key={i} className="text-[10px] px-2 py-0.5 bg-secondary/50 text-muted-foreground rounded-full">
                    {f}
                  </span>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Audience Summary */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Audience
          </h3>
          <p className="text-xs text-muted-foreground line-clamp-2">{audience.icp_summary}</p>
          {audience.primary_pain_points.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {audience.primary_pain_points.map((p, i) => (
                <span key={i} className="text-[10px] px-2 py-0.5 bg-red-400/10 text-red-400 rounded-full">
                  {p}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Competitors Summary */}
        {competitors.length > 0 && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Competitors ({competitors.length})
            </h3>
            <div className="space-y-1">
              {competitors.map((c, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-sm text-foreground font-medium">{c.name}</span>
                  <span className="text-xs text-muted-foreground">
                    {c.key_claims.length} claim{c.key_claims.length !== 1 ? "s" : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Current Messaging Summary */}
        {(currentMessaging.tagline || currentMessaging.value_props.length > 0) && (
          <div className="border border-border rounded-lg p-4">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
              Current Messaging
            </h3>
            {currentMessaging.tagline && (
              <p className="text-sm text-foreground italic mb-1">&ldquo;{currentMessaging.tagline}&rdquo;</p>
            )}
            {currentMessaging.value_props.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {currentMessaging.value_props.length} value prop{currentMessaging.value_props.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        )}

        {/* Agent Team */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Workshop Team
          </h3>
          <div className="grid grid-cols-2 gap-2">
            {AGENTS.map((a) => (
              <div key={a.name} className="flex items-center gap-2 text-sm">
                <span>{a.emoji}</span>
                <span className="text-foreground">{a.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Process */}
        <div className="border border-border rounded-lg p-4">
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3">
            Workshop Process
          </h3>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">1</span>
              Context Loading — extract messaging context
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">2</span>
              Messaging Workshop — 4 agents draft messaging
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">3</span>
              Critique & Debate — critique and refine proposals
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs bg-secondary rounded-full w-5 h-5 flex items-center justify-center">4</span>
              Synthesis — generate framework, taglines, pitches
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
