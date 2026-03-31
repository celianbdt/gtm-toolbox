import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";

/**
 * Proxycurl — LinkedIn company profile scraping
 *
 * Endpoint:
 *   GET https://nubela.co/proxycurl/api/linkedin/company
 *
 * Real request structure:
 *   Headers: { "Authorization": "Bearer <API_KEY>" }
 *   Query params:
 *     url=https://www.linkedin.com/company/acme
 *     resolve_numeric_id=true
 *     categories=include
 *   Response: {
 *     name, description, industry, company_size, hq_city,
 *     founded_on, similar_companies, ...
 *   }
 */
const proxycurlConnector: EnricherConnector = {
  provider: "proxycurl",
  supportedFields: [
    "company_name",
    "company_description",
    "industry",
    "employee_count",
    "location",
    "founded_year",
    "social_profiles",
    "website_description",
  ],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    _apiKey: string
  ): Promise<EnrichmentResult> {
    console.log(
      `[proxycurl] Enriching ${request.domain} for fields: ${request.fields.join(", ")}`
    );

    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    const domainName = request.domain.replace(/\.\w+$/, "");

    for (const field of request.fields) {
      if (!proxycurlConnector.supportedFields.includes(field)) continue;

      switch (field) {
        case "company_name":
          data.company_name = domainName.replace(/^./, (c) => c.toUpperCase());
          confidence.company_name = 0.95;
          break;
        case "company_description":
          data.company_description = `${domainName} provides cutting-edge B2B solutions.`;
          confidence.company_description = 0.82;
          break;
        case "industry":
          data.industry = "Information Technology & Services";
          confidence.industry = 0.86;
          break;
        case "employee_count":
          data.employee_count = 200;
          confidence.employee_count = 0.78;
          break;
        case "location":
          data.location = "Paris, Île-de-France, France";
          confidence.location = 0.88;
          break;
        case "founded_year":
          data.founded_year = 2019;
          confidence.founded_year = 0.82;
          break;
        case "social_profiles":
          data.social_profiles = [
            `https://twitter.com/${domainName}`,
            `https://linkedin.com/company/${domainName}`,
          ];
          confidence.social_profiles = 0.8;
          break;
        case "website_description":
          data.website_description = `Official website of ${domainName} — SaaS platform for modern teams.`;
          confidence.website_description = 0.75;
          break;
      }
    }

    return {
      provider: "proxycurl",
      success: true,
      data,
      confidence,
      raw_response: { _stub: true, domain: request.domain },
      credits_used: 1,
    };
  },
};

export default proxycurlConnector;
