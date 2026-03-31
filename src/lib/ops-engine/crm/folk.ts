import type {
  CrmConnector,
  CrmConnectionConfig,
  CrmImportResult,
  CrmRecord,
} from "./types";

const FOLK_API = "https://api.folk.app/v1";

function headers(config: CrmConnectionConfig): HeadersInit {
  return {
    "api-key": config.api_key ?? "",
    "Content-Type": "application/json",
  };
}

// ── Mock data ──

const MOCK_CONTACTS: CrmRecord[] = [
  {
    domain: "laforge.tech",
    company_name: "LaForge",
    data: {
      first_name: "Antoine",
      last_name: "Durand",
      email: "antoine@laforge.tech",
      phone: "+33 6 11 22 33 44",
      job_title: "Founder & CEO",
      company: "LaForge",
      tags: ["prospect", "tech"],
    },
  },
  {
    domain: "bloom.garden",
    company_name: "Bloom",
    data: {
      first_name: "Emilie",
      last_name: "Rousseau",
      email: "emilie@bloom.garden",
      phone: "+33 7 55 66 77 88",
      job_title: "Head of Partnerships",
      company: "Bloom",
      tags: ["partner", "d2c"],
    },
  },
  {
    domain: "hexa.vc",
    company_name: "Hexa",
    data: {
      first_name: "Thomas",
      last_name: "Petit",
      email: "thomas@hexa.vc",
      phone: "+33 6 99 88 77 66",
      job_title: "Investment Manager",
      company: "Hexa",
      tags: ["investor", "vc"],
    },
  },
];

const MOCK_COMPANIES: CrmRecord[] = [
  {
    domain: "laforge.tech",
    company_name: "LaForge",
    data: {
      name: "LaForge",
      domain: "laforge.tech",
      industry: "Developer Tools",
      size: "11-50",
      location: "Lyon, France",
    },
  },
  {
    domain: "bloom.garden",
    company_name: "Bloom",
    data: {
      name: "Bloom",
      domain: "bloom.garden",
      industry: "E-commerce",
      size: "51-200",
      location: "Bordeaux, France",
    },
  },
  {
    domain: "hexa.vc",
    company_name: "Hexa",
    data: {
      name: "Hexa",
      domain: "hexa.vc",
      industry: "Venture Capital",
      size: "11-50",
      location: "Paris, France",
    },
  },
];

// ── Connector ──

export const folkConnector: CrmConnector = {
  provider: "folk",

  async testConnection(config: CrmConnectionConfig): Promise<boolean> {
    if (!config.api_key) return false;

    try {
      const res = await fetch(`${FOLK_API}/groups`, {
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
    const errors: string[] = [];

    if (config.api_key) {
      try {
        const allRecords: CrmRecord[] = [];
        let page = 1;

        while (allRecords.length < maxRecords) {
          const url = new URL(`${FOLK_API}/contacts`);
          url.searchParams.set("page", String(page));
          url.searchParams.set(
            "per_page",
            String(Math.min(50, maxRecords - allRecords.length))
          );

          const res = await fetch(url.toString(), {
            headers: headers(config),
          });

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Folk API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            data: Array<{
              first_name: string;
              last_name: string;
              email: string;
              phone: string;
              job_title: string;
              company: { name: string } | null;
              tags: Array<{ name: string }>;
            }>;
            meta?: { current_page: number; last_page: number };
          };

          if (!json.data || json.data.length === 0) break;

          for (const contact of json.data) {
            const email = contact.email ?? null;
            const domain =
              email && email.includes("@") ? email.split("@")[1] : null;

            allRecords.push({
              domain,
              company_name: contact.company?.name || null,
              data: {
                first_name: contact.first_name,
                last_name: contact.last_name,
                email,
                phone: contact.phone,
                job_title: contact.job_title,
                company: contact.company?.name ?? null,
                tags: contact.tags?.map((t) => t.name) ?? [],
              },
            });
          }

          if (json.meta && json.meta.current_page >= json.meta.last_page)
            break;
          page++;
        }

        if (allRecords.length > 0) {
          return {
            provider: "folk",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Folk fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "folk",
      records: MOCK_CONTACTS.slice(0, maxRecords),
      total_fetched: MOCK_CONTACTS.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Folk API key provided"],
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
        let page = 1;

        while (allRecords.length < maxRecords) {
          const url = new URL(`${FOLK_API}/companies`);
          url.searchParams.set("page", String(page));
          url.searchParams.set(
            "per_page",
            String(Math.min(50, maxRecords - allRecords.length))
          );

          const res = await fetch(url.toString(), {
            headers: headers(config),
          });

          if (!res.ok) {
            const text = await res.text();
            errors.push(`Folk API error ${res.status}: ${text}`);
            break;
          }

          const json = (await res.json()) as {
            data: Array<{
              name: string;
              domain: string;
              industry: string;
              size: string;
              location: string;
            }>;
            meta?: { current_page: number; last_page: number };
          };

          if (!json.data || json.data.length === 0) break;

          for (const company of json.data) {
            allRecords.push({
              domain: company.domain || null,
              company_name: company.name || null,
              data: {
                name: company.name,
                domain: company.domain,
                industry: company.industry,
                size: company.size,
                location: company.location,
              },
            });
          }

          if (json.meta && json.meta.current_page >= json.meta.last_page)
            break;
          page++;
        }

        if (allRecords.length > 0) {
          return {
            provider: "folk",
            records: allRecords,
            total_fetched: allRecords.length,
            errors,
          };
        }
      } catch (err) {
        errors.push(
          `Folk fetch failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
      }
    }

    return {
      provider: "folk",
      records: MOCK_COMPANIES.slice(0, maxRecords),
      total_fetched: MOCK_COMPANIES.length,
      errors:
        errors.length > 0
          ? errors
          : ["Using mock data — no valid Folk API key provided"],
    };
  },
};
