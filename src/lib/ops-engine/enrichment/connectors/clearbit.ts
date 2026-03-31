import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Clearbit — Company enrichment
 *
 * Endpoint:
 *   GET https://company.clearbit.com/v2/companies/find?domain=acme.com
 *
 * Real request structure:
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 *   Query params: domain
 *   Response: {
 *     name, description, category.industry, metrics.employees,
 *     metrics.estimatedAnnualRevenue, tech, logo, geo.city,
 *     foundedYear, metrics.raised, ...
 *   }
 */
const clearbitConnector: EnricherConnector = {
  provider: "clearbit",
  supportedFields: [
    "company_name",
    "company_description",
    "industry",
    "employee_count",
    "revenue_range",
    "tech_stack",
    "logo_url",
    "location",
    "founded_year",
    "funding_total",
  ],
  estimatedCostPerCall: 0.02,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[clearbit] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    const domainName = request.domain.replace(/\.\w+$/, "");

    for (const field of request.fields) {
      if (!clearbitConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "company_name":
          data.company_name = domainName.replace(/^./, (c) => c.toUpperCase());
          confidence.company_name = 0.97;
          break;
        case "company_description":
          data.company_description = `${domainName} is a technology company focused on innovative solutions.`;
          confidence.company_description = 0.85;
          break;
        case "industry":
          data.industry = "Technology";
          confidence.industry = 0.88;
          break;
        case "employee_count":
          data.employee_count = 250;
          confidence.employee_count = 0.8;
          break;
        case "revenue_range":
          data.revenue_range = "$10M-$50M";
          confidence.revenue_range = 0.65;
          break;
        case "tech_stack":
          data.tech_stack = ["React", "Node.js", "AWS", "Segment", "HubSpot"];
          confidence.tech_stack = 0.75;
          break;
        case "logo_url":
          data.logo_url = `https://logo.clearbit.com/${request.domain}`;
          confidence.logo_url = 0.99;
          break;
        case "location":
          data.location = "San Francisco, CA, United States";
          confidence.location = 0.9;
          break;
        case "founded_year":
          data.founded_year = 2018;
          confidence.founded_year = 0.85;
          break;
        case "funding_total":
          data.funding_total = "$25M";
          confidence.funding_total = 0.7;
          break;
      }
    }

    return {
      provider: "clearbit",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default clearbitConnector;
