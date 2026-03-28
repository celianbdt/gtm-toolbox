import type { CampaignRow } from "../types";

const BASE_URL = "https://server.smartlead.ai/api/v1";

type SmartleadCampaign = {
  id: number;
  name: string;
  status?: string;
  created_at?: string;
  tags?: string[];
};

type SmartleadStats = {
  sent?: number;
  opened?: number;
  open_rate?: number;
  clicked?: number;
  click_rate?: number;
  replied?: number;
  reply_rate?: number;
  bounced?: number;
  bounce_rate?: number;
};

export async function fetchSmartleadCampaigns(apiKey: string): Promise<CampaignRow[]> {
  // 1. List campaigns
  const campaignsRes = await fetch(`${BASE_URL}/campaigns/?api_key=${encodeURIComponent(apiKey)}`);
  if (!campaignsRes.ok) {
    throw new Error(`Smartlead API error: ${campaignsRes.status} ${campaignsRes.statusText}`);
  }
  const campaigns: SmartleadCampaign[] = await campaignsRes.json();

  // 2. Fetch stats per campaign (max 50, with rate limit consideration)
  const rows: CampaignRow[] = [];

  for (const campaign of campaigns.slice(0, 50)) {
    try {
      const statsRes = await fetch(
        `${BASE_URL}/campaigns/${campaign.id}/statistics?api_key=${encodeURIComponent(apiKey)}`
      );
      let stats: SmartleadStats = {};
      if (statsRes.ok) {
        stats = await statsRes.json();
      }

      rows.push({
        campaign_name: campaign.name,
        channel: "email" as const,
        segment: campaign.tags?.join(", "),
        sent: stats.sent,
        opened: stats.opened,
        open_rate: stats.open_rate,
        replied: stats.replied,
        reply_rate: stats.reply_rate,
        clicked: stats.clicked,
        period: campaign.created_at?.slice(0, 10),
        notes: `Status: ${campaign.status ?? "unknown"}`,
      });
    } catch {
      // Skip campaigns that fail to fetch stats
      rows.push({
        campaign_name: campaign.name,
        channel: "email",
        period: campaign.created_at?.slice(0, 10),
        notes: `Status: ${campaign.status ?? "unknown"} (stats unavailable)`,
      });
    }
  }

  return rows;
}
