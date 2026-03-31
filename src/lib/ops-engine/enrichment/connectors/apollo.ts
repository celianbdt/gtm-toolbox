import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Apollo.io — People + Company API
 *
 * Endpoints:
 *   POST https://api.apollo.io/api/v1/people/match
 *   POST https://api.apollo.io/api/v1/organizations/enrich
 *
 * Real request structure (people/match):
 *   {
 *     "api_key": "<API_KEY>",
 *     "first_name": "John",
 *     "last_name": "Doe",
 *     "organization_name": "Acme Inc",
 *     "domain": "acme.com",
 *     "email": "john@acme.com"
 *   }
 *
 * Real request structure (organizations/enrich):
 *   {
 *     "api_key": "<API_KEY>",
 *     "domain": "acme.com"
 *   }
 */
const apolloConnector: EnricherConnector = {
  provider: "apollo",
  supportedFields: [
    "email",
    "phone",
    "linkedin_url",
    "title",
    "seniority",
    "first_name",
    "last_name",
    "company_name",
    "industry",
    "employee_count",
  ],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[apollo] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    // Stub: return realistic mock data
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};

    for (const field of request.fields) {
      if (!apolloConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "email":
          data.email = `contact@${request.domain}`;
          confidence.email = 0.85;
          break;
        case "phone":
          data.phone = "+1-555-0100";
          confidence.phone = 0.7;
          break;
        case "linkedin_url":
          data.linkedin_url = `https://linkedin.com/in/${request.domain.replace(/\.\w+$/, "")}`;
          confidence.linkedin_url = 0.8;
          break;
        case "title":
          data.title = "VP of Sales";
          confidence.title = 0.9;
          break;
        case "seniority":
          data.seniority = "VP";
          confidence.seniority = 0.9;
          break;
        case "first_name":
          data.first_name = request.name?.split(" ")[0] ?? "John";
          confidence.first_name = 0.95;
          break;
        case "last_name":
          data.last_name = request.name?.split(" ").slice(1).join(" ") ?? "Doe";
          confidence.last_name = 0.95;
          break;
        case "company_name":
          data.company_name = request.domain.replace(/\.\w+$/, "").replace(/^./, (c) => c.toUpperCase());
          confidence.company_name = 0.95;
          break;
        case "industry":
          data.industry = "Software";
          confidence.industry = 0.8;
          break;
        case "employee_count":
          data.employee_count = 150;
          confidence.employee_count = 0.75;
          break;
      }
    }

    return {
      provider: "apollo",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default apolloConnector;
