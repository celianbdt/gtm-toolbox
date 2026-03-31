import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Datagma — Full contact enrichment
 *
 * Endpoint:
 *   GET https://gateway.datagma.net/api/ingress/v2/full
 *
 * Real request structure:
 *   Query params:
 *     apiId=<API_KEY>
 *     data=linkedin.com/in/johndoe  (or domain)
 *     properties=full_name,email,phone,job_title,seniority
 */
const datagmaConnector: EnricherConnector = {
  provider: "datagma",
  supportedFields: [
    "email",
    "phone",
    "linkedin_url",
    "title",
    "seniority",
    "first_name",
    "last_name",
  ],
  estimatedCostPerCall: 0.02,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[datagma] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!datagmaConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `team@${request.domain}`;
          confidence.email = 0.87;
          break;
        case "phone":
          data.phone = "+1-555-0200";
          confidence.phone = 0.68;
          break;
        case "linkedin_url":
          data.linkedin_url = `https://linkedin.com/in/${request.domain.replace(/\.\w+$/, "")}-ceo`;
          confidence.linkedin_url = 0.78;
          break;
        case "title":
          data.title = "CEO & Co-founder";
          confidence.title = 0.88;
          break;
        case "seniority":
          data.seniority = "C-level";
          confidence.seniority = 0.88;
          break;
        case "first_name":
          data.first_name = request.name?.split(" ")[0] ?? "Alex";
          confidence.first_name = 0.9;
          break;
        case "last_name":
          data.last_name = request.name?.split(" ").slice(1).join(" ") ?? "Martin";
          confidence.last_name = 0.9;
          break;
      }
    }

    return {
      provider: "datagma",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default datagmaConnector;
