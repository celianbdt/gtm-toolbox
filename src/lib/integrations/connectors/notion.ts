import type { IntegrationConnector, SyncResult } from "../types";

const NOTION_API = "https://api.notion.com/v1";
const NOTION_VERSION = "2022-06-28";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
    "Notion-Version": NOTION_VERSION,
  };
}

type NotionPage = {
  id: string;
  object: string;
  properties: Record<string, unknown>;
  url: string;
  created_time: string;
  last_edited_time: string;
  parent: Record<string, unknown>;
};

type NotionSearchResponse = {
  results: NotionPage[];
  has_more: boolean;
  next_cursor: string | null;
};

type NotionBlocksResponse = {
  results: Array<Record<string, unknown>>;
  has_more: boolean;
  next_cursor: string | null;
};

export const notionIntegrationConnector: IntegrationConnector = {
  provider: "notion",
  label: "Notion",
  description: "Pages, databases",
  icon: "BookOpen",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = credentials.access_token as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(`${NOTION_API}/users/me`, {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, _config: Record<string, unknown>): Promise<SyncResult> {
    const token = credentials.access_token as string;
    if (!token) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No access_token provided"] };
    }

    const data: SyncResult["data"] = [];
    const errors: string[] = [];

    try {
      // Search for pages
      let hasMore = true;
      let cursor: string | null = null;

      while (hasMore) {
        const body: Record<string, unknown> = {
          filter: { property: "object", value: "page" },
          page_size: 100,
        };
        if (cursor) body.start_cursor = cursor;

        const res = await fetch(`${NOTION_API}/search`, {
          method: "POST",
          headers: headers(token),
          body: JSON.stringify(body),
          signal: AbortSignal.timeout(TIMEOUT),
        });

        if (!res.ok) {
          const text = await res.text();
          errors.push(`Notion search error ${res.status}: ${text}`);
          break;
        }

        const json = (await res.json()) as NotionSearchResponse;

        for (const page of json.results) {
          // Fetch blocks for each page
          let blocks: Array<Record<string, unknown>> = [];
          try {
            const blocksRes = await fetch(`${NOTION_API}/blocks/${page.id}/children?page_size=100`, {
              headers: headers(token),
              signal: AbortSignal.timeout(TIMEOUT),
            });

            if (blocksRes.ok) {
              const blocksJson = (await blocksRes.json()) as NotionBlocksResponse;
              blocks = blocksJson.results;
            }
          } catch (err) {
            errors.push(`Failed to fetch blocks for page ${page.id}: ${err instanceof Error ? err.message : "Unknown"}`);
          }

          data.push({
            data_type: "page",
            raw_data: {
              id: page.id,
              url: page.url,
              properties: page.properties,
              created_time: page.created_time,
              last_edited_time: page.last_edited_time,
              parent: page.parent,
              blocks,
            },
          });
        }

        hasMore = json.has_more;
        cursor = json.next_cursor;
      }
    } catch (err) {
      errors.push(`Notion sync error: ${err instanceof Error ? err.message : "Unknown"}`);
    }

    // Notion feeds context, not metrics
    return {
      success: errors.length === 0,
      data,
      metrics: [],
      count: data.length,
      errors,
    };
  },
};
