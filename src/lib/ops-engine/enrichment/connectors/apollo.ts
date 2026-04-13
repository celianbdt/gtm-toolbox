import type { EnricherConnector, EnrichmentRequest, EnrichmentResult, EnrichmentField } from "../types";
import { enrichFetch } from "../http";

const APOLLO_API = "https://api.apollo.io/api/v1";

type ApolloPersonResponse = {
  person?: {
    email?: string;
    phone_numbers?: { raw_number?: string }[];
    linkedin_url?: string;
    title?: string;
    seniority?: string;
    first_name?: string;
    last_name?: string;
    organization?: {
      name?: string;
      industry?: string;
      estimated_num_employees?: number;
    };
  };
};

type ApolloOrgResponse = {
  organization?: {
    name?: string;
    short_description?: string;
    industry?: string;
    estimated_num_employees?: number;
    annual_revenue_printed?: string;
    linkedin_url?: string;
    logo_url?: string;
    city?: string;
    country?: string;
    founded_year?: number;
    total_funding_printed?: string;
    technology_names?: string[];
  };
};

const apolloConnector: EnricherConnector = {
  provider: "apollo",
  supportedFields: [
    "email", "phone", "linkedin_url", "title", "seniority",
    "first_name", "last_name", "company_name", "company_description",
    "industry", "employee_count", "revenue_range", "tech_stack",
    "logo_url", "location", "founded_year", "funding_total",
  ],
  estimatedCostPerCall: 0.01,

  async enrich(request: EnrichmentRequest, apiKey: string): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const personFields: EnrichmentField[] = ["email", "phone", "linkedin_url", "title", "seniority", "first_name", "last_name"];
    const needsPerson = request.fields.some((f) => personFields.includes(f));
    const needsOrg = request.fields.some((f) => !personFields.includes(f));

    // People/match endpoint
    if (needsPerson) {
      const body: Record<string, string> = { api_key: apiKey, domain: request.domain };
      if (request.name) {
        const parts = request.name.split(" ");
        body.first_name = parts[0];
        if (parts.length > 1) body.last_name = parts.slice(1).join(" ");
      }
      if (request.email) body.email = request.email;

      const res = await enrichFetch<ApolloPersonResponse>(`${APOLLO_API}/people/match`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.ok && res.data?.person) {
        const p = res.data.person;
        creditsUsed++;

        if (p.email && request.fields.includes("email")) { data.email = p.email; confidence.email = 0.9; }
        if (p.phone_numbers?.[0]?.raw_number && request.fields.includes("phone")) { data.phone = p.phone_numbers[0].raw_number; confidence.phone = 0.8; }
        if (p.linkedin_url && request.fields.includes("linkedin_url")) { data.linkedin_url = p.linkedin_url; confidence.linkedin_url = 0.95; }
        if (p.title && request.fields.includes("title")) { data.title = p.title; confidence.title = 0.9; }
        if (p.seniority && request.fields.includes("seniority")) { data.seniority = p.seniority; confidence.seniority = 0.85; }
        if (p.first_name && request.fields.includes("first_name")) { data.first_name = p.first_name; confidence.first_name = 0.95; }
        if (p.last_name && request.fields.includes("last_name")) { data.last_name = p.last_name; confidence.last_name = 0.95; }

        // Org data from person response
        if (p.organization) {
          const o = p.organization;
          if (o.name && request.fields.includes("company_name")) { data.company_name = o.name; confidence.company_name = 0.95; }
          if (o.industry && request.fields.includes("industry")) { data.industry = o.industry; confidence.industry = 0.85; }
          if (o.estimated_num_employees && request.fields.includes("employee_count")) { data.employee_count = o.estimated_num_employees; confidence.employee_count = 0.8; }
        }
      }
    }

    // Organizations/enrich endpoint (for company-only fields not resolved above)
    if (needsOrg) {
      const unresolvedOrgFields = request.fields.filter((f) => !personFields.includes(f) && !(f in data));
      if (unresolvedOrgFields.length > 0) {
        const res = await enrichFetch<ApolloOrgResponse>(`${APOLLO_API}/organizations/enrich`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: apiKey, domain: request.domain }),
        });

        if (res.ok && res.data?.organization) {
          const o = res.data.organization;
          creditsUsed++;

          if (o.name && !data.company_name && request.fields.includes("company_name")) { data.company_name = o.name; confidence.company_name = 0.95; }
          if (o.short_description && request.fields.includes("company_description")) { data.company_description = o.short_description; confidence.company_description = 0.9; }
          if (o.industry && !data.industry && request.fields.includes("industry")) { data.industry = o.industry; confidence.industry = 0.85; }
          if (o.estimated_num_employees && !data.employee_count && request.fields.includes("employee_count")) { data.employee_count = o.estimated_num_employees; confidence.employee_count = 0.8; }
          if (o.annual_revenue_printed && request.fields.includes("revenue_range")) { data.revenue_range = o.annual_revenue_printed; confidence.revenue_range = 0.75; }
          if (o.technology_names && request.fields.includes("tech_stack")) { data.tech_stack = o.technology_names; confidence.tech_stack = 0.85; }
          if (o.logo_url && request.fields.includes("logo_url")) { data.logo_url = o.logo_url; confidence.logo_url = 0.95; }
          if (o.city && o.country && request.fields.includes("location")) { data.location = `${o.city}, ${o.country}`; confidence.location = 0.9; }
          if (o.founded_year && request.fields.includes("founded_year")) { data.founded_year = o.founded_year; confidence.founded_year = 0.9; }
          if (o.total_funding_printed && request.fields.includes("funding_total")) { data.funding_total = o.total_funding_printed; confidence.funding_total = 0.8; }
        }
      }
    }

    return {
      provider: "apollo",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default apolloConnector;
