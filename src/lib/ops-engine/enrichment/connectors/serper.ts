import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Serper — Google Search API
 *
 * Endpoint:
 *   POST https://google.serper.dev/search
 *
 * Real request structure:
 *   Headers: { "X-API-KEY": "<API_KEY>", "Content-Type": "application/json" }
 *   Body: {
 *     "q": "acme.com company funding",
 *     "num": 10
 *   }
 *   Response: { organic: [{ title, link, snippet }], knowledgeGraph: { ... } }
 */
const serperConnector: EnricherConnector = {
  provider: "serper",
  supportedFields: ["company_description", "funding_total", "social_profiles"],
  estimatedCostPerCall: 0.001,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[serper] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    const domainName = request.domain.replace(/\.\w+$/, "");

    for (const field of request.fields) {
      if (!serperConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "company_description":
          data.company_description = `${domainName} is a fast-growing startup in the B2B SaaS space, founded by industry veterans.`;
          confidence.company_description = 0.6;
          break;
        case "funding_total":
          data.funding_total = "$15M Series A";
          confidence.funding_total = 0.55;
          break;
        case "social_profiles":
          data.social_profiles = [
            `https://twitter.com/${domainName}`,
            `https://linkedin.com/company/${domainName}`,
            `https://github.com/${domainName}`,
          ];
          confidence.social_profiles = 0.65;
          break;
      }
    }

    return {
      provider: "serper",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default serperConnector;
