import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const PROXYCURL_API = "https://nubela.co/proxycurl/api/linkedin/company";

type ProxycurlCompanyResponse = {
  name?: string;
  description?: string;
  industry?: string;
  company_size?: number[];
  company_size_on_linkedin?: number;
  hq_city?: string;
  hq_country?: string;
  founded_year?: number;
  specialities?: string[];
  website?: string;
  linkedin_internal_id?: string;
  similar_companies?: Array<{ name?: string; link?: string }>;
};

const proxycurlConnector: EnricherConnector = {
  provider: "proxycurl",
  supportedFields: [
    "company_name",
    "company_description",
    "industry",
    "employee_count",
    "location",
    "founded_year",
    "social_profiles",
    "website_description",
  ],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    // Proxycurl needs a LinkedIn URL; fall back to constructing one from domain
    const linkedinUrl =
      request.linkedin_url ??
      `https://www.linkedin.com/company/${request.domain.replace(/\.\w+$/, "")}`;

    const url = `${PROXYCURL_API}?url=${encodeURIComponent(linkedinUrl)}&resolve_numeric_id=true&categories=include`;
    const res = await enrichFetch<ProxycurlCompanyResponse>(url, {
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
        confidence.company_description = 0.85;
      }
      if (c.industry && request.fields.includes("industry")) {
        data.industry = c.industry;
        confidence.industry = 0.86;
      }
      if (request.fields.includes("employee_count")) {
        const count = c.company_size_on_linkedin ?? c.company_size?.[1];
        if (count) {
          data.employee_count = count;
          confidence.employee_count = 0.75;
        }
      }
      if (c.hq_city && request.fields.includes("location")) {
        data.location = c.hq_country
          ? `${c.hq_city}, ${c.hq_country}`
          : c.hq_city;
        confidence.location = 0.88;
      }
      if (c.founded_year && request.fields.includes("founded_year")) {
        data.founded_year = c.founded_year;
        confidence.founded_year = 0.85;
      }
      if (c.similar_companies && request.fields.includes("social_profiles")) {
        // Return the LinkedIn URL itself as a social profile
        data.social_profiles = [linkedinUrl];
        if (c.website) data.social_profiles.push(c.website);
        confidence.social_profiles = 0.8;
      }
      if (c.specialities && c.specialities.length > 0 && request.fields.includes("website_description")) {
        data.website_description = c.specialities.join(", ");
        confidence.website_description = 0.7;
      }
    }

    return {
      provider: "proxycurl",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default proxycurlConnector;
