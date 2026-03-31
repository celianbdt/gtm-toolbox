import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * BuiltWith — Tech stack detection
 *
 * Endpoint:
 *   GET https://api.builtwith.com/free1/api.json?KEY=<API_KEY>&LOOKUP=acme.com
 *
 * Real request structure:
 *   Query params: KEY, LOOKUP (domain)
 *   Response: {
 *     groups: [{ categories: [{ live: [{ Name, Description, Link }] }] }]
 *   }
 */
const builtwithConnector: EnricherConnector = {
  provider: "builtwith",
  supportedFields: ["tech_stack"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[builtwith] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    if (request.fields.includes("tech_stack")) {
      data.tech_stack = [
        "WordPress",
        "Google Analytics",
        "Cloudflare",
        "HubSpot",
        "Intercom",
        "Stripe",
        "Segment",
      ];
      confidence.tech_stack = 0.9;
    }

    return {
      provider: "builtwith",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default builtwithConnector;
