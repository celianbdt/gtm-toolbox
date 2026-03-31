import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Firecrawl — Website scraping & content extraction
 *
 * Endpoint:
 *   POST https://api.firecrawl.dev/v1/scrape
 *
 * Real request structure:
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 *   Body: {
 *     "url": "https://acme.com",
 *     "formats": ["markdown"],
 *     "onlyMainContent": true,
 *     "waitFor": 3000
 *   }
 *   Response: { success: true, data: { markdown, metadata: { title, description, ... } } }
 */
const firecrawlConnector: EnricherConnector = {
  provider: "firecrawl",
  supportedFields: ["company_description", "website_description"],
  estimatedCostPerCall: 0.001,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[firecrawl] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    const domainName = request.domain.replace(/\.\w+$/, "");

    for (const field of request.fields) {
      if (!firecrawlConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "company_description":
          data.company_description = `${domainName} helps teams collaborate and ship faster with AI-powered workflows.`;
          confidence.company_description = 0.8;
          break;
        case "website_description":
          data.website_description = `${domainName}.com — The modern platform for GTM teams. Features include pipeline management, enrichment, and automated outreach.`;
          confidence.website_description = 0.85;
          break;
      }
    }

    return {
      provider: "firecrawl",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default firecrawlConnector;
