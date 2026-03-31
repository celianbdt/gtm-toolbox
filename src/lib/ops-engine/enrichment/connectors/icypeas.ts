import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Icypeas — Email finder
 *
 * Endpoint:
 *   POST https://app.icypeas.com/api/email-search
 *
 * Real request structure:
 *   {
 *     "firstname": "John",
 *     "lastname": "Doe",
 *     "domainOrCompany": "acme.com"
 *   }
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 */
const icypeasConnector: EnricherConnector = {
  provider: "icypeas",
  supportedFields: ["email", "first_name", "last_name"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[icypeas] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!icypeasConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `info@${request.domain}`;
          confidence.email = 0.88;
          break;
        case "first_name":
          data.first_name = request.name?.split(" ")[0] ?? "Jane";
          confidence.first_name = 0.92;
          break;
        case "last_name":
          data.last_name = request.name?.split(" ").slice(1).join(" ") ?? "Smith";
          confidence.last_name = 0.92;
          break;
      }
    }

    return {
      provider: "icypeas",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default icypeasConnector;
