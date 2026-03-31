import type {
  CrmConnector,
  CrmConnectionConfig,
  CrmImportResult,
  CrmRecord,
} from "./types";

const ATTIO_API = "https://api.attio.com/v2";

function headers(config: CrmConnectionConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.access_token}`,
    "Content-Type": "application/json",
  };
}

// ── Mock data ──

const MOCK_CONTACTS: CrmRecord[] = [
  {
    domain: "techstart.io",
    company_name: "TechStart",
    data: {
      name: "Marie Dupont",
      email: "marie@techstart.io",
      title: "Head of Growth",
      phone: "+33 6 98 76 54 32",
      company: "TechStart",
    },
  },
  {
    domain: "finova.com",
    company_name: "Finova",
    data: {
      name: "Alex Martin",
      email: "alex.martin@finova.com",
      title: "CEO",
      phone: "+44 20 7946 0958",
      company: "Finova",
    },
  },
  {
    domain: "dataviz.co",
    company_name: "DataViz",
    data: {
      name: "Lucas Bernard",
      email: "lucas@dataviz.co",
      title: "Product Manager",
      phone: "+1 415 555 0188",
      company: "DataViz",
    },
  },
];

const MOCK_COMPANIES: CrmRecord[] = [
  {
    domain: "techstart.io",
    company_name: "TechStart",
    data: {
      name: "TechStart",
      domain: "techstart.io",
      industry: "SaaS",
      employee_count: 80,
      location: "Paris, France",
    },
  },
  {
    domain: "finova.com",
    company_name: "Finova",
    data: {
      name: "Finova",
      domain: "finova.com",
      industry: "FinTech",
      employee_count: 300,
      location: "London, UK",
    },
  },
  {
    domain: "dataviz.co",
    company_name: "DataViz",
    data: {
      name: "DataViz",
      domain: "dataviz.co",
      industry: "Analytics",
      employee_count: 25,
      location: "San Francisco, USA",
    },
  },
];

// ── Connector ──

export const attioConnector: CrmConnector = {
  provider: "attio",

  async testConnection(config: CrmConnectionConfig): Promise<boolean> {
    if (!config.access_token) return false;

    try {
      const res = await fetch(`${ATTIO_API}/self`, {
        headers: headers(config),
      });
      return res.ok;
    } catch {
      return false;
    }
  },

  async importContacts(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const errors: string[] = [];

    if (config.access_token) {
      try {
        const allRecords: CrmRecord[] = [];
        let pageToken: string | undefined = undefined;
        let fetched = 0;

        while (fetched < maxRecords) {
          const body: Record<string, unknown> = {
            limit: Math.min(25, maxRecords - fetched),
            offset: offset + fetched,
          };
          if (pageToken) body.page_token = pageToken;

          const res = await fetch(
            `${ATTIO_API}/objects/people/records/query`,
            {
              method: "POST",
              headers: headers(config),
              body: JSON.stringify(body),
            }
          );

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Attio API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            data: Array<{
              values: Record<
                string,
                Array<{ value?: string; email_address?: string }>
              >;
            }>;
            next_page_token?: string;
          };

          for (const record of json.data) {
            const email =
              record.values?.email_addresses?.[0]?.email_address ?? null;
            const name = record.values?.name?.[0]?.value ?? null;
            const domain =
              email && email.includes("@") ? email.split("@")[1] : null;

            allRecords.push({
              domain,
              company_name: null,
              data: {
                name,
                email,
                ...Object.fromEntries(
                  Object.entries(record.values).map(([k, v]) => [
                    k,
                    v?.[0]?.value ?? null,
                  ])
                ),
              },
            });
          }

          fetched += json.data.length;
          pageToken = json.next_page_token;
          if (!pageToken || json.data.length === 0) break;
        }

        if (allRecords.length > 0) {
          return {
            provider: "attio",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Attio fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "attio",
      records: MOCK_CONTACTS.slice(0, maxRecords),
      total_fetched: MOCK_CONTACTS.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Attio token provided"],
    };
  },

  async importCompanies(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const offset = options?.offset ?? 0;
    const errors: string[] = [];

    if (config.access_token) {
      try {
        const allRecords: CrmRecord[] = [];
        let pageToken: string | undefined = undefined;
        let fetched = 0;

        while (fetched < maxRecords) {
          const body: Record<string, unknown> = {
            limit: Math.min(25, maxRecords - fetched),
            offset: offset + fetched,
          };
          if (pageToken) body.page_token = pageToken;

          const res = await fetch(
            `${ATTIO_API}/objects/companies/records/query`,
            {
              method: "POST",
              headers: headers(config),
              body: JSON.stringify(body),
            }
          );

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Attio API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            data: Array<{
              values: Record<
                string,
                Array<{ value?: string; domain?: string }>
              >;
            }>;
            next_page_token?: string;
          };

          for (const record of json.data) {
            const name = record.values?.name?.[0]?.value ?? null;
            const domain = record.values?.domains?.[0]?.domain ?? null;

            allRecords.push({
              domain,
              company_name: name,
              data: Object.fromEntries(
                Object.entries(record.values).map(([k, v]) => [
                  k,
                  v?.[0]?.value ?? v?.[0]?.domain ?? null,
                ])
              ),
            });
          }

          fetched += json.data.length;
          pageToken = json.next_page_token;
          if (!pageToken || json.data.length === 0) break;
        }

        if (allRecords.length > 0) {
          return {
            provider: "attio",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Attio fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "attio",
      records: MOCK_COMPANIES.slice(0, maxRecords),
      total_fetched: MOCK_COMPANIES.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Attio token provided"],
    };
  },
};
