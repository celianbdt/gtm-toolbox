import type { IntegrationConnector, SyncResult } from "../types";

const INSTANTLY_API = "https://api.instantly.ai/api/v2";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

export const instantlyIntegrationConnector: IntegrationConnector = {
  provider: "instantly",
  label: "Instantly",
  description: "Cold email campaigns, analytics",
  icon: "Zap",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = (credentials.access_token ?? credentials.api_key) as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(`${INSTANTLY_API}/campaigns?limit=1`, {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, _config: Record<string, unknown>): Promise<SyncResult> {
    const token = (credentials.access_token ?? credentials.api_key) as string;
    if (!token) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No API key provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // ── Campaigns ──
    try {
      const res = await fetch(`${INSTANTLY_API}/campaigns?limit=100`, {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        errors.push(`Instantly campaigns ${res.status}: ${await res.text()}`);
      } else {
        const json = await res.json();
        const campaigns = json.data ?? json.items ?? json ?? [];
        const campaignList = Array.isArray(campaigns) ? campaigns : [];

        for (const campaign of campaignList) {
          data.push({ data_type: "campaign", raw_data: campaign });
        }

        metrics.push({ metric_name: "campaigns_count", metric_value: campaignList.length });

        // ── Analytics for each campaign (top 10) ──
        let totalSent = 0;
        let totalOpened = 0;
        let totalReplied = 0;

        const topCampaigns = campaignList.slice(0, 10);
        const analyticsResults = await Promise.allSettled(
          topCampaigns.map(async (c: Record<string, unknown>) => {
            const id = c.id ?? c._id;
            if (!id) return;

            const analyticsRes = await fetch(`${INSTANTLY_API}/campaigns/${id}/analytics`, {
              headers: headers(token),
              signal: AbortSignal.timeout(10_000),
            });

            if (analyticsRes.ok) {
              const stats = await analyticsRes.json();
              data.push({ data_type: "campaign_analytics", raw_data: { campaign_id: id, ...stats } });

              totalSent += Number(stats.sent ?? stats.emails_sent ?? 0);
              totalOpened += Number(stats.opened ?? stats.emails_opened ?? 0);
              totalReplied += Number(stats.replied ?? stats.emails_replied ?? 0);
            }
          })
        );

        for (const r of analyticsResults) {
          if (r.status === "rejected") errors.push(`Analytics error: ${r.reason}`);
        }

        metrics.push(
          { metric_name: "emails_sent", metric_value: totalSent },
          { metric_name: "emails_opened", metric_value: totalOpened },
          { metric_name: "emails_replied", metric_value: totalReplied }
        );

        if (totalSent > 0) {
          metrics.push(
            { metric_name: "open_rate", metric_value: Math.round((totalOpened / totalSent) * 10000) / 100 },
            { metric_name: "reply_rate", metric_value: Math.round((totalReplied / totalSent) * 10000) / 100 }
          );
        }
      }
    } catch (err) {
      errors.push(`Instantly error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    return { success: errors.length === 0, data, metrics, count: data.length, errors };
  },
};
