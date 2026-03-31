import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Wappalyzer — Tech stack detection (lighter alternative to BuiltWith)
 *
 * Endpoint:
 *   GET https://api.wappalyzer.com/v2/lookup/?urls=https://acme.com
 *
 * Real request structure:
 *   Headers: { "x-api-key": "<API_KEY>" }
 *   Query params: urls (comma-separated)
 *   Response: [{ technologies: [{ name, categories, versions, ... }] }]
 */
const wappalyzerConnector: EnricherConnector = {
  provider: "wappalyzer",
  supportedFields: ["tech_stack"],
  estimatedCostPerCall: 0,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[wappalyzer] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    if (request.fields.includes("tech_stack")) {
      data.tech_stack = [
        "Next.js",
        "Vercel",
        "Google Tag Manager",
        "Mixpanel",
        "Zendesk",
      ];
      confidence.tech_stack = 0.85;
    }

    return {
      provider: "wappalyzer",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 0,
    };
  },
};

export default wappalyzerConnector;
