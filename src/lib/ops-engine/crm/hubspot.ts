import type {
  CrmConnector,
  CrmConnectionConfig,
  CrmImportResult,
  CrmRecord,
} from "./types";

const HUBSPOT_API = "https://api.hubapi.com";

const CONTACT_PROPERTIES = [
  "email",
  "firstname",
  "lastname",
  "phone",
  "jobtitle",
  "company",
  "hs_lead_status",
].join(",");

const COMPANY_PROPERTIES = [
  "domain",
  "name",
  "industry",
  "numberofemployees",
  "annualrevenue",
  "city",
  "country",
].join(",");

function headers(config: CrmConnectionConfig): HeadersInit {
  return {
    Authorization: `Bearer ${config.access_token}`,
    "Content-Type": "application/json",
  };
}

function extractDomainFromEmail(email?: string): string | null {
  if (!email || !email.includes("@")) return null;
  return email.split("@")[1] ?? null;
}

// ── Mock data for development ──

const MOCK_CONTACTS: CrmRecord[] = [
  {
    domain: "acme.com",
    company_name: "Acme Corp",
    data: {
      email: "john.doe@acme.com",
      firstname: "John",
      lastname: "Doe",
      phone: "+33 6 12 34 56 78",
      jobtitle: "VP Sales",
      company: "Acme Corp",
      hs_lead_status: "OPEN_DEAL",
    },
  },
  {
    domain: "globex.io",
    company_name: "Globex Industries",
    data: {
      email: "sarah.connor@globex.io",
      firstname: "Sarah",
      lastname: "Connor",
      phone: "+1 555 0199",
      jobtitle: "CTO",
      company: "Globex Industries",
      hs_lead_status: "IN_PROGRESS",
    },
  },
  {
    domain: "initech.co",
    company_name: "Initech",
    data: {
      email: "peter.gibbons@initech.co",
      firstname: "Peter",
      lastname: "Gibbons",
      phone: "+1 555 0123",
      jobtitle: "Software Engineer",
      company: "Initech",
      hs_lead_status: "NEW",
    },
  },
];

const MOCK_COMPANIES: CrmRecord[] = [
  {
    domain: "acme.com",
    company_name: "Acme Corp",
    data: {
      domain: "acme.com",
      name: "Acme Corp",
      industry: "Technology",
      numberofemployees: "250",
      annualrevenue: "15000000",
      city: "Paris",
      country: "France",
    },
  },
  {
    domain: "globex.io",
    company_name: "Globex Industries",
    data: {
      domain: "globex.io",
      name: "Globex Industries",
      industry: "Manufacturing",
      numberofemployees: "1200",
      annualrevenue: "85000000",
      city: "San Francisco",
      country: "United States",
    },
  },
  {
    domain: "initech.co",
    company_name: "Initech",
    data: {
      domain: "initech.co",
      name: "Initech",
      industry: "Software",
      numberofemployees: "45",
      annualrevenue: "3000000",
      city: "London",
      country: "United Kingdom",
    },
  },
];

// ── Connector ──

export const hubspotConnector: CrmConnector = {
  provider: "hubspot",

  async testConnection(config: CrmConnectionConfig): Promise<boolean> {
    if (!config.access_token) return false;

    try {
      const res = await fetch(
        `${HUBSPOT_API}/crm/v3/objects/contacts?limit=1`,
        { headers: headers(config) }
      );
      return res.ok;
    } catch {
      // If fetch fails (e.g. no real token in dev), return false
      return false;
    }
  },

  async importContacts(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const errors: string[] = [];

    // Attempt real API call
    if (config.access_token) {
      try {
        const allRecords: CrmRecord[] = [];
        let after: string | undefined = undefined;
        let fetched = 0;

        while (fetched < maxRecords) {
          const batchSize = Math.min(100, maxRecords - fetched);
          const url = new URL(`${HUBSPOT_API}/crm/v3/objects/contacts`);
          url.searchParams.set("limit", String(batchSize));
          url.searchParams.set("properties", CONTACT_PROPERTIES);
          if (after) url.searchParams.set("after", after);

          const res = await fetch(url.toString(), {
            headers: headers(config),
          });

          if (!res.ok) {
            const body = await res.text();
            errors.push(`HubSpot API error ${res.status}: ${body}`);
            break;
          }

          const json = (await res.json()) as {
            results: Array<{ properties: Record<string, string> }>;
            paging?: { next?: { after: string } };
          };

          for (const contact of json.results) {
            const props = contact.properties;
            allRecords.push({
              domain: extractDomainFromEmail(props.email),
              company_name: props.company || null,
              data: props,
            });
          }

          fetched += json.results.length;
          after = json.paging?.next?.after;
          if (!after) break;
        }

        if (allRecords.length > 0) {
          return {
            provider: "hubspot",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `HubSpot fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    // Fallback to mock data in development
    return {
      provider: "hubspot",
      records: MOCK_CONTACTS.slice(0, maxRecords),
      total_fetched: MOCK_CONTACTS.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid HubSpot token provided"],
    };
  },

  async importCompanies(
    config: CrmConnectionConfig,
    options?: { limit?: number; offset?: number }
  ): Promise<CrmImportResult> {
    const maxRecords = options?.limit ?? 100;
    const errors: string[] = [];

    if (config.access_token) {
      try {
        const allRecords: CrmRecord[] = [];
        let after: string | undefined = undefined;
        let fetched = 0;

        while (fetched < maxRecords) {
          const batchSize = Math.min(100, maxRecords - fetched);
          const url = new URL(`${HUBSPOT_API}/crm/v3/objects/companies`);
          url.searchParams.set("limit", String(batchSize));
          url.searchParams.set("properties", COMPANY_PROPERTIES);
          if (after) url.searchParams.set("after", after);

          const res = await fetch(url.toString(), {
            headers: headers(config),
          });

          if (!res.ok) {
            const body = await res.text();
            errors.push(`HubSpot API error ${res.status}: ${body}`);
            break;
          }

          const json = (await res.json()) as {
            results: Array<{ properties: Record<string, string> }>;
            paging?: { next?: { after: string } };
          };

          for (const company of json.results) {
            const props = company.properties;
            allRecords.push({
              domain: props.domain || null,
              company_name: props.name || null,
              data: props,
            });
          }

          fetched += json.results.length;
          after = json.paging?.next?.after;
          if (!after) break;
        }

        if (allRecords.length > 0) {
          return {
            provider: "hubspot",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `HubSpot fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "hubspot",
      records: MOCK_COMPANIES.slice(0, maxRecords),
      total_fetched: MOCK_COMPANIES.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid HubSpot token provided"],
    };
  },
};
