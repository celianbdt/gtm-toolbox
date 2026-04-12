import type { IntegrationConnector, SyncResult } from "../types";

const PIPEDRIVE_API = "https://api.pipedrive.com/v1";
const TIMEOUT = 15_000;

type PipedriveResponse<T> = {
  success: boolean;
  data: T[] | null;
  additional_data?: {
    pagination?: { more_items_in_collection: boolean; next_start: number };
  };
};

function apiUrl(path: string, token: string, params?: Record<string, string>): string {
  const url = new URL(`${PIPEDRIVE_API}${path}`);
  url.searchParams.set("api_token", token);
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

async function fetchAllPages<T>(
  path: string,
  token: string,
  params: Record<string, string>,
  maxRecords = 100
): Promise<{ results: T[]; errors: string[] }> {
  const allResults: T[] = [];
  const errors: string[] = [];
  let start = 0;

  while (allResults.length < maxRecords) {
    const batchSize = Math.min(100, maxRecords - allResults.length);
    const url = apiUrl(path, token, {
      ...params,
      limit: String(batchSize),
      start: String(start),
    });

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) });

      if (!res.ok) {
        const body = await res.text();
        errors.push(`Pipedrive API ${res.status}: ${body}`);
        break;
      }

      const json = (await res.json()) as PipedriveResponse<T>;

      if (!json.success || !json.data) break;

      allResults.push(...json.data);

      const pagination = json.additional_data?.pagination;
      if (!pagination?.more_items_in_collection) break;
      start = pagination.next_start;
    } catch (err) {
      errors.push(`Pipedrive fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
      break;
    }
  }

  return { results: allResults, errors };
}

export const pipedriveIntegrationConnector: IntegrationConnector = {
  provider: "pipedrive",
  label: "Pipedrive",
  description: "Deals pipeline, activities",
  icon: "Target",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = credentials.api_token as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(apiUrl("/users/me", token), {
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (!res.ok) return false;
      const json = (await res.json()) as { success: boolean };
      return json.success === true;
    } catch {
      return false;
    }
  },

  async sync(credentials: Record<string, unknown>, _config: Record<string, unknown>): Promise<SyncResult> {
    const token = credentials.api_token as string;
    if (!token) {
      return { success: false, data: [], metrics: [], count: 0, errors: ["No api_token provided"] };
    }

    const data: SyncResult["data"] = [];
    const metrics: SyncResult["metrics"] = [];
    const errors: string[] = [];

    // ── Deals ──
    const deals = await fetchAllPages<{
      id: number;
      title: string;
      value: number;
      currency: string;
      stage_id: number;
      status: string;
      add_time: string;
    }>("/deals", token, { status: "all_not_deleted" });
    errors.push(...deals.errors);

    let dealsCount = 0;
    let pipelineValue = 0;
    let dealsWon = 0;

    for (const deal of deals.results) {
      data.push({ data_type: "deal", raw_data: deal as unknown as Record<string, unknown> });
      dealsCount++;
      pipelineValue += deal.value || 0;
      if (deal.status === "won") {
        dealsWon++;
      }
    }

    metrics.push(
      { metric_name: "deals_count", metric_value: dealsCount },
      { metric_name: "pipeline_value", metric_value: pipelineValue },
      { metric_name: "deals_won", metric_value: dealsWon }
    );

    // ── Activities ──
    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);
    const weekStartStr = weekStart.toISOString().split("T")[0];

    const activities = await fetchAllPages<{
      id: number;
      type: string;
      done: boolean;
      due_date: string;
      subject: string;
    }>("/activities", token, { done: "1", start_date: weekStartStr });
    errors.push(...activities.errors);

    let activitiesCount = 0;

    for (const activity of activities.results) {
      data.push({ data_type: "activity", raw_data: activity as unknown as Record<string, unknown> });
      activitiesCount++;
    }

    metrics.push({ metric_name: "activities_count", metric_value: activitiesCount });

    // ── Leads ──
    const leads = await fetchAllPages<{
      id: string;
      title: string;
      owner_id: number;
      source_name: string;
    }>("/leads", token, {});
    errors.push(...leads.errors);

    let leadsCount = 0;

    for (const lead of leads.results) {
      data.push({ data_type: "lead", raw_data: lead as unknown as Record<string, unknown> });
      leadsCount++;
    }

    metrics.push({ metric_name: "leads_count", metric_value: leadsCount });

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: data.length,
      errors,
    };
  },
};
