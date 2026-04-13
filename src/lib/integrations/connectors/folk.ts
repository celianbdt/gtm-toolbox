import type { IntegrationConnector, SyncResult } from "../types";

const FOLK_API = "https://api.folk.app/v1";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

type FolkListResponse = {
  data: Array<Record<string, unknown>>;
  pagination?: {
    hasMore?: boolean;
    nextCursor?: string;
  };
};

async function fetchAll(
  endpoint: string,
  token: string,
  maxRecords = 100
): Promise<{ items: Array<Record<string, unknown>>; errors: string[] }> {
  const allItems: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  let cursor: string | undefined;

  while (allItems.length < maxRecords) {
    const url = new URL(`${FOLK_API}${endpoint}`);
    url.searchParams.set("limit", String(Math.min(100, maxRecords - allItems.length)));
    if (cursor) url.searchParams.set("cursor", cursor);

    try {
      const res = await fetch(url.toString(), {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        const body = await res.text();
        errors.push(`Folk API ${res.status}: ${body}`);
        break;
      }

      const json = (await res.json()) as FolkListResponse;
      const items = json.data ?? [];
      allItems.push(...items);

      if (!json.pagination?.hasMore || items.length === 0) break;
      cursor = json.pagination.nextCursor;
    } catch (err) {
      errors.push(`Folk fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
      break;
    }
  }

  return { items: allItems, errors };
}

export const folkIntegrationConnector: IntegrationConnector = {
  provider: "folk",
  label: "Folk",
  description: "Contacts, companies",
  icon: "Users",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = (credentials.access_token ?? credentials.api_key) as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(`${FOLK_API}/groups`, {
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

    // ── People ──
    const people = await fetchAll("/people", token);
    errors.push(...people.errors);
    for (const item of people.items) {
      data.push({ data_type: "person", raw_data: item });
    }
    metrics.push({ metric_name: "contacts_count", metric_value: people.items.length });

    // ── Companies ──
    const companies = await fetchAll("/companies", token);
    errors.push(...companies.errors);
    for (const item of companies.items) {
      data.push({ data_type: "company", raw_data: item });
    }
    metrics.push({ metric_name: "companies_count", metric_value: companies.items.length });

    // ── Deals ──
    const deals = await fetchAll("/deals", token);
    errors.push(...deals.errors);
    for (const item of deals.items) {
      data.push({ data_type: "deal", raw_data: item });
    }
    metrics.push({ metric_name: "deals_count", metric_value: deals.items.length });

    // ── Groups ──
    const groups = await fetchAll("/groups", token);
    errors.push(...groups.errors);
    for (const item of groups.items) {
      data.push({ data_type: "group", raw_data: item });
    }
    metrics.push({ metric_name: "groups_count", metric_value: groups.items.length });

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: data.length,
      errors,
    };
  },
};
