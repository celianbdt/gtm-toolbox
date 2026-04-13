import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const DATAGMA_API = "https://gateway.datagma.net/api/ingress/v2/full";

type DatagmaResponse = {
  data?: {
    full_name?: string;
    first_name?: string;
    last_name?: string;
    email?: string;
    phone?: string;
    job_title?: string;
    seniority?: string;
    linkedin_url?: string;
    company?: {
      name?: string;
      industry?: string;
      employee_count?: number;
    };
  };
};

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
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const lookupData = request.linkedin_url ?? request.domain;
    const properties = "full_name,email,phone,job_title,seniority";
    const url = `${DATAGMA_API}?apiId=${encodeURIComponent(apiKey)}&data=${encodeURIComponent(lookupData)}&properties=${encodeURIComponent(properties)}`;

    const res = await enrichFetch<DatagmaResponse>(url, {
      method: "GET",
      headers: {},
    });

    if (res.ok && res.data?.data) {
      const d = res.data.data;
      creditsUsed++;

      if (d.email && request.fields.includes("email")) {
        data.email = d.email;
        confidence.email = 0.87;
      }
      if (d.phone && request.fields.includes("phone")) {
        data.phone = d.phone;
        confidence.phone = 0.7;
      }
      if (d.linkedin_url && request.fields.includes("linkedin_url")) {
        data.linkedin_url = d.linkedin_url;
        confidence.linkedin_url = 0.85;
      }
      if (d.job_title && request.fields.includes("title")) {
        data.title = d.job_title;
        confidence.title = 0.88;
      }
      if (d.seniority && request.fields.includes("seniority")) {
        data.seniority = d.seniority;
        confidence.seniority = 0.85;
      }
      if (request.fields.includes("first_name")) {
        const firstName = d.first_name ?? d.full_name?.split(" ")[0];
        if (firstName) {
          data.first_name = firstName;
          confidence.first_name = 0.9;
        }
      }
      if (request.fields.includes("last_name")) {
        const lastName = d.last_name ?? d.full_name?.split(" ").slice(1).join(" ");
        if (lastName) {
          data.last_name = lastName;
          confidence.last_name = 0.9;
        }
      }
    }

    return {
      provider: "datagma",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default datagmaConnector;
