import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const DROPCONTACT_API = "https://api.dropcontact.io/batch";

type DropcontactResponse = {
  request_id?: string;
  error?: boolean;
  data?: Array<{
    email?: Array<{ email?: string; type?: string }>;
    phone?: string;
    first_name?: string;
    last_name?: string;
    full_name?: string;
    company?: string;
    linkedin?: string;
  }>;
};

const dropcontactConnector: EnricherConnector = {
  provider: "dropcontact",
  supportedFields: ["email", "phone", "first_name", "last_name", "company_name", "linkedin_url"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const contactData: Record<string, string> = {
      website: request.domain,
    };
    if (request.name) {
      const parts = request.name.split(" ");
      contactData.first_name = parts[0];
      if (parts.length > 1) contactData.last_name = parts.slice(1).join(" ");
    }
    if (request.email) contactData.email = request.email;

    const res = await enrichFetch<DropcontactResponse>(DROPCONTACT_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Access-Token": apiKey,
      },
      body: JSON.stringify({
        data: [contactData],
        siren: false,
        language: "en",
      }),
    });

    if (res.ok && res.data?.data?.[0]) {
      const contact = res.data.data[0];
      creditsUsed++;

      if (contact.email?.[0]?.email && request.fields.includes("email")) {
        data.email = contact.email[0].email;
        confidence.email = 0.9;
      }
      if (contact.phone && request.fields.includes("phone")) {
        data.phone = contact.phone;
        confidence.phone = 0.75;
      }
      if (contact.first_name && request.fields.includes("first_name")) {
        data.first_name = contact.first_name;
        confidence.first_name = 0.93;
      }
      if (contact.last_name && request.fields.includes("last_name")) {
        data.last_name = contact.last_name;
        confidence.last_name = 0.93;
      }
      if (contact.company && request.fields.includes("company_name")) {
        data.company_name = contact.company;
        confidence.company_name = 0.9;
      }
      if (contact.linkedin && request.fields.includes("linkedin_url")) {
        data.linkedin_url = contact.linkedin;
        confidence.linkedin_url = 0.85;
      }
    }

    return {
      provider: "dropcontact",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default dropcontactConnector;
