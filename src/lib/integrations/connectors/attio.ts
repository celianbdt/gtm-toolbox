import type { IntegrationConnector, SyncResult } from "../types";

const ATTIO_API = "https://api.attio.com/v2";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

type AttioListResponse = {
  data: Array<Record<string, unknown>>;
  next_cursor?: string | null;
};

async function fetchRecords(
  objectSlug: string,
  token: string,
  maxRecords = 100
): Promise<{ records: Array<Record<string, unknown>>; errors: string[] }> {
  const allRecords: Array<Record<string, unknown>> = [];
  const errors: string[] = [];
  let cursor: string | undefined;

  while (allRecords.length < maxRecords) {
    const limit = Math.min(100, maxRecords - allRecords.length);
    const url = new URL(`${ATTIO_API}/objects/${objectSlug}/records`);
    url.searchParams.set("limit", String(limit));
    if (cursor) url.searchParams.set("offset", cursor);

    try {
      const res = await fetch(url.toString(), {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        const body = await res.text();
        errors.push(`Attio API ${res.status}: ${body}`);
        break;
      }

      const json = (await res.json()) as AttioListResponse;
      allRecords.push(...json.data);

      if (!json.next_cursor || json.data.length === 0) break;
      cursor = json.next_cursor;
    } catch (err) {
      errors.push(`Attio fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
      break;
    }
  }

  return { records: allRecords, errors };
}

async function fetchNotes(
  token: string,
  maxRecords = 50
): Promise<{ notes: Array<Record<string, unknown>>; errors: string[] }> {
  const errors: string[] = [];
  try {
    const url = new URL(`${ATTIO_API}/notes`);
    url.searchParams.set("limit", String(maxRecords));

    const res = await fetch(url.toString(), {
      headers: headers(token),
      signal: AbortSignal.timeout(TIMEOUT),
    });

    if (!res.ok) {
      const body = await res.text();
      errors.push(`Attio notes ${res.status}: ${body}`);
      return { notes: [], errors };
    }

    const json = (await res.json()) as AttioListResponse;
    return { notes: json.data, errors };
  } catch (err) {
    errors.push(`Attio notes error: ${err instanceof Error ? err.message : "Unknown"}`);
    return { notes: [], errors };
  }
}

export const attioIntegrationConnector: IntegrationConnector = {
  provider: "attio",
  label: "Attio",
  description: "Records, notes, activity",
  icon: "Database",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = credentials.access_token as string | undefined;
    if (!token) return false;

    try {
      // Test with a lightweight call to list objects
      const res = await fetch(`${ATTIO_API}/objects/people/records?limit=1`, {
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
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // ── Companies ──
    const companies = await fetchRecords("companies", token);
    errors.push(...companies.errors);
    for (const record of companies.records) {
      data.push({ data_type: "company", raw_data: record });
    }
    metrics.push({ metric_name: "companies_count", metric_value: companies.records.length });

    // ── People ──
    const people = await fetchRecords("people", token);
    errors.push(...people.errors);
    for (const record of people.records) {
      data.push({ data_type: "person", raw_data: record });
    }
    metrics.push({ metric_name: "contacts_count", metric_value: people.records.length });

    // ── Deals ──
    const deals = await fetchRecords("deals", token);
    errors.push(...deals.errors);
    let dealsCount = 0;
    for (const record of deals.records) {
      data.push({ data_type: "deal", raw_data: record });
      dealsCount++;
    }
    metrics.push({ metric_name: "deals_count", metric_value: dealsCount });

    // ── Notes ──
    const notes = await fetchNotes(token);
    errors.push(...notes.errors);
    for (const note of notes.notes) {
      data.push({ data_type: "note", raw_data: note });
    }
    metrics.push({ metric_name: "notes_count", metric_value: notes.notes.length });

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: data.length,
      errors,
    };
  },
};
