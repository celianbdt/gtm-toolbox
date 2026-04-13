import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const CLEARBIT_API = "https://company.clearbit.com/v2/companies/find";

type ClearbitCompanyResponse = {
  name?: string;
  description?: string;
  category?: { industry?: string };
  metrics?: {
    employees?: number;
    estimatedAnnualRevenue?: string;
    raised?: string;
  };
  tech?: string[];
  logo?: string;
  geo?: { city?: string; country?: string };
  foundedYear?: number;
};

const clearbitConnector: EnricherConnector = {
  provider: "clearbit",
  supportedFields: [
    "company_name",
    "company_description",
    "industry",
    "employee_count",
    "revenue_range",
    "tech_stack",
    "logo_url",
    "location",
    "founded_year",
    "funding_total",
  ],
  estimatedCostPerCall: 0.02,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const url = `${CLEARBIT_API}?domain=${encodeURIComponent(request.domain)}`;
    const res = await enrichFetch<ClearbitCompanyResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok && res.data) {
      const c = res.data;
      creditsUsed++;

      if (c.name && request.fields.includes("company_name")) {
        data.company_name = c.name;
        confidence.company_name = 0.95;
      }
      if (c.description && request.fields.includes("company_description")) {
        data.company_description = c.description;
        confidence.company_description = 0.9;
      }
      if (c.category?.industry && request.fields.includes("industry")) {
        data.industry = c.category.industry;
        confidence.industry = 0.88;
      }
      if (c.metrics?.employees && request.fields.includes("employee_count")) {
        data.employee_count = c.metrics.employees;
        confidence.employee_count = 0.8;
      }
      if (c.metrics?.estimatedAnnualRevenue && request.fields.includes("revenue_range")) {
        data.revenue_range = c.metrics.estimatedAnnualRevenue;
        confidence.revenue_range = 0.7;
      }
      if (c.tech && c.tech.length > 0 && request.fields.includes("tech_stack")) {
        data.tech_stack = c.tech;
        confidence.tech_stack = 0.85;
      }
      if (c.logo && request.fields.includes("logo_url")) {
        data.logo_url = c.logo;
        confidence.logo_url = 0.95;
      }
      if (c.geo?.city && request.fields.includes("location")) {
        data.location = c.geo.country
          ? `${c.geo.city}, ${c.geo.country}`
          : c.geo.city;
        confidence.location = 0.9;
      }
      if (c.foundedYear && request.fields.includes("founded_year")) {
        data.founded_year = c.foundedYear;
        confidence.founded_year = 0.9;
      }
      if (c.metrics?.raised && request.fields.includes("funding_total")) {
        data.funding_total = c.metrics.raised;
        confidence.funding_total = 0.75;
      }
    }

    return {
      provider: "clearbit",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default clearbitConnector;
