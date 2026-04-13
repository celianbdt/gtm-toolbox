export type IntegrationProvider = "hubspot" | "pipedrive" | "attio" | "folk" | "notion" | "slack" | "lemlist" | "instantly" | "smartlead" | "plusvibe" | "clay";
export type IntegrationStatus = "connected" | "disconnected" | "error" | "syncing";

export type Integration = {
  id: string;
  workspace_id: string;
  provider: IntegrationProvider;
  credentials: Record<string, unknown>;
  config: Record<string, unknown>;
  status: IntegrationStatus;
  last_sync_at: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

export type SyncResult = {
  success: boolean;
  data: Array<{ data_type: string; raw_data: Record<string, unknown> }>;
  metrics: Array<{ metric_name: string; metric_value: number }>;
  count: number;
  errors: string[];
};

export interface IntegrationConnector {
  provider: IntegrationProvider;
  label: string;
  description: string;
  icon: string; // lucide icon name
  testConnection(credentials: Record<string, unknown>): Promise<boolean>;
  sync(credentials: Record<string, unknown>, config: Record<string, unknown>): Promise<SyncResult>;
}

export const COMING_SOON_PROVIDERS: Set<IntegrationProvider> = new Set([]);

export const PROVIDER_META: Record<IntegrationProvider, { label: string; description: string; icon: string }> = {
  hubspot: { label: "HubSpot", description: "Deals, contacts, email activity", icon: "Building2" },
  pipedrive: { label: "Pipedrive", description: "Deals pipeline, activities", icon: "Target" },
  attio: { label: "Attio", description: "Records, notes, activity", icon: "Database" },
  folk: { label: "Folk", description: "Contacts, companies", icon: "Users" },
  notion: { label: "Notion", description: "Pages, databases", icon: "BookOpen" },
  slack: { label: "Slack", description: "Channel messages, send reports", icon: "MessageSquare" },
  lemlist: { label: "Lemlist", description: "Campagnes outbound, stats, leads", icon: "Send" },
  instantly: { label: "Instantly", description: "Cold email campaigns, analytics", icon: "Zap" },
  smartlead: { label: "SmartLead", description: "Email campaigns, lead management", icon: "BarChart3" },
  plusvibe: { label: "PlusVibe", description: "Multi-channel sequences, analytics", icon: "Activity" },
  clay: { label: "Clay", description: "Enrichment tables (webhook)", icon: "Layers" },
};
