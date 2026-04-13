import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const MAGILEAD_API = "https://app.api-magileads.net";

type MagileadContact = {
  email?: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  phone?: string;
};

type MagileadContactListResponse = {
  data?: MagileadContact[];
  total?: number;
};

type MagileadListsResponse = {
  data?: Array<{
    id?: string | number;
    name?: string;
    count?: number;
  }>;
};

const magileadConnector: EnricherConnector = {
  provider: "magilead",
  supportedFields: ["email", "first_name", "last_name", "company_name", "phone"],
  estimatedCostPerCall: 0.01,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const headers = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    // Step 1: List contact lists to find one that might contain domain contacts
    const listsRes = await enrichFetch<MagileadListsResponse>(
      `${MAGILEAD_API}/contact-lists`,
      { method: "GET", headers }
    );

    if (!listsRes.ok || !listsRes.data?.data?.length) {
      return {
        provider: "magilead",
        success: false,
        data: {},
        confidence: {},
        raw_response: { domain: request.domain, error: listsRes.error ?? "No contact lists found" },
        credits_used: 0,
      };
    }

    // Step 2: Search through lists for contacts matching the domain
    for (const list of listsRes.data.data) {
      if (!list.id) continue;

      const contactsRes = await enrichFetch<MagileadContactListResponse>(
        `${MAGILEAD_API}/contact-lists/${list.id}/contacts`,
        { method: "GET", headers }
      );

      if (!contactsRes.ok || !contactsRes.data?.data) continue;
      creditsUsed++;

      // Find contact matching domain or name
      const match = contactsRes.data.data.find((c) => {
        if (c.email?.includes(request.domain)) return true;
        if (c.company_name?.toLowerCase().includes(request.domain.replace(/\.\w+$/, "").toLowerCase())) return true;
        if (request.name && c.first_name && c.last_name) {
          const fullName = `${c.first_name} ${c.last_name}`.toLowerCase();
          return fullName === request.name.toLowerCase();
        }
        return false;
      });

      if (match) {
        if (match.email && request.fields.includes("email")) {
          data.email = match.email;
          confidence.email = 0.85;
        }
        if (match.first_name && request.fields.includes("first_name")) {
          data.first_name = match.first_name;
          confidence.first_name = 0.9;
        }
        if (match.last_name && request.fields.includes("last_name")) {
          data.last_name = match.last_name;
          confidence.last_name = 0.9;
        }
        if (match.company_name && request.fields.includes("company_name")) {
          data.company_name = match.company_name;
          confidence.company_name = 0.85;
        }
        if (match.phone && request.fields.includes("phone")) {
          data.phone = match.phone;
          confidence.phone = 0.8;
        }
        break; // Found a match, stop searching
      }
    }

    return {
      provider: "magilead",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default magileadConnector;
