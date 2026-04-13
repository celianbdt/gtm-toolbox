import type { IntegrationConnector, SyncResult } from "../types";

const LEMLIST_API = "https://api.lemlist.com/api";
const TIMEOUT = 15_000;

function authHeaders(apiKey: string): HeadersInit {
  const encoded = Buffer.from(`:${apiKey}`).toString("base64");
  return { Authorization: `Basic ${encoded}` };
}

type LemlistCampaign = {
  _id: string;
  name: string;
  status?: string;
  createdAt?: string;
  labels?: string[];
  type?: string;
  sendCount?: number;
  sent?: number;
  openCount?: number;
  opened?: number;
  openRate?: number;
  replyCount?: number;
  replied?: number;
  replyRate?: number;
  clickCount?: number;
  clicked?: number;
  bookedCount?: number;
  booked?: number;
};

export const lemlistIntegrationConnector: IntegrationConnector = {
  provider: "lemlist",
  label: "Lemlist",
  description: "Campagnes outbound, stats, leads",
  icon: "Send",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string | undefined;
    if (!apiKey) return false;

    try {
      const res = await fetch(`${LEMLIST_API}/team`, {
        headers: authHeaders(apiKey),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, _config: Record<string, unknown>): Promise<SyncResult> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string;
    if (!apiKey) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No API key provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // ── Campaigns ──
    try {
      const res = await fetch(`${LEMLIST_API}/campaigns`, {
        headers: authHeaders(apiKey),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        const body = await res.text();
        errors.push(`Lemlist campaigns ${res.status}: ${body}`);
      } else {
        const text = await res.text();
        let campaigns: LemlistCampaign[] = [];
        try {
          const parsed = JSON.parse(text);
          campaigns = Array.isArray(parsed)
            ? parsed
            : (parsed.data ?? parsed.campaigns ?? []);
        } catch {
          errors.push("Lemlist returned invalid JSON for campaigns");
        }

        let totalSent = 0;
        let totalOpened = 0;
        let totalReplied = 0;
        let totalClicked = 0;
        let totalBooked = 0;
        let activeCampaigns = 0;

        for (const campaign of campaigns) {
          data.push({ data_type: "campaign", raw_data: campaign as unknown as Record<string, unknown> });

          const sent = campaign.sendCount ?? campaign.sent ?? 0;
          const opened = campaign.openCount ?? campaign.opened ?? 0;
          const replied = campaign.replyCount ?? campaign.replied ?? 0;
          const clicked = campaign.clickCount ?? campaign.clicked ?? 0;
          const booked = campaign.bookedCount ?? campaign.booked ?? 0;

          totalSent += sent;
          totalOpened += opened;
          totalReplied += replied;
          totalClicked += clicked;
          totalBooked += booked;

          if (campaign.status === "running") activeCampaigns++;
        }

        metrics.push(
          { metric_name: "campaigns_count", metric_value: campaigns.length },
          { metric_name: "campaigns_active", metric_value: activeCampaigns },
          { metric_name: "emails_sent", metric_value: totalSent },
          { metric_name: "emails_opened", metric_value: totalOpened },
          { metric_name: "emails_replied", metric_value: totalReplied },
          { metric_name: "emails_clicked", metric_value: totalClicked },
          { metric_name: "meetings_booked", metric_value: totalBooked }
        );

        // Compute rates
        if (totalSent > 0) {
          metrics.push(
            { metric_name: "open_rate", metric_value: Math.round((totalOpened / totalSent) * 10000) / 100 },
            { metric_name: "reply_rate", metric_value: Math.round((totalReplied / totalSent) * 10000) / 100 }
          );
        }

        // ── Campaign stats detail (batch, top 10 active) ──
        const activeCampaignsList = campaigns
          .filter((c) => c.status === "running")
          .slice(0, 10);

        const statsResults = await Promise.allSettled(
          activeCampaignsList.map(async (campaign) => {
            const statsRes = await fetch(`${LEMLIST_API}/campaigns/${campaign._id}/stats`, {
              headers: authHeaders(apiKey),
              signal: AbortSignal.timeout(10_000),
            });
            if (statsRes.ok) {
              const stats = await statsRes.json();
              data.push({
                data_type: "campaign_stats",
                raw_data: { campaign_id: campaign._id, campaign_name: campaign.name, ...stats },
              });
            }
          })
        );

        // Count stats errors
        for (const r of statsResults) {
          if (r.status === "rejected") {
            errors.push(`Stats fetch error: ${r.reason}`);
          }
        }
      }
    } catch (err) {
      errors.push(`Lemlist campaigns error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    // ── Team credits ──
    try {
      const res = await fetch(`${LEMLIST_API}/team/credits`, {
        headers: authHeaders(apiKey),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (res.ok) {
        const credits = await res.json();
        data.push({ data_type: "team_credits", raw_data: credits });
      }
    } catch {
      // non-critical
    }

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: data.length,
      errors,
    };
  },
};
