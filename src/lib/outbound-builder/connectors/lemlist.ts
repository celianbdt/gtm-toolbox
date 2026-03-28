import type { CampaignRow } from "../types";

const BASE_URL = "https://api.lemlist.com/api";

function authHeaders(apiKey: string): HeadersInit {
  const encoded = Buffer.from(`:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

type LemlistCampaign = {
  _id?: string;
  id?: string;
  name: string;
  status?: string;
  createdAt?: string;
  created_at?: string;
  labels?: string[];
  type?: string; // "email", "multichannel", etc.
};

type LemlistStats = {
  sent?: number;
  opened?: number;
  openRate?: number;
  clicked?: number;
  clickRate?: number;
  replied?: number;
  replyRate?: number;
  booked?: number;
};

export async function fetchLemlistCampaigns(apiKey: string): Promise<CampaignRow[]> {
  // 1. List ALL campaigns across all statuses with pagination
  let allCampaigns: LemlistCampaign[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const url = `${BASE_URL}/campaigns?limit=${limit}&offset=${offset}&version=v2`;
    const res = await fetch(url, { headers: authHeaders(apiKey) });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`Lemlist API error ${res.status}: ${body.slice(0, 200)}`);
    }

    const text = await res.text();
    let page: LemlistCampaign[];
    try {
      page = JSON.parse(text);
    } catch {
      throw new Error(`Lemlist returned invalid JSON. Check your API key. Response: ${text.slice(0, 100)}`);
    }

    if (!Array.isArray(page)) {
      // v2 might wrap in an object
      const obj = page as unknown as Record<string, unknown>;
      page = (obj.data ?? obj.campaigns ?? []) as LemlistCampaign[];
    }

    allCampaigns = allCampaigns.concat(page);

    if (page.length < limit) break; // Last page
    offset += limit;
    if (offset > 1000) break; // Safety cap
  }

  const campaigns = allCampaigns;

  // 2. Fetch stats for each campaign (parallel, max 5 concurrent)
  const rows: CampaignRow[] = [];
  const chunks = chunkArray(campaigns, 5);

  for (const chunk of chunks) {
    const results = await Promise.allSettled(
      chunk.map(async (campaign) => {
        const campaignId = campaign._id ?? campaign.id;
        if (!campaignId) return null;

        const statsRes = await fetch(`${BASE_URL}/campaigns/${campaignId}/stats`, {
          headers: authHeaders(apiKey),
        });
        if (!statsRes.ok) return null;
        const stats: LemlistStats = await statsRes.json();

        const createdAt = campaign.createdAt ?? campaign.created_at;
        const channelType = campaign.type === "multichannel" ? "other" as const : "email" as const;

        return {
          campaign_name: campaign.name,
          channel: channelType,
          segment: campaign.labels?.join(", "),
          sent: stats.sent,
          opened: stats.opened,
          open_rate: stats.openRate ? Math.round(stats.openRate * 100) / 100 : undefined,
          replied: stats.replied,
          reply_rate: stats.replyRate ? Math.round(stats.replyRate * 100) / 100 : undefined,
          clicked: stats.clicked,
          meetings_booked: stats.booked,
          period: createdAt?.slice(0, 10),
          notes: `Status: ${campaign.status ?? "unknown"}${campaign.type ? ` | Type: ${campaign.type}` : ""}`,
        };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled" && result.value) {
        rows.push(result.value);
      }
    }
  }

  return rows;
}

function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size));
  }
  return chunks;
}
