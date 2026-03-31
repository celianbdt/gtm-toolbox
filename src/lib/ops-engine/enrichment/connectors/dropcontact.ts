import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Dropcontact — Email enrichment (strong on European contacts)
 *
 * Endpoint:
 *   POST https://api.dropcontact.io/batch
 *
 * Real request structure:
 *   {
 *     "data": [
 *       {
 *         "first_name": "John",
 *         "last_name": "Doe",
 *         "company": "Acme",
 *         "website": "acme.com"
 *       }
 *     ],
 *     "siren": true,
 *     "language": "en"
 *   }
 *   Headers: { "X-Access-Token": "<API_KEY>" }
 */
const dropcontactConnector: EnricherConnector = {
  provider: "dropcontact",
  supportedFields: ["email", "phone", "first_name", "last_name", "company_name"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[dropcontact] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!dropcontactConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `contact@${request.domain}`;
          confidence.email = 0.9;
          break;
        case "phone":
          data.phone = "+33-1-42-00-00-00";
          confidence.phone = 0.72;
          break;
        case "first_name":
          data.first_name = request.name?.split(" ")[0] ?? "Pierre";
          confidence.first_name = 0.93;
          break;
        case "last_name":
          data.last_name = request.name?.split(" ").slice(1).join(" ") ?? "Dupont";
          confidence.last_name = 0.93;
          break;
        case "company_name":
          data.company_name = request.domain.replace(/\.\w+$/, "").replace(/^./, (c) => c.toUpperCase());
          confidence.company_name = 0.95;
          break;
      }
    }

    return {
      provider: "dropcontact",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default dropcontactConnector;
