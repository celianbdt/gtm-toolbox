import type { CampaignRow } from "../types";

const BASE_URL = "https://api.instantly.ai/api/v2";

function authHeaders(apiKey: string): HeadersInit {
  return { Authorization: `Bearer ${apiKey}` };
}

type InstantlyCampaign = {
  id: string;
  name: string;
  status?: string;
  created_at?: string;
  tag_ids?: string[];
};

type InstantlyAnalytics = {
  campaign_id?: string;
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

export async function fetchInstantlyCampaigns(apiKey: string): Promise<CampaignRow[]> {
  // 1. List campaigns
  const campaignsRes = await fetch(`${BASE_URL}/campaigns`, {
    headers: authHeaders(apiKey),
  });
  if (!campaignsRes.ok) {
    throw new Error(`Instantly API error: ${campaignsRes.status} ${campaignsRes.statusText}`);
  }
  const data = await campaignsRes.json();
  const campaigns: InstantlyCampaign[] = data.data ?? data.items ?? data;

  // 2. Fetch analytics (can get all at once or per campaign)
  const analyticsRes = await fetch(`${BASE_URL}/campaigns/analytics`, {
    headers: authHeaders(apiKey),
  });

  const analyticsMap = new Map<string, InstantlyAnalytics>();
  if (analyticsRes.ok) {
    const analyticsData = await analyticsRes.json();
    const analyticsList: InstantlyAnalytics[] = Array.isArray(analyticsData)
      ? analyticsData
      : analyticsData.data ?? [];
    for (const a of analyticsList) {
      if (a.campaign_id) analyticsMap.set(a.campaign_id, a);
    }
  }

  // 3. If bulk analytics didn't work, fetch per campaign
  if (analyticsMap.size === 0) {
    for (const campaign of campaigns.slice(0, 50)) {
      try {
        const res = await fetch(`${BASE_URL}/campaigns/analytics?id=${campaign.id}`, {
          headers: authHeaders(apiKey),
        });
        if (res.ok) {
          const a = await res.json();
          analyticsMap.set(campaign.id, a);
        }
      } catch {
        // Skip failed individual fetches
      }
    }
  }

  return campaigns.map((campaign) => {
    const stats = analyticsMap.get(campaign.id);
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
