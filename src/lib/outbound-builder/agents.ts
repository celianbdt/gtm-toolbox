export const OB_ANALYST_SLUGS = [
  "ob-sdr-coach",
  "ob-channel-strategist",
  "ob-copywriter",
  "ob-data-analyst",
] as const;

export type OBAnalystSlug = (typeof OB_ANALYST_SLUGS)[number];

export const OB_AGENT_DISPLAY: Record<OBAnalystSlug, { emoji: string; name: string; color: string }> = {
  "ob-sdr-coach": { emoji: "\u{1F3AF}", name: "SDR Coach", color: "#ef4444" },
  "ob-channel-strategist": { emoji: "\u{1F4E1}", name: "Channel Strategist", color: "#3b82f6" },
  "ob-copywriter": { emoji: "\u270D\uFE0F", name: "Conversion Copywriter", color: "#8a6e4e" },
  "ob-data-analyst": { emoji: "\u{1F4CA}", name: "Performance Analyst", color: "#06b6d4" },
};
