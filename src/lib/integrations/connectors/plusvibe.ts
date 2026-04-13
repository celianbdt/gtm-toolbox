import type { IntegrationConnector, SyncResult } from "../types";

const PLUSVIBE_API = "https://api.plusvibe.ai";
const TIMEOUT = 15_000;

function headers(apiKey: string, workspaceId?: string): HeadersInit {
  const h: Record<string, string> = {
    "x-api-key": apiKey,
    "Content-Type": "application/json",
  };
  if (workspaceId) h["x-workspace-id"] = workspaceId;
  return h;
}

export const plusvibeIntegrationConnector: IntegrationConnector = {
  provider: "plusvibe",
  label: "PlusVibe",
  description: "Multi-channel sequences, analytics",
  icon: "Activity",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string | undefined;
    if (!apiKey) return false;

    try {
      const res = await fetch(`${PLUSVIBE_API}/workspaces`, {
        headers: headers(apiKey),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, config: Record<string, unknown>): Promise<SyncResult> {
    const apiKey = (credentials.api_key ?? credentials.access_token) as string;
    if (!apiKey) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No API key provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // Get workspace ID — either from config or from first workspace
    let workspaceId = config.workspace_id as string | undefined;

    if (!workspaceId) {
      try {
        const wsRes = await fetch(`${PLUSVIBE_API}/workspaces`, {
          headers: headers(apiKey),
          signal: AbortSignal.timeout(TIMEOUT),
        });
        if (wsRes.ok) {
          const wsData = await wsRes.json();
          const workspaces = Array.isArray(wsData) ? wsData : (wsData.data ?? []);
          if (workspaces.length > 0) {
            workspaceId = workspaces[0].id ?? workspaces[0]._id;
          }
        }
      } catch {
        // continue without workspace_id
      }
    }

    // ── Campaigns ──
    try {
      const res = await fetch(`${PLUSVIBE_API}/campaigns`, {
        headers: headers(apiKey, workspaceId),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        errors.push(`PlusVibe campaigns ${res.status}: ${await res.text()}`);
      } else {
        const json = await res.json();
        const campaigns = Array.isArray(json) ? json : (json.data ?? []);

        for (const campaign of campaigns) {
          data.push({ data_type: "campaign", raw_data: campaign });
        }
        metrics.push({ metric_name: "campaigns_count", metric_value: campaigns.length });

        // ── Campaign stats (aggregated) ──
        if (workspaceId) {
          try {
            const statsRes = await fetch(
              `${PLUSVIBE_API}/workspaces/${workspaceId}/campaigns/stats`,
              { headers: headers(apiKey, workspaceId), signal: AbortSignal.timeout(TIMEOUT) }
            );
            if (statsRes.ok) {
              const stats = await statsRes.json();
              data.push({ data_type: "workspace_stats", raw_data: stats });

              // Extract metrics from aggregated stats
              const s = Array.isArray(stats) ? stats[0] ?? {} : stats;
              if (s.sent ?? s.emails_sent) metrics.push({ metric_name: "emails_sent", metric_value: Number(s.sent ?? s.emails_sent ?? 0) });
              if (s.opened ?? s.emails_opened) metrics.push({ metric_name: "emails_opened", metric_value: Number(s.opened ?? s.emails_opened ?? 0) });
              if (s.replied ?? s.emails_replied) metrics.push({ metric_name: "emails_replied", metric_value: Number(s.replied ?? s.emails_replied ?? 0) });
              if (s.open_rate) metrics.push({ metric_name: "open_rate", metric_value: Number(s.open_rate) });
              if (s.reply_rate) metrics.push({ metric_name: "reply_rate", metric_value: Number(s.reply_rate) });
            }
          } catch {
            // non-critical
          }
        }
      }
    } catch (err) {
      errors.push(`PlusVibe error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    // ── Lead counts ──
    if (workspaceId) {
      try {
        const leadsRes = await fetch(
          `${PLUSVIBE_API}/workspaces/${workspaceId}/leads/counts`,
          { headers: headers(apiKey, workspaceId), signal: AbortSignal.timeout(TIMEOUT) }
        );
        if (leadsRes.ok) {
          const counts = await leadsRes.json();
          data.push({ data_type: "lead_counts", raw_data: counts });
          const total = Number(counts.total ?? counts.count ?? 0);
          if (total > 0) metrics.push({ metric_name: "leads_count", metric_value: total });
        }
      } catch {
        // non-critical
      }
    }

    return { success: errors.length === 0, data, metrics, count: data.length, errors };
  },
};
