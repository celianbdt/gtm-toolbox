import type { IntegrationConnector, SyncResult } from "../types";

const HUBSPOT_API = "https://api.hubapi.com";
const TIMEOUT = 15_000;

function headers(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

type HubSpotResponse<T = Record<string, string>> = {
  results: Array<{ id: string; properties: T }>;
  paging?: { next?: { after: string } };
};

async function fetchAllPages<T = Record<string, string>>(
  endpoint: string,
  token: string,
  properties: string[],
  maxRecords = 100
): Promise<{ results: Array<{ id: string; properties: T }>; errors: string[] }> {
  const allResults: Array<{ id: string; properties: T }> = [];
  const errors: string[] = [];
  let after: string | undefined;
  let fetched = 0;

  while (fetched < maxRecords) {
    const batchSize = Math.min(100, maxRecords - fetched);
    const url = new URL(endpoint);
    url.searchParams.set("limit", String(batchSize));
    url.searchParams.set("properties", properties.join(","));
    if (after) url.searchParams.set("after", after);

    try {
      const res = await fetch(url.toString(), {
        headers: headers(token),
        signal: AbortSignal.timeout(TIMEOUT),
      });

      if (!res.ok) {
        const body = await res.text();
        errors.push(`HubSpot API ${res.status}: ${body}`);
        break;
      }

      const json = (await res.json()) as HubSpotResponse<T>;
      allResults.push(...json.results);
      fetched += json.results.length;
      after = json.paging?.next?.after;
      if (!after || json.results.length === 0) break;
    } catch (err) {
      errors.push(`HubSpot fetch error: ${err instanceof Error ? err.message : "Unknown"}`);
      break;
    }
  }

  return { results: allResults, errors };
}

export const hubspotIntegrationConnector: IntegrationConnector = {
  provider: "hubspot",
  label: "HubSpot",
  description: "Deals, contacts, email activity",
  icon: "Building2",

  async testConnection(credentials: Record<string, unknown>): Promise<boolean> {
    const token = credentials.access_token as string | undefined;
    if (!token) return false;

    try {
      const res = await fetch(`${HUBSPOT_API}/crm/v3/objects/contacts?limit=1`, {
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

    // ── Deals ──
    const deals = await fetchAllPages<{
      dealname: string;
      amount: string;
      dealstage: string;
      closedate: string;
      createdate: string;
    }>(
      `${HUBSPOT_API}/crm/v3/objects/deals`,
      token,
      ["dealname", "amount", "dealstage", "closedate", "createdate"]
    );
    errors.push(...deals.errors);

    let dealsCount = 0;
    let dealsValue = 0;
    let dealsWon = 0;

    for (const deal of deals.results) {
      const props = deal.properties;
      data.push({ data_type: "deal", raw_data: props as unknown as Record<string, unknown> });
      dealsCount++;
      const amount = parseFloat(props.amount) || 0;
      dealsValue += amount;
      if (props.dealstage === "closedwon") {
        dealsWon++;
      }
    }

    metrics.push(
      { metric_name: "deals_count", metric_value: dealsCount },
      { metric_name: "deals_value", metric_value: dealsValue },
      { metric_name: "deals_won", metric_value: dealsWon }
    );

    // ── Contacts ──
    const contacts = await fetchAllPages<{ createdate: string }>(
      `${HUBSPOT_API}/crm/v3/objects/contacts`,
      token,
      ["createdate"]
    );
    errors.push(...contacts.errors);

    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    let contactsAdded = 0;

    for (const contact of contacts.results) {
      data.push({ data_type: "contact", raw_data: contact.properties as unknown as Record<string, unknown> });
      const created = new Date(contact.properties.createdate);
      if (created >= oneWeekAgo) {
        contactsAdded++;
      }
    }

    metrics.push({ metric_name: "contacts_added", metric_value: contactsAdded });

    // ── Emails ──
    const emails = await fetchAllPages<{ hs_email_direction: string; hs_email_status: string }>(
      `${HUBSPOT_API}/crm/v3/objects/emails`,
      token,
      ["hs_email_direction", "hs_email_status"]
    );
    errors.push(...emails.errors);

    let emailsSent = 0;

    for (const email of emails.results) {
      data.push({ data_type: "email", raw_data: email.properties as unknown as Record<string, unknown> });
      if (email.properties.hs_email_direction === "EMAIL") {
        emailsSent++;
      }
    }

    metrics.push({ metric_name: "emails_sent", metric_value: emailsSent });

    return {
      success: errors.length === 0,
      data,
      metrics,
      count: data.length,
      errors,
    };
  },
};
