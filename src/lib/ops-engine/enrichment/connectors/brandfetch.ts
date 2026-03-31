import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Brandfetch — Brand info & logo
 *
 * Endpoint:
 *   GET https://api.brandfetch.io/v2/brands/:domain
 *
 * Real request structure:
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 *   URL param: domain (e.g., acme.com)
 *   Response: {
 *     name, description, logos: [{ type, formats: [{ src }] }],
 *     links, colors, fonts, ...
 *   }
 */
const brandfetchConnector: EnricherConnector = {
  provider: "brandfetch",
  supportedFields: ["logo_url", "company_name", "company_description"],
  estimatedCostPerCall: 0,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[brandfetch] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    const domainName = request.domain.replace(/\.\w+$/, "");

    for (const field of request.fields) {
      if (!brandfetchConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "logo_url":
          data.logo_url = `https://asset.brandfetch.io/id/${request.domain}/logo.png`;
          confidence.logo_url = 0.95;
          break;
        case "company_name":
          data.company_name = domainName.replace(/^./, (c) => c.toUpperCase());
          confidence.company_name = 0.92;
          break;
        case "company_description":
          data.company_description = `${domainName} — brand identity and digital presence.`;
          confidence.company_description = 0.7;
          break;
      }
    }

    return {
      provider: "brandfetch",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 0,
    };
  },
};

export default brandfetchConnector;
