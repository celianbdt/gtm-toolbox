import type { IntegrationConnector, SyncResult } from "../types";

const SMARTLEAD_API = "https://server.smartlead.ai/api/v1";
const TIMEOUT = 15_000;

function buildUrl(path: string, apiKey: string, params?: Record<string, string>): string {
  const url = new URL(`${SMARTLEAD_API}${path}`);
  url.searchParams.set("api_key", apiKey);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

export const smartleadIntegrationConnector: IntegrationConnector = {
  provider: "smartlead",
  label: "SmartLead",
  description: "Email campaigns, lead management",
  icon: "BarChart3",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string | undefined;
    if (!apiKey) return false;

    try {
      const res = await fetch(buildUrl("/campaigns/", apiKey), {
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
      const res = await fetch(buildUrl("/campaigns/", apiKey), {
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        errors.push(`SmartLead campaigns ${res.status}: ${await res.text()}`);
      } else {
        const campaigns = await res.json();
        const campaignList = Array.isArray(campaigns) ? campaigns : (campaigns.data ?? []);

        for (const campaign of campaignList) {
          data.push({ data_type: "campaign", raw_data: campaign });
        }

        metrics.push({ metric_name: "campaigns_count", metric_value: campaignList.length });

        // ── Analytics per campaign (top 10) ──
        let totalSent = 0;
        let totalOpened = 0;
        let totalReplied = 0;
        let totalBounced = 0;

        const topCampaigns = campaignList.slice(0, 10);
        const analyticsResults = await Promise.allSettled(
          topCampaigns.map(async (c: Record<string, unknown>) => {
            const id = c.id;
            if (!id) return;

            const analyticsRes = await fetch(
              buildUrl(`/campaigns/${id}/analytics`, apiKey),
              { signal: AbortSignal.timeout(10_000) }
            );

            if (analyticsRes.ok) {
              const stats = await analyticsRes.json();
              data.push({ data_type: "campaign_analytics", raw_data: { campaign_id: id, ...stats } });

              totalSent += Number(stats.sent ?? stats.total_sent ?? 0);
              totalOpened += Number(stats.opened ?? stats.total_opened ?? 0);
              totalReplied += Number(stats.replied ?? stats.total_replied ?? 0);
              totalBounced += Number(stats.bounced ?? stats.total_bounced ?? 0);
            }
          })
        );

        for (const r of analyticsResults) {
          if (r.status === "rejected") errors.push(`SmartLead analytics error: ${r.reason}`);
        }

        metrics.push(
          { metric_name: "emails_sent", metric_value: totalSent },
          { metric_name: "emails_opened", metric_value: totalOpened },
          { metric_name: "emails_replied", metric_value: totalReplied },
          { metric_name: "emails_bounced", metric_value: totalBounced }
        );

        if (totalSent > 0) {
          metrics.push(
            { metric_name: "open_rate", metric_value: Math.round((totalOpened / totalSent) * 10000) / 100 },
            { metric_name: "reply_rate", metric_value: Math.round((totalReplied / totalSent) * 10000) / 100 }
          );
        }
      }
    } catch (err) {
      errors.push(`SmartLead error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    return { success: errors.length === 0, data, metrics, count: data.length, errors };
  },
};
