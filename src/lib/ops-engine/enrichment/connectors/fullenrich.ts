import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const FULLENRICH_API = "https://api.fullenrich.com/v1/enrich";

type FullenrichResponse = {
  email?: string;
  phone?: string;
  linkedin_url?: string;
  company?: {
    name?: string;
    domain?: string;
    industry?: string;
  };
  status?: string;
};

const fullenrichConnector: EnricherConnector = {
  provider: "fullenrich",
  supportedFields: ["email", "phone", "linkedin_url", "company_name", "industry"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const body: Record<string, string> = { domain: request.domain };
    if (request.linkedin_url) body.linkedin_url = request.linkedin_url;
    if (request.email) body.email = request.email;

    const res = await enrichFetch<FullenrichResponse>(FULLENRICH_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (res.ok && res.data) {
      const r = res.data;
      creditsUsed++;

      if (r.email && request.fields.includes("email")) {
        data.email = r.email;
        confidence.email = 0.92;
      }
      if (r.phone && request.fields.includes("phone")) {
        data.phone = r.phone;
        confidence.phone = 0.78;
      }
      if (r.linkedin_url && request.fields.includes("linkedin_url")) {
        data.linkedin_url = r.linkedin_url;
        confidence.linkedin_url = 0.9;
      }
      if (r.company?.name && request.fields.includes("company_name")) {
        data.company_name = r.company.name;
        confidence.company_name = 0.9;
      }
      if (r.company?.industry && request.fields.includes("industry")) {
        data.industry = r.company.industry;
        confidence.industry = 0.8;
      }
    }

    return {
      provider: "fullenrich",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default fullenrichConnector;
