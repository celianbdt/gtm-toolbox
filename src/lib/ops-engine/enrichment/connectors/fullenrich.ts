import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * FullEnrich — Multi-source waterfall enrichment
 *
 * Endpoint:
 *   POST https://api.fullenrich.com/v1/enrich
 *
 * Real request structure:
 *   {
 *     "linkedin_url": "https://linkedin.com/in/johndoe",
 *     "email": "john@acme.com",
 *     "domain": "acme.com"
 *   }
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 */
const fullenrichConnector: EnricherConnector = {
  provider: "fullenrich",
  supportedFields: ["email", "phone", "linkedin_url"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[fullenrich] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!fullenrichConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `hello@${request.domain}`;
          confidence.email = 0.92;
          break;
        case "phone":
          data.phone = "+33-1-55-00-00-00";
          confidence.phone = 0.75;
          break;
        case "linkedin_url":
          data.linkedin_url = `https://linkedin.com/company/${request.domain.replace(/\.\w+$/, "")}`;
          confidence.linkedin_url = 0.85;
          break;
      }
    }

    return {
      provider: "fullenrich",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default fullenrichConnector;
