import type {
  CrmConnector,
  CrmConnectionConfig,
  CrmImportResult,
  CrmRecord,
} from "./types";

const PIPEDRIVE_API = "https://api.pipedrive.com/v1";

function apiUrl(
  path: string,
  config: CrmConnectionConfig,
  params?: Record<string, string>
): string {
  const url = new URL(`${PIPEDRIVE_API}${path}`);
  url.searchParams.set("api_token", config.api_key ?? "");
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v);
    }
  }
  return url.toString();
}

// ── Mock data ──

const MOCK_CONTACTS: CrmRecord[] = [
  {
    domain: "megacorp.de",
    company_name: "MegaCorp GmbH",
    data: {
      name: "Hans Mueller",
      email: "hans@megacorp.de",
      phone: "+49 30 1234 5678",
      org_name: "MegaCorp GmbH",
      job_title: "Sales Director",
      owner_name: "Admin User",
    },
  },
  {
    domain: "startup.fr",
    company_name: "Startup SAS",
    data: {
      name: "Claire Fontaine",
      email: "claire@startup.fr",
      phone: "+33 1 23 45 67 89",
      org_name: "Startup SAS",
      job_title: "COO",
      owner_name: "Admin User",
    },
  },
  {
    domain: "nordictech.se",
    company_name: "NordicTech AB",
    data: {
      name: "Erik Johansson",
      email: "erik@nordictech.se",
      phone: "+46 8 123 456 78",
      org_name: "NordicTech AB",
      job_title: "Engineering Lead",
      owner_name: "Admin User",
    },
  },
];

const MOCK_COMPANIES: CrmRecord[] = [
  {
    domain: "megacorp.de",
    company_name: "MegaCorp GmbH",
    data: {
      name: "MegaCorp GmbH",
      address: "Berlin, Germany",
      people_count: 15,
      open_deals_count: 3,
      won_deals_count: 8,
      cc_email: "megacorp@pipedrivemail.com",
    },
  },
  {
    domain: "startup.fr",
    company_name: "Startup SAS",
    data: {
      name: "Startup SAS",
      address: "Paris, France",
      people_count: 5,
      open_deals_count: 2,
      won_deals_count: 1,
      cc_email: "startup@pipedrivemail.com",
    },
  },
  {
    domain: "nordictech.se",
    company_name: "NordicTech AB",
    data: {
      name: "NordicTech AB",
      address: "Stockholm, Sweden",
      people_count: 8,
      open_deals_count: 1,
      won_deals_count: 12,
      cc_email: "nordictech@pipedrivemail.com",
    },
  },
];

// ── Connector ──

export const pipedriveConnector: CrmConnector = {
  provider: "pipedrive",

  async testConnection(config: CrmConnectionConfig): Promise<boolean> {
    if (!config.api_key) return false;

    try {
      const res = await fetch(apiUrl("/users/me", config));
      if (!res.ok) return false;
      const json = (await res.json()) as { success: boolean };
      return json.success === true;
    } catch {
      return false;
    }
  },

  async importContacts(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const errors: string[] = [];

    if (config.api_key) {
      try {
        const allRecords: CrmRecord[] = [];
        let start = options?.offset ?? 0;

        while (allRecords.length < maxRecords) {
          const batchSize = Math.min(100, maxRecords - allRecords.length);
          const res = await fetch(
            apiUrl("/persons", config, {
              limit: String(batchSize),
              start: String(start),
            })
          );

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Pipedrive API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            success: boolean;
            data: Array<{
              name: string;
              email: Array<{ value: string }>;
              phone: Array<{ value: string }>;
              org_name: string;
              job_title: string;
              owner_name: string;
            }> | null;
            additional_data?: {
              pagination?: { more_items_in_collection: boolean; next_start: number };
            };
          };

          if (!json.success || !json.data) break;

          for (const person of json.data) {
            const email = person.email?.[0]?.value ?? null;
            const domain =
              email && email.includes("@") ? email.split("@")[1] : null;

            allRecords.push({
              domain,
              company_name: person.org_name || null,
              data: {
                name: person.name,
                email,
                phone: person.phone?.[0]?.value ?? null,
                org_name: person.org_name,
                job_title: person.job_title,
                owner_name: person.owner_name,
              },
            });
          }

          const pagination = json.additional_data?.pagination;
          if (!pagination?.more_items_in_collection) break;
          start = pagination.next_start;
        }

        if (allRecords.length > 0) {
          return {
            provider: "pipedrive",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Pipedrive fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "pipedrive",
      records: MOCK_CONTACTS.slice(0, maxRecords),
      total_fetched: MOCK_CONTACTS.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Pipedrive API key provided"],
    };
  },

  async importCompanies(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const errors: string[] = [];

    if (config.api_key) {
      try {
        const allRecords: CrmRecord[] = [];
        let start = options?.offset ?? 0;

        while (allRecords.length < maxRecords) {
          const batchSize = Math.min(100, maxRecords - allRecords.length);
          const res = await fetch(
            apiUrl("/organizations", config, {
              limit: String(batchSize),
              start: String(start),
            })
          );

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Pipedrive API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            success: boolean;
            data: Array<{
              name: string;
              address: string;
              people_count: number;
              open_deals_count: number;
              won_deals_count: number;
              cc_email: string;
            }> | null;
            additional_data?: {
              pagination?: { more_items_in_collection: boolean; next_start: number };
            };
          };

          if (!json.success || !json.data) break;

          for (const org of json.data) {
            allRecords.push({
              domain: null, // Pipedrive doesn't have a native domain field on orgs
              company_name: org.name || null,
              data: {
                name: org.name,
                address: org.address,
                people_count: org.people_count,
                open_deals_count: org.open_deals_count,
                won_deals_count: org.won_deals_count,
                cc_email: org.cc_email,
              },
            });
          }

          const pagination = json.additional_data?.pagination;
          if (!pagination?.more_items_in_collection) break;
          start = pagination.next_start;
        }

        if (allRecords.length > 0) {
          return {
            provider: "pipedrive",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Pipedrive fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "pipedrive",
      records: MOCK_COMPANIES.slice(0, maxRecords),
      total_fetched: MOCK_COMPANIES.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Pipedrive API key provided"],
    };
  },
};
