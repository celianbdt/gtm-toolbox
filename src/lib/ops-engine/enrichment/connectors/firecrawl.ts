import type { EnricherConnector, EnrichmentRequest, EnrichmentResult } from "../types";
import { enrichFetch } from "../http";

const FIRECRAWL_API = "https://api.firecrawl.dev/v1/scrape";

type FirecrawlResponse = {
  success?: boolean;
  data?: {
    markdown?: string;
    metadata?: {
      title?: string;
      description?: string;
      ogDescription?: string;
    };
  };
};

const firecrawlConnector: EnricherConnector = {
  provider: "firecrawl",
  supportedFields: ["company_description", "website_description"],
  estimatedCostPerCall: 0.001,

  async enrich(
    request: EnrichmentRequest,
    apiKey: string
  ): Promise<EnrichmentResult> {
    const data: EnrichmentResult["data"] = {};
    const confidence: EnrichmentResult["confidence"] = {};
    let creditsUsed = 0;

    const res = await enrichFetch<FirecrawlResponse>(FIRECRAWL_API, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        url: `https://${request.domain}`,
        formats: ["markdown"],
        onlyMainContent: true,
        waitFor: 3000,
      }),
    });

    if (res.ok && res.data?.success && res.data.data) {
      const page = res.data.data;
      creditsUsed++;

      const description =
        page.metadata?.description ??
        page.metadata?.ogDescription ??
        page.metadata?.title;

      if (description && request.fields.includes("company_description")) {
        data.company_description = description;
        confidence.company_description = 0.8;
      }
      if (request.fields.includes("website_description")) {
        // Use markdown excerpt as website description (first 500 chars)
        const websiteDesc =
          description ??
          page.markdown?.slice(0, 500);
        if (websiteDesc) {
          data.website_description = websiteDesc;
          confidence.website_description = 0.85;
        }
      }
    }

    return {
      provider: "firecrawl",
      success: Object.keys(data).length > 0,
      data,
      confidence,
      raw_response: { domain: request.domain, credits_used: creditsUsed },
      credits_used: creditsUsed,
    };
  },
};

export default firecrawlConnector;
