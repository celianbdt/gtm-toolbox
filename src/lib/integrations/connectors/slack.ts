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

export type SlackChannel = {
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

// ── Public utility: list all channels the bot can see ──

export async function listSlackChannels(
  token: string
): Promise<SlackChannel[]> {
  const allChannels: SlackChannel[] = [];
  let cursor: string | undefined;

  do {
    const url = new URL(`${SLACK_API}/conversations.list`);
    url.searchParams.set("types", "public_channel,private_channel");
    url.searchParams.set("limit", "200");
    url.searchParams.set("exclude_archived", "true");
    if (cursor) url.searchParams.set("cursor", cursor);

    const res = await fetch(url.toString(), {
      headers: headers(token),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) break;

    const json = (await res.json()) as SlackResponse & {
      channels: SlackChannel[];
      response_metadata?: { next_cursor?: string };
    };

    if (!json.ok) break;

    allChannels.push(...json.channels);
    cursor = json.response_metadata?.next_cursor || undefined;
  } while (cursor);

  return allChannels.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Public utility: send a message ──

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

// ── Connector ──

export const slackIntegrationConnector: IntegrationConnector = {
  provider: "slack",
  label: "Slack",
  description: "Channel messages, send reports",
  icon: "MessageSquare",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = (credentials.access_token ?? credentials.api_key) as string | undefined;
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

  async sync(
    credentials: Record<string, unknown>,
    config: Record<string, unknown>
  ): Promise<SyncResult> {
    const token = (credentials.access_token ?? credentials.api_key) as string;
    if (!token) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No token provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // Support multiple channels: channel_ids (array) or legacy channel_id (string)
    const channelIds: string[] = Array.isArray(config.channel_ids)
      ? (config.channel_ids as string[])
      : config.channel_id
        ? [config.channel_id as string]
        : [];

    // Fetch messages for each configured channel
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartUnix = String(Math.floor(weekStart.getTime() / 1000));
    let totalMessages = 0;

    for (const channelId of channelIds) {
      try {
        const allMessages: SlackMessage[] = [];
        let cursor: string | undefined;

        do {
          const url = new URL(`${SLACK_API}/conversations.history`);
          url.searchParams.set("channel", channelId);
          url.searchParams.set("limit", "100");
          url.searchParams.set("oldest", weekStartUnix);
          if (cursor) url.searchParams.set("cursor", cursor);

          const res = await fetch(url.toString(), {
            headers: headers(token),
            signal: AbortSignal.timeout(TIMEOUT),
          });

          if (!res.ok) {
            errors.push(`Slack history ${channelId}: ${res.status}`);
            break;
          }

          const json = (await res.json()) as SlackResponse & {
            messages: SlackMessage[];
            response_metadata?: { next_cursor?: string };
          };

          if (!json.ok) {
            errors.push(`Slack history ${channelId}: ${json.error ?? "unknown"}`);
            break;
          }

          allMessages.push(...json.messages);
          cursor = json.response_metadata?.next_cursor || undefined;
        } while (cursor);

        // Store messages grouped by channel
        data.push({
          data_type: `messages:${channelId}`,
          raw_data: {
            channel_id: channelId,
            messages: allMessages,
            count: allMessages.length,
            period_start: weekStart.toISOString(),
          },
        });

        totalMessages += allMessages.length;
      } catch (err) {
        errors.push(`Slack ${channelId}: ${err instanceof Error ? err.message : "Unknown"}`);
      }
    }

    if (channelIds.length > 0) {
      metrics.push({ metric_name: "slack_messages", metric_value: totalMessages });
    }

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: totalMessages,
      errors,
    };
  },
};
