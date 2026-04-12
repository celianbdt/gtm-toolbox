import type { IntegrationConnector, SyncResult } from "../types";

const SLACK_API = "https://slack.com/api";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json; charset=utf-8",
  };
}

type SlackResponse = {
  ok: boolean;
  error?: string;
};

type SlackChannel = {
  id: string;
  name: string;
  is_channel: boolean;
  is_private: boolean;
  num_members: number;
  topic?: { value: string };
  purpose?: { value: string };
};

type SlackMessage = {
  type: string;
  user?: string;
  text: string;
  ts: string;
  reply_count?: number;
};

export const slackIntegrationConnector: IntegrationConnector = {
  provider: "slack",
  label: "Slack",
  description: "Channel messages, send reports",
  icon: "MessageSquare",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = credentials.access_token as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(`${SLACK_API}/auth.test`, {
        method: "POST",
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) return false;
      const json = (await res.json()) as SlackResponse;
      return json.ok === true;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, config: Record<string, unknown>): Promise<SyncResult> {
    const token = credentials.access_token as string;
    if (!token) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No access_token provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // ── Channels ──
    try {
      let cursor: string | undefined;
      const allChannels: SlackChannel[] = [];

      do {
        const url = new URL(`${SLACK_API}/conversations.list`);
        url.searchParams.set("types", "public_channel,private_channel");
        url.searchParams.set("limit", "100");
        if (cursor) url.searchParams.set("cursor", cursor);

        const res = await fetch(url.toString(), {
          headers: headers(token),
          signal: AbortSignal.timeout(TIMEOUT),
        });

        if (!res.ok) {
          errors.push(`Slack conversations.list ${res.status}: ${await res.text()}`);
          break;
        }

        const json = (await res.json()) as SlackResponse & {
          channels: SlackChannel[];
          response_metadata?: { next_cursor?: string };
        };

        if (!json.ok) {
          errors.push(`Slack conversations.list error: ${json.error ?? "unknown"}`);
          break;
        }

        allChannels.push(...json.channels);
        cursor = json.response_metadata?.next_cursor || undefined;
      } while (cursor);

      for (const channel of allChannels) {
        data.push({ data_type: "channel", raw_data: channel as unknown as Record<string, unknown> });
      }
    } catch (err) {
      errors.push(`Slack channels fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    // ── Messages (if channel_id configured) ──
    const channelId = config.channel_id as string | undefined;

    if (channelId) {
      try {
        const weekStart = new Date();
        weekStart.setDate(weekStart.getDate() - 7);
        const weekStartUnix = String(Math.floor(weekStart.getTime() / 1000));

        const allMessages: SlackMessage[] = [];
        let cursor: string | undefined;

        do {
          const url = new URL(`${SLACK_API}/conversations.history`);
          url.searchParams.set("channel", channelId);
          url.searchParams.set("limit", "50");
          url.searchParams.set("oldest", weekStartUnix);
          if (cursor) url.searchParams.set("cursor", cursor);

          const res = await fetch(url.toString(), {
            headers: headers(token),
            signal: AbortSignal.timeout(TIMEOUT),
          });

          if (!res.ok) {
            errors.push(`Slack conversations.history ${res.status}: ${await res.text()}`);
            break;
          }

          const json = (await res.json()) as SlackResponse & {
            messages: SlackMessage[];
            response_metadata?: { next_cursor?: string };
          };

          if (!json.ok) {
            errors.push(`Slack conversations.history error: ${json.error ?? "unknown"}`);
            break;
          }

          allMessages.push(...json.messages);
          cursor = json.response_metadata?.next_cursor || undefined;
        } while (cursor);

        for (const message of allMessages) {
          data.push({ data_type: "message", raw_data: message as unknown as Record<string, unknown> });
        }

        metrics.push({ metric_name: "messages_count", metric_value: allMessages.length });
      } catch (err) {
        errors.push(`Slack messages fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
      }
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

// ── Utility: Send a message to a Slack channel ──

export async function sendSlackMessage(
  token: string,
  channelId: string,
  text: string
): Promise<boolean> {
  try {
    const res = await fetch(`${SLACK_API}/chat.postMessage`, {
      method: "POST",
      headers: headers(token),
      body: JSON.stringify({ channel: channelId, text }),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) return false;
    const json = (await res.json()) as SlackResponse;
    return json.ok === true;
  } catch {
    return false;
  }
}
