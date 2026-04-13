import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const WAPPALYZER_API = "https://api.wappalyzer.com/v2/lookup/";

type WappalyzerResponse = Array<{
  url?: string;
  technologies?: Array<{
    name?: string;
    categories?: Array<{ name?: string }>;
    versions?: string[];
  }>;
}>;

const wappalyzerConnector: EnricherConnector = {
  provider: "wappalyzer",
  supportedFields: ["tech_stack"],
  estimatedCostPerCall: 0,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    if (!request.fields.includes("tech_stack")) {
      return {
        provider: "wappalyzer",
        success: false,
        data: {},
        confidence: {},
        raw_response: { domain: request.domain, credits_used: 0 },
        credits_used: 0,
      };
    }

    const url = `${WAPPALYZER_API}?urls=https://${encodeURIComponent(request.domain)}`;
    const res = await enrichFetch<WappalyzerResponse>(url, {
      method: "GET",
      headers: { "x-api-key": apiKey },
    });

    if (res.ok && res.data && res.data.length > 0) {
      creditsUsed++;
      const techs = res.data[0].technologies ?? [];
      const techNames = techs
        .map((t) => t.name)
        .filter((n): n is string => !!n);

      if (techNames.length > 0) {
        data.tech_stack = techNames;
        confidence.tech_stack = 0.85;
      }
    }

    return {
      provider: "wappalyzer",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default wappalyzerConnector;
