import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Enrow — Contact enrichment
 *
 * TODO: No API documentation available yet.
 * This is a shell connector — implement real API calls once docs are available.
 *
 * Expected fields: email, phone, linkedin_url, first_name, last_name
 */
const enrowConnector: EnricherConnector = {
  provider: "enrow",
  supportedFields: ["email", "phone", "linkedin_url", "first_name", "last_name"],
  estimatedCostPerCall: 0.01,

  async enrich(
    _request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    // TODO: Implement real API calls when Enrow API docs become available
    return {
      provider: "enrow",
      success: false,
      data: {},
      confidence: {},
      raw_response: { _not_implemented: true },
      credits_used: 0,
    };
  },
};

export default enrowConnector;
