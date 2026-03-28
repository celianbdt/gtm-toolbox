import type { CampaignRow } from "../types";

export type OutboundProvider = "lemlist" | "instantly" | "plusvibe" | "smartlead";

export type ProviderCredentials = {
  provider: OutboundProvider;
  apiKey: string;
  workspaceId?: string; // Required for PlusVibe
};

export type ImportResult = {
  rows: CampaignRow[];
  campaignCount: number;
  provider: OutboundProvider;
};

export const PROVIDER_LABELS: Record<OutboundProvider, string> = {
  lemlist: "Lemlist",
  instantly: "Instantly",
  plusvibe: "PlusVibe",
  smartlead: "Smartlead",
};

export const PROVIDER_COLORS: Record<OutboundProvider, string> = {
  lemlist: "#6C5CE7",
  instantly: "#FF6B35",
  plusvibe: "#00D4AA",
  smartlead: "#3B82F6",
};
