"use client";

import type { ChannelConfig, SequenceParams, SequenceTone, SequenceLanguage } from "@/lib/outbound-builder/types";
import { InsightPicker } from "@/components/shared/insight-picker";

type Props = {
  workspaceId: string;
  channels: ChannelConfig;
  onChannelsChange: (c: ChannelConfig) => void;
  params: SequenceParams;
  onParamsChange: (p: SequenceParams) => void;
  insightSessionIds: string[];
  onInsightSessionIdsChange: (ids: string[]) => void;
};

const CHANNEL_OPTIONS: { key: keyof ChannelConfig; label: string; icon: string; desc: string }[] = [
  { key: "email", label: "Email", icon: "✉️", desc: "Cold emails, follow-ups" },
  { key: "linkedin", label: "LinkedIn", icon: "💼", desc: "Connection requests, InMails, comments" },
  { key: "call", label: "Phone", icon: "📞", desc: "Cold calls, voicemails" },
];

const TONE_OPTIONS: { value: SequenceTone; label: string }[] = [
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
  { value: "bold", label: "Bold" },
];

export function BuilderChannelsStep({
  workspaceId,
  channels,
  onChannelsChange,
  params,
  onParamsChange,
  insightSessionIds,
  onInsightSessionIdsChange,
}: Props) {
  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">Channels & Config</h2>
      <p className="text-sm text-muted-foreground mb-6">
        Configure channels, sequence parameters, and tone.
      </p>

      {/* Channels */}
      <div className="space-y-2 mb-6">
        {CHANNEL_OPTIONS.map((opt) => {
          const enabled = channels[opt.key];
          return (
            <button
              key={opt.key}
              onClick={() => onChannelsChange({ ...channels, [opt.key]: !enabled })}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors text-left ${
                enabled
                  ? "border-[#8a6e4e] bg-[#8a6e4e]/10"
                  : "border-border bg-secondary/30"
              }`}
            >
              <span className="text-lg">{opt.icon}</span>
              <div>
                <span className={`text-sm font-medium ${enabled ? "text-foreground" : "text-muted-foreground"}`}>
                  {opt.label}
                </span>
                <p className="text-xs text-muted-foreground">{opt.desc}</p>
              </div>
              {enabled && <span className="ml-auto text-xs text-[#c4a882]">✓</span>}
            </button>
          );
        })}
      </div>

      {/* Sequence params */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Touchpoints</label>
            <input
              type="range"
              min={3}
              max={10}
              value={params.sequence_length}
              onChange={(e) => onParamsChange({ ...params, sequence_length: Number(e.target.value) })}
              className="w-full accent-[#8a6e4e]"
            />
            <span className="text-xs text-foreground">{params.sequence_length} steps</span>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1.5">Duration</label>
            <input
              type="range"
              min={7}
              max={45}
              step={7}
              value={params.total_duration_days}
              onChange={(e) => onParamsChange({ ...params, total_duration_days: Number(e.target.value) })}
              className="w-full accent-[#8a6e4e]"
            />
            <span className="text-xs text-foreground">{params.total_duration_days} days</span>
          </div>
        </div>

        {/* Tone */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Tone</label>
          <div className="flex gap-2">
            {TONE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => onParamsChange({ ...params, tone: opt.value })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  params.tone === opt.value
                    ? "bg-[#8a6e4e] text-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* Language */}
        <div>
          <label className="text-xs text-muted-foreground block mb-1.5">Language</label>
          <div className="flex gap-2">
            {(["en", "fr"] as SequenceLanguage[]).map((lang) => (
              <button
                key={lang}
                onClick={() => onParamsChange({ ...params, language: lang })}
                className={`flex-1 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                  params.language === lang
                    ? "bg-[#8a6e4e] text-foreground"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {lang === "en" ? "English" : "Français"}
              </button>
            ))}
          </div>
        </div>

        {/* A/B toggle */}
        <label className="flex items-center gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={params.ab_variants}
            onChange={(e) => onParamsChange({ ...params, ab_variants: e.target.checked })}
            className="rounded border-border text-[#8a6e4e] focus:ring-[#8a6e4e] w-4 h-4"
          />
          <div>
            <span className="text-sm text-foreground">Generate A/B variants</span>
            <p className="text-xs text-muted-foreground">Create test variants for email steps</p>
          </div>
        </label>
      </div>

      <InsightPicker
        workspaceId={workspaceId}
        currentToolId="outbound-builder"
        selectedIds={insightSessionIds}
        onChange={onInsightSessionIdsChange}
      />
    </div>
  );
}
