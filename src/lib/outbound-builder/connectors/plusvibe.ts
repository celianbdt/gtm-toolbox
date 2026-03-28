import type { CampaignRow } from "../types";

// PlusVibe API — try multiple base URLs since docs don't specify clearly
const BASE_URLS = [
  "https://server.plusvibe.ai/api/v1",
  "https://api.plusvibe.ai/api/v1",
  "https://app.plusvibe.ai/api/v1",
];

function authHeaders(apiKey: string): HeadersInit {
  return {
    "Content-Type": "application/json",
    "x-api-key": apiKey,
  };
}

async function findWorkingBaseUrl(apiKey: string, workspaceId: string): Promise<string> {
  for (const base of BASE_URLS) {
    try {
      const res = await fetch(
        `${base}/list-all-campaigns?workspace_id=${encodeURIComponent(workspaceId)}`,
        { headers: authHeaders(apiKey), signal: AbortSignal.timeout(5000) }
      );
      if (res.ok || res.status === 401 || res.status === 403) {
        return base; // Server exists, even if auth fails
      }
    } catch {
      continue;
    }
  }
  throw new Error(
    "Could not reach PlusVibe API. Check your API key and workspace ID. " +
    "If the issue persists, PlusVibe may have changed their API URL."
  );
}

type PlusVibeCampaign = {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
};

type PlusVibeCampaignStats = {
  campaign_id?: string;
  campaign_name?: string;
  sent?: number;
  opened?: number;
  open_rate?: number;
  replied?: number;
  reply_rate?: number;
  clicked?: number;
  click_rate?: number;
  bounced?: number;
  leads_count?: number;
};

export async function fetchPlusVibeCampaigns(
  apiKey: string,
  workspaceId: string
): Promise<CampaignRow[]> {
  const BASE_URL = await findWorkingBaseUrl(apiKey, workspaceId);

  // 1. List campaigns
  const campaignsRes = await fetch(
    `${BASE_URL}/list-all-campaigns?workspace_id=${encodeURIComponent(workspaceId)}`,
    { headers: authHeaders(apiKey) }
  );
  if (!campaignsRes.ok) {
    const body = await campaignsRes.text().catch(() => "");
    throw new Error(`PlusVibe API error ${campaignsRes.status}: ${body.slice(0, 200)}`);
  }
  const campaignsData = await campaignsRes.json();
  const campaigns: PlusVibeCampaign[] = campaignsData.data ?? campaignsData.campaigns ?? campaignsData;

  // 2. Fetch aggregated stats
  const statsRes = await fetch(
    `${BASE_URL}/get-all-campaigns-statistics?workspace_id=${encodeURIComponent(workspaceId)}&api_key=${encodeURIComponent(apiKey)}`,
    { headers: authHeaders(apiKey) }
  );

  const statsMap = new Map<string, PlusVibeCampaignStats>();
  if (statsRes.ok) {
    const statsData = await statsRes.json();
    const statsList: PlusVibeCampaignStats[] = statsData.data ?? statsData.statistics ?? statsData;
    if (Array.isArray(statsList)) {
      for (const s of statsList) {
        const key = s.campaign_id ?? s.campaign_name;
        if (key) statsMap.set(key, s);
      }
    }
  }

  // 3. If aggregated didn't work, fetch per campaign
  if (statsMap.size === 0) {
    for (const campaign of campaigns.slice(0, 50)) {
      try {
        const res = await fetch(
          `${BASE_URL}/get-campaign-stats?workspace_id=${encodeURIComponent(workspaceId)}&campaign_id=${encodeURIComponent(campaign.id)}`,
          { headers: authHeaders(apiKey) }
        );
        if (res.ok) {
          const s = await res.json();
          statsMap.set(campaign.id, s.data ?? s);
        }
      } catch {
        // Skip failed fetches
      }
    }
  }

  return campaigns.map((campaign) => {
    const stats = statsMap.get(campaign.id) ?? statsMap.get(campaign.name);
    return {
      campaign_name: campaign.name,
      channel: "email" as const,
      sent: stats?.sent,
      opened: stats?.opened,
      open_rate: stats?.open_rate,
      replied: stats?.replied,
      reply_rate: stats?.reply_rate,
      clicked: stats?.clicked,
      period: campaign.created_at?.slice(0, 10),
      notes: `Status: ${campaign.status ?? "unknown"}`,
    };
  });
}
