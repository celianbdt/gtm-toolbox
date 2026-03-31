import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Hunter.io — Email finder + verifier
 *
 * Endpoints:
 *   GET https://api.hunter.io/v2/domain-search?domain=acme.com&api_key=<KEY>
 *   GET https://api.hunter.io/v2/email-finder?domain=acme.com&first_name=John&last_name=Doe&api_key=<KEY>
 *
 * Real request structure:
 *   Query params: domain, first_name, last_name, api_key
 *   Response: { data: { email, first_name, last_name, score, position, ... } }
 */
const hunterConnector: EnricherConnector = {
  provider: "hunter",
  supportedFields: ["email", "first_name", "last_name"],
  estimatedCostPerCall: 0.005,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[hunter] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!hunterConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `hello@${request.domain}`;
          confidence.email = 0.91;
          break;
        case "first_name":
          data.first_name = request.name?.split(" ")[0] ?? "Sarah";
          confidence.first_name = 0.94;
          break;
        case "last_name":
          data.last_name = request.name?.split(" ").slice(1).join(" ") ?? "Connor";
          confidence.last_name = 0.94;
          break;
      }
    }

    return {
      provider: "hunter",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default hunterConnector;
