import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const SERPER_API = "https://google.serper.dev/search";

type SerperResponse = {
  organic?: Array<{
    title?: string;
    link?: string;
    snippet?: string;
  }>;
  knowledgeGraph?: {
    title?: string;
    description?: string;
    type?: string;
    attributes?: Record<string, string>;
  };
};

const serperConnector: EnricherConnector = {
  provider: "serper",
  supportedFields: ["company_description", "funding_total", "social_profiles"],
  estimatedCostPerCall: 0.001,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const query = `${request.domain} company`;
    const res = await enrichFetch<SerperResponse>(SERPER_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": apiKey,
      },
      body: JSON.stringify({ q: query, num: 10 }),
    });

    if (res.ok && res.data) {
      const s = res.data;
      creditsUsed++;

      // Extract from knowledge graph first (higher confidence)
      if (s.knowledgeGraph) {
        const kg = s.knowledgeGraph;
        if (kg.description && request.fields.includes("company_description")) {
          data.company_description = kg.description;
          confidence.company_description = 0.7;
        }
        if (kg.attributes?.["Funding"] && request.fields.includes("funding_total")) {
          data.funding_total = kg.attributes["Funding"];
          confidence.funding_total = 0.65;
        }
      }

      // Fall back to organic results for description
      if (!data.company_description && s.organic?.[0]?.snippet && request.fields.includes("company_description")) {
        data.company_description = s.organic[0].snippet;
        confidence.company_description = 0.55;
      }

      // Extract social profiles from organic results
      if (request.fields.includes("social_profiles") && s.organic) {
        const socialLinks: string[] = [];
        for (const result of s.organic) {
          if (!result.link) continue;
          if (
            result.link.includes("linkedin.com/company") ||
            result.link.includes("twitter.com/") ||
            result.link.includes("x.com/") ||
            result.link.includes("github.com/") ||
            result.link.includes("crunchbase.com/")
          ) {
            socialLinks.push(result.link);
          }
        }
        if (socialLinks.length > 0) {
          data.social_profiles = socialLinks;
          confidence.social_profiles = 0.6;
        }
      }

      // Search specifically for funding if not found in KG
      if (!data.funding_total && request.fields.includes("funding_total") && s.organic) {
        for (const result of s.organic) {
          const text = `${result.title ?? ""} ${result.snippet ?? ""}`;
          const fundingMatch = text.match(/\$[\d,.]+[MBK]?\s*(?:Series\s+[A-Z]|funding|raised|round)/i);
          if (fundingMatch) {
            data.funding_total = fundingMatch[0].trim();
            confidence.funding_total = 0.5;
            break;
          }
        }
      }
    }

    return {
      provider: "serper",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default serperConnector;
