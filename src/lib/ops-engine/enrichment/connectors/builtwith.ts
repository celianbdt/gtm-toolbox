import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const BUILTWITH_API = "https://api.builtwith.com/free1/api.json";

type BuiltWithResponse = {
  groups?: Array<{
    name?: string;
    categories?: Array<{
      name?: string;
      live?: Array<{ Name?: string; Description?: string; Link?: string }>;
    }>;
  }>;
};

const builtwithConnector: EnricherConnector = {
  provider: "builtwith",
  supportedFields: ["tech_stack"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    if (!request.fields.includes("tech_stack")) {
      return {
        provider: "builtwith",
        success: false,
        data: {},
        confidence: {},
        raw_response: { domain: request.domain, credits_used: 0 },
        credits_used: 0,
      };
    }

    const url = `${BUILTWITH_API}?KEY=${encodeURIComponent(apiKey)}&LOOKUP=${encodeURIComponent(request.domain)}`;
    const res = await enrichFetch<BuiltWithResponse>(url, {
      method: "GET",
      headers: {},
    });

    if (res.ok && res.data?.groups) {
      creditsUsed++;
      const techNames: string[] = [];

      for (const group of res.data.groups) {
        for (const category of group.categories ?? []) {
          for (const tech of category.live ?? []) {
            if (tech.Name) techNames.push(tech.Name);
          }
        }
      }

      if (techNames.length > 0) {
        data.tech_stack = techNames;
        confidence.tech_stack = 0.9;
      }
    }

    return {
      provider: "builtwith",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default builtwithConnector;
