import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const HUNTER_API = "https://api.hunter.io/v2";

type HunterEmailFinderResponse = {
  data?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    score?: number;
    position?: string;
    linkedin_url?: string;
    phone_number?: string;
  };
};

type HunterDomainSearchResponse = {
  data?: {
    organization?: string;
    industry?: string;
    emails?: { value: string; first_name: string; last_name: string; position: string }[];
  };
};

const hunterConnector: EnricherConnector = {
  provider: "hunter",
  supportedFields: ["email", "first_name", "last_name", "title", "phone", "linkedin_url", "company_name", "industry"],
  estimatedCostPerCall: 0.005,

  async enrich(request: EnrichmentRequest, apiKey: string): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    if (request.name && request.fields.includes("email")) {
      const parts = request.name.split(" ");
      const url = `${HUNTER_API}/email-finder?domain=${request.domain}&first_name=${encodeURIComponent(parts[0])}&last_name=${encodeURIComponent(parts.slice(1).join(" "))}&api_key=${apiKey}`;
      const res = await enrichFetch<HunterEmailFinderResponse>(url, { method: "GET" });

      if (res.ok && res.data?.data) {
        const d = res.data.data;
        creditsUsed++;
        if (d.email) { data.email = d.email; confidence.email = (d.score ?? 80) / 100; }
        if (d.first_name && request.fields.includes("first_name")) { data.first_name = d.first_name; confidence.first_name = 0.95; }
        if (d.last_name && request.fields.includes("last_name")) { data.last_name = d.last_name; confidence.last_name = 0.95; }
        if (d.position && request.fields.includes("title")) { data.title = d.position; confidence.title = 0.85; }
        if (d.linkedin_url && request.fields.includes("linkedin_url")) { data.linkedin_url = d.linkedin_url; confidence.linkedin_url = 0.9; }
        if (d.phone_number && request.fields.includes("phone")) { data.phone = d.phone_number; confidence.phone = 0.75; }
      }
    }

    if (request.fields.some((f) => ["company_name", "industry"].includes(f)) && !data.company_name) {
      const url = `${HUNTER_API}/domain-search?domain=${request.domain}&api_key=${apiKey}&limit=1`;
      const res = await enrichFetch<HunterDomainSearchResponse>(url, { method: "GET" });
      if (res.ok && res.data?.data) {
        creditsUsed++;
        const d = res.data.data;
        if (d.organization && request.fields.includes("company_name")) { data.company_name = d.organization; confidence.company_name = 0.9; }
        if (d.industry && request.fields.includes("industry")) { data.industry = d.industry; confidence.industry = 0.8; }
      }
    }

    return {
      provider: "hunter",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain },
      credits_used: creditsUsed,
    };
  },
};

export default hunterConnector;
