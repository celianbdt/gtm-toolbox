import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const BRANDFETCH_API = "https://api.brandfetch.io/v2/brands";

type BrandfetchResponse = {
  name?: string;
  description?: string;
  logos?: Array<{
    type?: string;
    formats?: Array<{ src?: string; format?: string }>;
  }>;
  links?: Array<{ name?: string; url?: string }>;
  colors?: Array<{ hex?: string; type?: string }>;
};

const brandfetchConnector: EnricherConnector = {
  provider: "brandfetch",
  supportedFields: ["logo_url", "company_name", "company_description"],
  estimatedCostPerCall: 0,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const url = `${BRANDFETCH_API}/${encodeURIComponent(request.domain)}`;
    const res = await enrichFetch<BrandfetchResponse>(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (res.ok && res.data) {
      const b = res.data;
      creditsUsed++;

      if (b.name && request.fields.includes("company_name")) {
        data.company_name = b.name;
        confidence.company_name = 0.92;
      }
      if (b.description && request.fields.includes("company_description")) {
        data.company_description = b.description;
        confidence.company_description = 0.8;
      }
      if (b.logos && b.logos.length > 0 && request.fields.includes("logo_url")) {
        // Prefer "logo" type, fall back to first available
        const logoEntry =
          b.logos.find((l) => l.type === "logo") ?? b.logos[0];
        const logoSrc = logoEntry?.formats?.[0]?.src;
        if (logoSrc) {
          data.logo_url = logoSrc;
          confidence.logo_url = 0.95;
        }
      }
    }

    return {
      provider: "brandfetch",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default brandfetchConnector;
