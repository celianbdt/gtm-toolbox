import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const ICYPEAS_API = "https://app.icypeas.com/api/email-search";

type IcypeasResponse = {
  email?: string;
  firstName?: string;
  lastName?: string;
  status?: string;
};

const icypeasConnector: EnricherConnector = {
  provider: "icypeas",
  supportedFields: ["email", "first_name", "last_name"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const parts = request.name?.split(" ") ?? [];
    const firstname = parts[0] ?? "";
    const lastname = parts.length > 1 ? parts.slice(1).join(" ") : "";

    if (!firstname) {
      return {
        provider: "icypeas",
        success: false,
        data: {},
        confidence: {},
        raw_response: { error: "name is required for Icypeas email search" },
        credits_used: 0,
      };
    }

    const res = await enrichFetch<IcypeasResponse>(ICYPEAS_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        firstname,
        lastname,
        domainOrCompany: request.domain,
      }),
    });

    if (res.ok && res.data) {
      const r = res.data;
      creditsUsed++;

      if (r.email && request.fields.includes("email")) {
        data.email = r.email;
        confidence.email = 0.88;
      }
      if (r.firstName && request.fields.includes("first_name")) {
        data.first_name = r.firstName;
        confidence.first_name = 0.92;
      }
      if (r.lastName && request.fields.includes("last_name")) {
        data.last_name = r.lastName;
        confidence.last_name = 0.92;
      }
    }

    return {
      provider: "icypeas",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default icypeasConnector;
