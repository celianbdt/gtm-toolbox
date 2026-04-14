"use client";

import { Plus, Trash2 } from "lucide-react";
import type {
  CurrentChannelPerformance,
  ChannelStatus,
  ChannelAssessment,
} from "@/lib/channel-planner/types";

const SUGGESTED_CHANNELS = [
  "Google Ads",
  "LinkedIn Ads",
  "SEO / Content",
  "Cold Email",
  "LinkedIn Outbound",
  "Partnerships",
  "Events / Conferences",
  "Webinars",
  "Community",
  "Product-Led / Free Trial",
  "Referrals",
  "Social Media (Organic)",
];

const STATUS_OPTIONS: { value: ChannelStatus; label: string }[] = [
  { value: "active", label: "Active" },
  { value: "tested", label: "Tested" },
  { value: "planned", label: "Planned" },
  { value: "abandoned", label: "Abandoned" },
];

const ASSESSMENT_OPTIONS: { value: ChannelAssessment; label: string }[] = [
  { value: "working", label: "Working" },
  { value: "underperforming", label: "Underperforming" },
  { value: "unknown", label: "Unknown" },
];

type Props = {
  channels: CurrentChannelPerformance[];
  onChange: (channels: CurrentChannelPerformance[]) => void;
};

export function CurrentChannelsStep({ channels, onChange }: Props) {
  function addChannel(channelName?: string) {
    onChange([
      ...channels,
      {
        channel: channelName ?? "",
        status: "active",
        assessment: "unknown",
      },
    ]);
  }

  function removeChannel(index: number) {
    onChange(channels.filter((_, i) => i !== index));
  }

  function updateChannel(
    index: number,
    updates: Partial<CurrentChannelPerformance>
  ) {
    onChange(
      channels.map((c, i) => (i === index ? { ...c, ...updates } : c))
    );
  }

  const usedChannelNames = new Set(channels.map((c) => c.channel));
  const suggestions = SUGGESTED_CHANNELS.filter(
    (c) => !usedChannelNames.has(c)
  );

  return (
    <div>
      <h2 className="text-lg font-semibold text-foreground mb-1">
        Current Channels
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        Add your current and planned GTM channels. This helps the analysts evaluate what to keep, optimize, or cut.
      </p>

      <div className="space-y-3">
        {channels.map((ch, i) => (
          <div
            key={i}
            className="border border-border rounded-lg p-4 space-y-3"
          >
            <div className="flex items-center gap-3">
              <input
                type="text"
                placeholder="Channel name"
                value={ch.channel}
                onChange={(e) =>
                  updateChannel(i, { channel: e.target.value })
                }
                className="flex-1 bg-transparent border-b border-border text-foreground text-sm font-medium placeholder:text-muted-foreground focus:outline-none focus:border-[#8a6e4e] pb-1"
              />
              <button
                onClick={() => removeChannel(i)}
                className="text-muted-foreground hover:text-red-400 transition-colors"
              >
                <Trash2 className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Status
                </label>
                <select
                  value={ch.status}
                  onChange={(e) =>
                    updateChannel(i, {
                      status: e.target.value as ChannelStatus,
                    })
                  }
                  className="w-full bg-secondary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                >
                  {STATUS_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Assessment
                </label>
                <select
                  value={ch.assessment}
                  onChange={(e) =>
                    updateChannel(i, {
                      assessment: e.target.value as ChannelAssessment,
                    })
                  }
                  className="w-full bg-secondary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                >
                  {ASSESSMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Monthly spend (optional)
                </label>
                <input
                  type="number"
                  placeholder="0"
                  value={ch.monthly_spend ?? ""}
                  onChange={(e) =>
                    updateChannel(i, {
                      monthly_spend: parseFloat(e.target.value) || undefined,
                    })
                  }
                  className="w-full bg-secondary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground block mb-1">
                  Key metrics (optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. 50 MQLs/mo, $200 CAC"
                  value={ch.metrics ?? ""}
                  onChange={(e) =>
                    updateChannel(i, {
                      metrics: e.target.value || undefined,
                    })
                  }
                  className="w-full bg-secondary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
                />
              </div>
            </div>

            <div>
              <label className="text-xs text-muted-foreground block mb-1">
                Notes (optional)
              </label>
              <input
                type="text"
                placeholder="Any additional context..."
                value={ch.notes ?? ""}
                onChange={(e) =>
                  updateChannel(i, {
                    notes: e.target.value || undefined,
                  })
                }
                className="w-full bg-secondary/30 rounded-lg px-2.5 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#8a6e4e]/30"
              />
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={() => addChannel()}
        className="mt-4 flex items-center gap-2 px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground border border-dashed border-border rounded-lg hover:border-[#8a6e4e]/30 transition-colors w-full justify-center"
      >
        <Plus className="size-4" />
        Add Channel
      </button>

      {/* Quick add suggestions */}
      {suggestions.length > 0 && channels.length < 8 && (
        <div className="mt-4">
          <p className="text-xs text-muted-foreground mb-2">
            Quick add:
          </p>
          <div className="flex flex-wrap gap-1.5">
            {suggestions.slice(0, 8).map((name) => (
              <button
                key={name}
                onClick={() => addChannel(name)}
                className="text-xs px-2.5 py-1 bg-secondary/50 hover:bg-accent text-muted-foreground hover:text-foreground rounded transition-colors"
              >
                + {name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
